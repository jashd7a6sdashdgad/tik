import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { SPREADSHEET_ID, getSheetConfig, SheetHelpers } from '@/lib/sheets-config';

const BUDGET_CONFIG = getSheetConfig('budget');

interface BudgetItem {
  id?: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  month: string;
  year: number;
  description?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
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
      const range = BUDGET_CONFIG.range;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            budgets: [],
            summary: {
              totalBudget: 0,
              totalSpent: 0,
              remaining: 0,
              categories: 0
            }
          },
          message: 'No budget data found',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Skip header row
      const dataRows = rows.slice(1);
      const budgets: BudgetItem[] = dataRows.map((row, index) => ({
        id: (index + 1).toString(),
        category: row[0] || '',
        budgetAmount: parseFloat(row[1]) || 0,
        spentAmount: parseFloat(row[2]) || 0,
        month: row[3] || '',
        year: parseInt(row[4]) || new Date().getFullYear(),
        description: row[5] || ''
      }));

      // Filter by month and year if provided
      let filteredBudgets = budgets;
      if (month || year) {
        filteredBudgets = budgets.filter(budget => {
          const monthMatch = !month || budget.month === month;
          const yearMatch = !year || budget.year === parseInt(year);
          return monthMatch && yearMatch;
        });
      }

      // Calculate summary
      const totalBudget = filteredBudgets.reduce((sum, item) => sum + item.budgetAmount, 0);
      const totalSpent = filteredBudgets.reduce((sum, item) => sum + item.spentAmount, 0);
      const remaining = totalBudget - totalSpent;

      return NextResponse.json({
        success: true,
        data: {
          budgets: filteredBudgets,
          summary: {
            totalBudget,
            totalSpent,
            remaining,
            categories: filteredBudgets.length
          }
        },
        message: 'Budget data retrieved successfully',
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
    console.error('Budget fetch error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch budget data'
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
    const { category, budgetAmount, spentAmount = 0, month, year, description = '' } = body;
    
    if (!category || !budgetAmount || !month || !year) {
      return NextResponse.json({
        success: false,
        message: 'Category, budget amount, month, and year are required'
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
        ranges: [`${BUDGET_CONFIG.name}!A1`]
      });
    } catch (error) {
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: BUDGET_CONFIG.name
              }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BUDGET_CONFIG.name}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [BUDGET_CONFIG.columns]
        }
      });
    }

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: BUDGET_CONFIG.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.budget.formatRow({ category, budgetAmount, spentAmount, month, year, description })]
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          spreadsheetId: SPREADSHEET_ID,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows
        },
        message: 'Budget item added successfully',
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
    console.error('Budget add error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to add budget item'
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
    const { id, category, budgetAmount, spentAmount, month, year, description = '' } = body;
    
    if (!id || !category || !budgetAmount || !month || !year) {
      return NextResponse.json({
        success: false,
        message: 'ID, category, budget amount, month, and year are required'
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
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${BUDGET_CONFIG.name}!A${rowIndex}:F${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.budget.formatRow({ category, budgetAmount, spentAmount, month, year, description })]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Budget item updated successfully',
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
    console.error('Budget update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update budget item'
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
        message: 'Budget item ID is required'
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
    
    // Get sheet info to find the correct sheetId
    let sheetId = 0;
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      });
      
      const budgetSheet = spreadsheet.data.sheets?.find(
        sheet => sheet.properties?.title === BUDGET_CONFIG.name
      );
      
      if (budgetSheet?.properties?.sheetId !== undefined && budgetSheet.properties.sheetId !== null) {
        sheetId = budgetSheet.properties.sheetId;
      }
    } catch (sheetError) {
      console.error('Error getting sheet info:', sheetError);
      // Continue with default sheetId = 0
    }

    // ID is the row index (1-based after header), so calculate the actual row
    const rowIndex = parseInt(id);
    
    // First, validate that the row exists by getting current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUDGET_CONFIG.name}!A:F`
    });

    const rows = response.data.values || [];
    
    // Check if the ID corresponds to a valid row (skipping header)
    if (rowIndex < 1 || rowIndex >= rows.length) {
      return NextResponse.json({
        success: false,
        message: 'Budget item not found'
      }, { status: 404 });
    }

    // Google Sheets API uses 0-based indexing, but we need to account for header row
    // rowIndex is 1-based from our data, so for deleting we need it as is
    const actualRowToDelete = rowIndex; // Keep 1-based for deletion including header

    try {
      // Delete the row (Google Sheets API uses 0-based indexing)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: actualRowToDelete,
                endIndex: actualRowToDelete + 1
              }
            }
          }]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Budget item deleted successfully',
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
    console.error('Budget delete error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete budget item'
    }, { status: 500 });
  }
}