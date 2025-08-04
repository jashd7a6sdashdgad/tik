import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, GoogleCalendar } from '@/lib/google';
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
    const calendar = new GoogleCalendar(auth);
    
    const body = await request.json();
    const { eventId } = await params;
    
    // Update event
    const event = await calendar.updateEvent(eventId, body.event);
    
    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
    
  } catch (error: any) {
    console.error('Calendar event PUT error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update event'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
    const calendar = new GoogleCalendar(auth);
    
    const { eventId } = await params;
    
    // Delete event
    await calendar.deleteEvent(eventId);
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Calendar event DELETE error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete event'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}