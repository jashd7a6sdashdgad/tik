import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { processBankEmails } from '@/lib/bankEmailProcessor';

// Helper function to get Google auth from cookies
function getGoogleAuth(request: NextRequest) {
  const accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;
  
  if (!accessToken) {
    throw new Error('Google authentication required');
  }
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}

// Auto-process bank emails from Bank Ahli and Bank Muscat
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
    const tokens = getGoogleAuth(request);
    console.log('🔑 Token info:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length || 0
    });
    
    // Get the expenses spreadsheet ID from environment or request
    const body = await request.json().catch(() => ({}));
    const spreadsheetId = body.spreadsheetId || process.env.EXPENSES_SPREADSHEET_ID || '1T7hKST5hJTkjxByCK5qBE1YZ6rBUkIoHAzP2BzPqmAE';
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: 'No spreadsheet ID configured. Please set EXPENSES_SPREADSHEET_ID in environment or pass in request.' },
        { status: 400 }
      );
    }
    
    console.log(`🚀 Auto-processing bank emails from Bank Ahli and Bank Muscat...`);
    
    // Process bank emails with Omani bank defaults
    const results = await processBankEmails(tokens, {
      spreadsheetId,
      sheetName: 'Expenses',
      expenseLabel: 'Expense Logged'
    });
    
    const message = `Auto-processed ${results.processed} transactions, found ${results.duplicates} duplicates`;
    console.log(`✅ ${message}`);
    
    if (results.errors.length > 0) {
      console.error('⚠️ Errors during auto-processing:', results.errors);
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      message
    });
    
  } catch (error: any) {
    console.error('❌ Auto-processing error:', error);
    
    // Handle specific authentication errors
    if (error.message?.includes('insufficient authentication scopes')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please reconnect your Google account with proper permissions',
          error: 'insufficient_scopes',
          required_action: 'Please go to Settings and reconnect your Google account'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to auto-process bank emails'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

// GET endpoint for health check and manual trigger
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Bank email auto-processing endpoint is ready',
    banks: [
      'Bank Muscat (alerts@bankmuscat.com, noreply@bankmuscat.com)',
      'Bank Ahli (alerts@ahlibank.om, noreply@ahlibank.om)',
      'Other Omani banks supported'
    ],
    usage: 'POST to this endpoint to automatically process bank emails'
  });
}