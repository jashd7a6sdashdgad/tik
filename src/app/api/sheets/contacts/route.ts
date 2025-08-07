import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { SPREADSHEET_ID, getSheetConfig, SheetHelpers } from '@/lib/sheets-config';

const CONTACTS_CONFIG = getSheetConfig('contacts');

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
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
      const range = CONTACTS_CONFIG.range;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No contacts found',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Skip header row and convert to structured data
      const dataRows = rows.slice(1);
      let contacts = dataRows.map((row, index) => ({
        id: (index + 1).toString(),
        name: row[0] || '',
        email: row[1] || '',
        phone: row[2] || '',
        company: row[3] || '',
        notes: row[4] || '',
        dateAdded: row[5] || ''
      }));

      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        contacts = contacts.filter(contact => 
          contact.name.toLowerCase().includes(searchTerm) ||
          contact.email.toLowerCase().includes(searchTerm) ||
          contact.company.toLowerCase().includes(searchTerm)
        );
      }

      return NextResponse.json({
        success: true,
        data: contacts,
        message: 'Contacts retrieved successfully',
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
    console.error('Contacts fetch error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch contacts'
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
    const { name, email = '', phone = '', company = '', notes = '' } = body;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Contact name is required'
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
        ranges: [`${CONTACTS_CONFIG.name}!A1`]
      });
    } catch (error) {
      // Sheet doesn't exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: CONTACTS_CONFIG.name
              }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONTACTS_CONFIG.name}!A1:F1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [CONTACTS_CONFIG.columns]
        }
      });
    }

    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: CONTACTS_CONFIG.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.contacts.formatRow({ name, email, phone, company, notes })]
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          spreadsheetId: SPREADSHEET_ID,
          updatedRange: response.data.updates?.updatedRange,
          updatedRows: response.data.updates?.updatedRows
        },
        message: 'Contact added successfully',
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
    console.error('Contact add error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to add contact'
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
    const { id, name, email, phone, company, notes } = body;
    
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
      // Get current date to preserve it
      const currentRange = `${CONTACTS_CONFIG.name}!A${rowIndex}:F${rowIndex}`;
      const currentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
      });
      
      const originalDate = currentResponse.data.values?.[0]?.[5] || new Date().toISOString().split('T')[0];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: currentRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SheetHelpers.contacts.formatRow({ name, email, phone, company, notes, dateAdded: originalDate })]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Contact updated successfully',
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
    console.error('Contact update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update contact'
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
        message: 'Contact ID is required'
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
      
      const contactsSheet = spreadsheet.data.sheets?.find(
        sheet => sheet.properties?.title === CONTACTS_CONFIG.name
      );
      
      if (contactsSheet?.properties?.sheetId !== undefined && contactsSheet.properties.sheetId !== null) {
        sheetId = contactsSheet.properties.sheetId;
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
      range: `${CONTACTS_CONFIG.name}!A:F`
    });

    const rows = response.data.values || [];
    
    // Check if the ID corresponds to a valid row (skipping header)
    if (rowIndex < 1 || rowIndex >= rows.length) {
      return NextResponse.json({
        success: false,
        message: 'Contact not found'
      }, { status: 404 });
    }

    const rowToDelete = rowIndex; // This is the 0-based index for the actual data row

    try {
      // Delete the row (Google Sheets API uses 0-based indexing for rows)
      // rowToDelete is the 0-based index for data rows, but we need to account for the header
      const actualRowIndex = rowToDelete; // rowIndex is already 1-based from the data, so it's correct for sheets API
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: actualRowIndex,
                endIndex: actualRowIndex + 1
              }
            }
          }]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Contact deleted successfully',
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
    console.error('Contact delete error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete contact'
    }, { status: 500 });
  }
}