import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, Gmail } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

// Helper function to get Google auth from cookies
function getGoogleAuth(request: NextRequest) {
  const accessToken = request.cookies.get('google_access_token')?.value;
  const refreshToken = request.cookies.get('google_refresh_token')?.value;
  
  if (!accessToken) {
    throw new Error('Google authentication required');
  }
  
  return getAuthenticatedClient({
    access_token: accessToken,
    refresh_token: refreshToken
  });
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
    
    // Get Google authentication
    const auth = getGoogleAuth(request);
    const gmail = new Gmail(auth);
    
    // Get unread count
    const count = await gmail.getUnreadCount();
    
    return NextResponse.json({
      success: true,
      data: { count },
      message: 'Unread count retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('Gmail unread count error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve unread count'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}