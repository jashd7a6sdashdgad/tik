import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: 'Google tokens cleared successfully' 
    });

    // Clear all Google-related cookies
    response.cookies.delete('google_access_token');
    response.cookies.delete('google_refresh_token');
    response.cookies.delete('google_user_info');

    return response;
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to clear tokens' 
    }, { status: 500 });
  }
}