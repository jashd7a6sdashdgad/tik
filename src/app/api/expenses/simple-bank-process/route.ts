import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { getGoogleSheetsClient, Gmail, getAuthenticatedClient } from '@/lib/google';

// Omani bank email addresses
const OMANI_BANKS = [
  'noreply@bankdhofar.com',
  'alerts@bankmuscat.com',
  'noreply@bankmuscat.com',
  'alerts@ahlibank.om',
  'noreply@ahlibank.om',
  'banking@ahlibank.om',
];

interface BankTransaction {
  date: string;
  merchant: string;
  amount: number;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    // Get Google authentication
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Google authentication required' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting real bank email processing...');
    
    const results = {
      processed: 0,
      duplicates: 0,
      errors: [] as string[]
    };

    try {
      // Initialize authenticated client
      const auth = getAuthenticatedClient({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      // Initialize Gmail API with authenticated client
      const gmail = new Gmail(auth);

      // Search for bank emails
      const bankQueries = OMANI_BANKS.map(email => `from:${email}`).join(' OR ');
      const query = `(${bankQueries})`;
      console.log(`📧 Searching for emails with query: ${query}`);
      
      const messages = await gmail.listMessages(query, 10);
      console.log(`✅ Found ${messages.length} bank emails`);

      if (messages.length === 0) {
        return NextResponse.json({
          success: true,
          data: results,
          message: 'No bank emails found to process'
        });
      }

      // Get existing expenses to check for duplicates
      const sheets = await getGoogleSheetsClient({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const SPREADSHEET_ID = process.env.EXPENSES_SPREADSHEET_ID || '1T7hKST5hJTkjxByCK5qBE1YZ6rBUkIoHAzP2BzPqmAE';
      
      // Get existing expenses
      let existingExpenses: any[][] = [];
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Expenses!A:E',
        });
        existingExpenses = response.data.values || [];
      } catch (error) {
        console.log('⚠️ Could not get existing expenses, proceeding without duplicate check');
      }

      // Process each email
      for (const message of messages.slice(0, 5)) { // Limit to 5 for testing
        try {
          const emailData = await gmail.getMessage(message.id);
          const transaction = parseEmailForTransaction(emailData);
          
          if (!transaction) {
            results.errors.push(`Failed to parse email ${message.id}`);
            continue;
          }

          // Check for duplicates (simple check by description)
          const isDuplicate = existingExpenses.some(row => 
            row[3] && row[3].includes(transaction.merchant)
          );

          if (isDuplicate) {
            console.log(`⚠️ Duplicate found: ${transaction.merchant}`);
            results.duplicates++;
            continue;
          }

          // Add to sheets
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Expenses!A:H',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                'Bank Account', // From
                transaction.date, // Date
                '', // Credit Amount
                transaction.amount, // Debit Amount
                'Banking', // Category
                transaction.description, // Description
                '', // Available Balance
                '' // ID
              ]]
            }
          });

          console.log(`✅ Added: ${transaction.date} - ${transaction.merchant} - ${transaction.amount} OMR`);
          results.processed++;

        } catch (error: any) {
          const errorMsg = `Error processing email: ${error.message}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

    } catch (error: any) {
      console.error('❌ Gmail/Sheets API error:', error);
      results.errors.push(`API error: ${error.message}`);
    }
    
    const message = `Processed ${results.processed} transactions, found ${results.duplicates} duplicates`;
    console.log(`✅ ${message}`);
    
    return NextResponse.json({
      success: true,
      data: results,
      message
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process bank emails'
      },
      { status: 500 }
    );
  }
}

function parseEmailForTransaction(emailData: any): BankTransaction | null {
  try {
    const headers = emailData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const body = extractEmailBody(emailData);
    
    const fullText = subject + ' ' + body;
    
    // Extract amount (OMR)
    const amountPatterns = [
      /(?:OMR|RO)\s*(\d+(?:\.\d{3})?)/gi,
      /(\d+(?:\.\d{3}))\s*(?:OMR|RO)/gi,
      /amount[\s:]*(\d+(?:\.\d{3})?)/gi,
    ];

    let amount: number | null = null;
    for (const pattern of amountPatterns) {
      const match = pattern.exec(fullText);
      if (match) {
        amount = parseFloat(match[1]);
        if (!isNaN(amount)) break;
      }
    }

    // Extract merchant/description
    const merchantPatterns = [
      /(?:at|from|to)\s+([A-Z][A-Za-z\s&\-']+?)(?:\s+on|\s+OMR|\s+RO|$)/gi,
      /POS\s+([A-Za-z\s&\-']+?)(?:\s+on|\s+OMR|\s+RO|$)/gi,
    ];

    let merchant: string | null = null;
    for (const pattern of merchantPatterns) {
      const match = pattern.exec(fullText);
      if (match) {
        merchant = match[1].trim();
        if (merchant.length > 3) break;
      }
    }

    // Get today's date if no date found
    const today = new Date().toISOString().split('T')[0];

    if (!amount) {
      console.log('No amount found in email:', subject.substring(0, 100));
      return null;
    }

    return {
      date: today,
      merchant: merchant || 'Bank Transaction',
      amount,
      description: `${merchant || 'Bank Transaction'} - ${subject.substring(0, 100)}`
    };

  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
}

function extractEmailBody(emailData: any): string {
  let body = '';
  
  if (emailData.payload) {
    if (emailData.payload.body?.data) {
      body = Buffer.from(emailData.payload.body.data, 'base64').toString();
    } else if (emailData.payload.parts) {
      for (const part of emailData.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }
  }
  
  return body;
}