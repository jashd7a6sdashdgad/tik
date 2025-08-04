import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google';
import { processBankEmails } from '@/lib/bankEmailProcessor';
import { JWT } from 'google-auth-library';

// This endpoint is designed to be called by cron jobs or serverless functions
// It requires either a cron secret or service account authentication

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 [CRON] Bank email processing request received');
    
    // Verify cron job authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    console.log('🔑 [CRON] Auth check:', {
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!cronSecret,
      authHeaderPrefix: authHeader?.substring(0, 10) + '...' || 'none'
    });
    
    if (!cronSecret) {
      console.error('❌ [CRON] No CRON_SECRET configured');
      return NextResponse.json(
        { success: false, message: 'Cron jobs not configured' },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Authentication failed');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get configuration from request body or environment
    const body = await request.json().catch(() => ({}));
    const {
      bankEmail = process.env.BANK_EMAIL || 'noreply@bank.com',
      spreadsheetId = process.env.EXPENSES_SPREADSHEET_ID,
      sheetName = process.env.EXPENSES_SHEET_NAME || 'Expenses',
      expenseLabel = process.env.EXPENSE_LABEL || 'Expense Logged',
      userTokens
    } = body;
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: 'No spreadsheet ID configured' },
        { status: 400 }
      );
    }
    
    // Use provided tokens or service account
    let tokens = userTokens;
    
    if (!tokens) {
      // For service account authentication (recommended for cron jobs)
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      console.log('🔐 [CRON] Checking service account auth:', {
        hasServiceAccountKey: !!serviceAccountKey
      });
      
      if (serviceAccountKey) {
        try {
          console.log('🔧 [CRON] Parsing service account key...');
          const serviceAccount = JSON.parse(serviceAccountKey);
          
          console.log('🔑 [CRON] Creating JWT client...');
          const jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: [
              'https://www.googleapis.com/auth/gmail.modify',
              'https://www.googleapis.com/auth/spreadsheets'
            ]
          });
          
          console.log('🔐 [CRON] Authorizing JWT client...');
          await jwtClient.authorize();
          tokens = jwtClient.credentials;
          console.log('✅ [CRON] Service account authentication successful');
        } catch (error: any) {
          console.error('❌ [CRON] Service account authentication failed:', error.message);
          return NextResponse.json(
            { success: false, message: `Service account authentication failed: ${error.message}` },
            { status: 500 }
          );
        }
      } else {
        console.error('❌ [CRON] No authentication method available');
        return NextResponse.json(
          { success: false, message: 'No authentication method available. Please configure GOOGLE_SERVICE_ACCOUNT_KEY or provide userTokens.' },
          { status: 500 }
        );
      }
    }
    
    console.log(`🤖 [CRON] Processing bank emails from ${bankEmail}...`);
    
    // Process bank emails
    const results = await processBankEmails(tokens, {
      bankEmails: [bankEmail],
      spreadsheetId,
      sheetName,
      expenseLabel
    });
    
    const message = `[CRON] Processed ${results.processed} transactions, found ${results.duplicates} duplicates`;
    console.log(`✅ ${message}`);
    
    if (results.errors.length > 0) {
      console.error('🚨 [CRON] Errors occurred:', results.errors);
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      message
    });
    
  } catch (error: any) {
    console.error('🚨 [CRON] Bank email processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process bank emails',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Bank email processing cron endpoint is healthy',
    timestamp: new Date().toISOString()
  });
}