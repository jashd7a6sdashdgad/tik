import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { SPREADSHEET_ID, getSheetConfig, SheetHelpers } from '@/lib/sheets-config';

const EXPENSES_CONFIG = getSheetConfig('expenses');

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    
    // Get OAuth tokens from cookies
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      throw new Error('Google authentication required');
    }

    const sheets = await getGoogleSheetsClient({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    try {
      const range = EXPENSES_CONFIG.range;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            expenses: [],
            analytics: {
              total: 0,
              count: 0,
              categoryTotals: {},
              averageExpense: 0
            }
          },
          message: 'No expenses found',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Skip header row and convert to structured data
      const dataRows = rows.slice(1);
      let expenses = dataRows.map((row, index) => ({
        id: row[7] || (index + 1).toString(),
        from: row[0] || '',
        date: row[1] || '',
        creditAmount: parseFloat(row[2]) || 0,
        debitAmount: parseFloat(row[3]) || 0,
        category: row[4] || 'General',
        description: row[5] || '',
        availableBalance: parseFloat(row[6]) || 0
      }));

      // Apply filters
      if (startDate || endDate) {
        expenses = expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          if (startDate && expenseDate < new Date(startDate)) return false;
          if (endDate && expenseDate > new Date(endDate)) return false;
          return true;
        });
      }

      if (category) {
        expenses = expenses.filter(expense =>
          expense.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Calculate analytics
      const total = expenses.reduce((sum, expense) => sum + (expense.debitAmount - expense.creditAmount), 0);
      const categoryTotals = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + (expense.debitAmount - expense.creditAmount);
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        success: true,
        data: {
          expenses,
          analytics: {
            total,
            count: expenses.length,
            categoryTotals,
            averageExpense: expenses.length > 0 ? total / expenses.length : 0
          }
        },
        message: 'Expenses retrieved successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      if (apiError.message?.includes('not been used') || apiError.message?.includes('disabled')) {
        return NextResponse.json({
          success: false,
          message: 'Google Sheets API has not been used in project 573350886841 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=573350886841 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.'
        }, { status: 500 });
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json({
      success: false,    
      message: error.message || 'Failed to fetch expenses'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    const { from, creditAmount, debitAmount, category = 'General', description, availableBalance, id } = body;
    
    if (!description || (!creditAmount && !debitAmount)) {
      return NextResponse.json({
        success: false,
        message: 'Description and either credit or debit amount are required'
      }, { status: 400 });
    }

    // Get OAuth tokens from cookies
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      throw new Error('Google authentication required');
    }

    const sheets = await getGoogleSheetsClient({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    // Check if sheet exists, if not create it
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [`${EXPENSES_CONFIG.name}!A1`]
      });
    } catch (error) {
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: EXPENSES_CONFIG.name
              }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${EXPENSES_CONFIG.name}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [EXPENSES_CONFIG.columns]
        }
      });
    }

    try {
      const rowData = SheetHelpers.expenses.formatRow({
        from,
        date: new Date().toISOString().split('T')[0],
        creditAmount,
        debitAmount,
        category,
        description,
        availableBalance,
        id
      });

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: EXPENSES_CONFIG.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData]
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          spreadsheetId: SPREADSHEET_ID,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows
        },
        message: 'Expense added successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      if (apiError.message?.includes('not been used') || apiError.message?.includes('disabled')) {
        return NextResponse.json({
          success: false,
          message: 'Google Sheets API has not been used in project 573350886841 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=573350886841 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.'
        }, { status: 500 });
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error('Expense add error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to add expense'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    const { id, from, creditAmount, debitAmount, category, description, availableBalance } = body;
    
    if (!id || !description || (!creditAmount && !debitAmount)) {
      return NextResponse.json({
        success: false,
        message: 'ID, description and either credit or debit amount are required'
      }, { status: 400 });
    }

    // Get OAuth tokens from cookies
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      throw new Error('Google authentication required');
    }

    const sheets = await getGoogleSheetsClient({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    const rowIndex = parseInt(id) + 1; // +1 for header row

    try {
      // Get current entry to preserve date
      const currentRange = `${EXPENSES_CONFIG.name}!A${rowIndex}:H${rowIndex}`;
      const currentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
      });
      
      const originalDate = currentResponse.data.values?.[0]?.[1] || new Date().toISOString().split('T')[0];

      const rowData = SheetHelpers.expenses.formatRow({
        from,
        date: originalDate,
        creditAmount,
        debitAmount,
        category,
        description,
        availableBalance,
        id
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Expense updated successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      if (apiError.message?.includes('not been used') || apiError.message?.includes('disabled')) {
        return NextResponse.json({
          success: false,
          message: 'Google Sheets API has not been used in project 573350886841 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=573350886841 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.'
        }, { status: 500 });
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error('Expense update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update expense'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Expense ID is required'
      }, { status: 400 });
    }

    // Get OAuth tokens from cookies
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      throw new Error('Google authentication required');
    }

    const sheets = await getGoogleSheetsClient({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    const rowIndex = parseInt(id) + 1; // +1 for header row

    try {
      // Delete the row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming first sheet
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Expense deleted successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      if (apiError.message?.includes('not been used') || apiError.message?.includes('disabled')) {
        return NextResponse.json({
          success: false,
          message: 'Google Sheets API has not been used in project 573350886841 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=573350886841 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.'
        }, { status: 500 });
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error('Expense delete error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete expense'
    }, { status: 500 });
  }
}