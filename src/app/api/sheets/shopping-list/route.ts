import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { SPREADSHEET_ID, getSheetConfig, SheetHelpers } from '@/lib/sheets-config';

const SHOPPING_LIST_CONFIG = getSheetConfig('shoppingList');

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const purchased = searchParams.get('purchased');
    
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
      const range = SHOPPING_LIST_CONFIG.range;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No shopping list items found',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Skip header row and convert to structured data
      const dataRows = rows.slice(1);
      let items = dataRows.map((row, index) => ({
        id: (index + 1).toString(),
        name: row[0] || '',
        quantity: parseInt(row[1]) || 1,
        price: parseFloat(row[2]) || 0,
        category: row[3] || 'General',
        purchased: row[4] === 'TRUE',
        date: row[5] || ''
      }));

      // Apply filters
      if (category) {
        items = items.filter(item => 
          item.category.toLowerCase().includes(category.toLowerCase())
        );
      }

      if (purchased !== null) {
        const isPurchased = purchased === 'true';
        items = items.filter(item => item.purchased === isPurchased);
      }

      return NextResponse.json({
        success: true,
        data: items,
        message: 'Shopping list retrieved successfully',
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
    console.error('Shopping list fetch error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch shopping list'
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
    const { name, quantity = 1, price = 0, category = 'General' } = body;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Item name is required'
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
        ranges: [`${SHOPPING_LIST_CONFIG.name}!A1`]
      });
    } catch (error) {
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: SHOPPING_LIST_CONFIG.name
              }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHOPPING_LIST_CONFIG.name}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SHOPPING_LIST_CONFIG.columns]
        }
      });
    }

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHOPPING_LIST_CONFIG.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.shoppingList.formatRow({ name, quantity, price, category, purchased: false })]
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          spreadsheetId: SPREADSHEET_ID,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows
        },
        message: 'Item added to shopping list successfully',
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
    console.error('Shopping list add error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to add item to shopping list'
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
    const { id, name, quantity, price, category, purchased } = body;
    
    if (!id || !name) {
      return NextResponse.json({
        success: false,
        message: 'ID and name are required'
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
        range: `${SHOPPING_LIST_CONFIG.name}!A${rowIndex}:F${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.shoppingList.formatRow({ name, quantity, price, category, purchased })]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Shopping list item updated successfully',
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
    console.error('Shopping list update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update shopping list item'
    }, { status: 500 });
  }
}