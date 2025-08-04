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
    
    // Get request body
    const body = await request.json();
    const { 
      spreadsheetId,
      sheetName = 'Expenses',
      expenseLabel = 'Expense Logged'
    } = body;
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: 'spreadsheetId is required' },
        { status: 400 }
      );
    }
    
    console.log(`🚀 Starting automated bank email processing...`);
    
    // Process bank emails
    const results = await processBankEmails(tokens, {
      spreadsheetId,
      sheetName,
      expenseLabel
    });
    
    const message = `Processed ${results.processed} transactions, found ${results.duplicates} duplicates`;
    
    return NextResponse.json({
      success: true,
      data: results,
      message
    });
    
  } catch (error: any) {
    console.error('Bank email processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process bank emails'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const sheetName = searchParams.get('sheetName') || 'Expenses';
    const expenseLabel = searchParams.get('expenseLabel') || 'Expense Logged';
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: 'spreadsheetId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Get Google authentication
    const tokens = getGoogleAuth(request);
    
    console.log(`🚀 Starting automated bank email processing...`);
    
    // Process bank emails
    const results = await processBankEmails(tokens, {
      spreadsheetId,
      sheetName,
      expenseLabel
    });
    
    const message = `Processed ${results.processed} transactions, found ${results.duplicates} duplicates`;
    
    return NextResponse.json({
      success: true,
      data: results,
      message
    });
    
  } catch (error: any) {
    console.error('Bank email processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process bank emails'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}