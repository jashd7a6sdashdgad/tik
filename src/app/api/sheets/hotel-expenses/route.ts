import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { SPREADSHEET_ID, getSheetConfig, SheetHelpers } from '@/lib/sheets-config';

const HOTEL_CONFIG = getSheetConfig('hotelExpenses');

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
    const hotel = searchParams.get('hotel');
    
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
      const range = HOTEL_CONFIG.range;
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
          message: 'No hotel expenses found',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Skip header row
      const dataRows = rows.slice(1);
      let expenses = dataRows.map((row, index) => ({
        id: (index + 1).toString(),
        date: row[0] || '',
        hotelName: row[1] || '',
        roomType: row[2] || '',
        nights: parseInt(row[3]) || 1,
        amount: parseFloat(row[4]) || 0,
        city: row[5] || '',
        notes: row[6] || '',
        receipt: row[7] || ''
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

      if (hotel) {
        expenses = expenses.filter(expense =>
          expense.hotelName.toLowerCase().includes(hotel.toLowerCase())
        );
      }

      // Calculate analytics
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const cityTotals = expenses.reduce((acc, expense) => {
        acc[expense.city] = (acc[expense.city] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        success: true,
        data: {
          expenses,
          analytics: {
            total,
            count: expenses.length,
            cityTotals,
            averageExpense: expenses.length > 0 ? total / expenses.length : 0,
            totalNights: expenses.reduce((sum, expense) => sum + expense.nights, 0)
          }
        },
        message: 'Hotel expenses retrieved successfully',
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
    console.error('Hotel expenses fetch error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch hotel expenses'
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
    const { hotelName, roomType, nights, amount, city, notes = '', receipt = '' } = body;
    
    if (!hotelName || !amount || !city || !nights) {
      return NextResponse.json({
        success: false,
        message: 'Hotel name, amount, city, and nights are required'
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
        ranges: [`${HOTEL_CONFIG.name}!A1`]
      });
    } catch (error) {
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: HOTEL_CONFIG.name
              }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${HOTEL_CONFIG.name}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HOTEL_CONFIG.columns]
        }
      });
    }

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: HOTEL_CONFIG.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.hotelExpenses.formatRow({ hotelName, roomType, nights, amount, city, notes, receipt })]
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          spreadsheetId: SPREADSHEET_ID,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows
        },
        message: 'Hotel expense added successfully',
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
    console.error('Hotel expense add error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to add hotel expense'
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
    const { id, hotelName, roomType, nights, amount, city, notes = '', receipt = '' } = body;
    
    if (!id || !hotelName || !amount || !city || !nights) {
      return NextResponse.json({
        success: false,
        message: 'ID, hotel name, amount, city, and nights are required'
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
      const currentRange = `${HOTEL_CONFIG.name}!A${rowIndex}:H${rowIndex}`;
      const currentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
      });
      
      const originalDate = currentResponse.data.values?.[0]?.[0] || new Date().toISOString().split('T')[0];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.hotelExpenses.formatRow({ date: originalDate, hotelName, roomType, nights, amount, city, notes, receipt })]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Hotel expense updated successfully',
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
    console.error('Hotel expense update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update hotel expense'
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
        message: 'Hotel expense ID is required'
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
      
      const hotelSheet = spreadsheet.data.sheets?.find(
        sheet => sheet.properties?.title === HOTEL_CONFIG.name
      );
      
      if (hotelSheet?.properties?.sheetId !== undefined && hotelSheet.properties.sheetId !== null) {
        sheetId = hotelSheet.properties.sheetId;
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
      range: `${HOTEL_CONFIG.name}!A:H`
    });

    const rows = response.data.values || [];
    
    // Check if the ID corresponds to a valid row (skipping header)
    if (rowIndex < 1 || rowIndex >= rows.length) {
      return NextResponse.json({
        success: false,
        message: 'Hotel expense not found'
      }, { status: 404 });
    }

    const rowToDelete = rowIndex; // This is the 0-based index for the actual data row

    try {
      // Delete the row (Google Sheets API uses 0-based indexing for rows)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowToDelete,
                endIndex: rowToDelete + 1
              }
            }
          }]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Hotel expense deleted successfully',
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
    console.error('Hotel expense delete error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete hotel expense'
    }, { status: 500 });
  }
}
