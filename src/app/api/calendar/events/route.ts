import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient, GoogleCalendar } from '@/lib/google';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { parseNaturalLanguageDate, parseNaturalLanguageTime } from '@/lib/utils';

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
    const calendar = new GoogleCalendar(auth);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    
    // List events
    const events = await calendar.listEvents(timeMin || undefined, timeMax || undefined, maxResults);
    
    return NextResponse.json({
      success: true,
      data: events,
      message: 'Events retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('Calendar events GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve events'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
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
    const auth = getGoogleAuth(request);
    const calendar = new GoogleCalendar(auth);
    
    const body = await request.json();
    
    // Handle natural language input
    if (body.naturalLanguage) {
      const event = parseNaturalLanguageEvent(body.naturalLanguage);
      if (!event) {
        return NextResponse.json(
          { success: false, message: 'Could not parse the event from natural language' },
          { status: 400 }
        );
      }
      body.event = event;
    }
    
    // Create event
    const event = await calendar.createEvent(body.event);
    
    return NextResponse.json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
    
  } catch (error: any) {
    console.error('Calendar events POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create event'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

// Helper function to parse natural language into calendar event
function parseNaturalLanguageEvent(input: string): any | null {
  try {
    const lowerInput = input.toLowerCase();
    
    // Extract title (everything before time/date indicators)
    const timeIndicators = ['at', 'on', 'next', 'tomorrow', 'today', 'this'];
    let title = input;
    for (const indicator of timeIndicators) {
      const index = lowerInput.indexOf(indicator);
      if (index > 0) {
        title = input.substring(0, index).trim();
        break;
      }
    }
    
    // Parse date
    const date = parseNaturalLanguageDate(input);
    if (!date) {
      return null;
    }
    
    // Parse time
    const time = parseNaturalLanguageTime(input);
    const startTime = new Date(date);
    
    if (time) {
      startTime.setHours(time.hour, time.minute, 0, 0);
    } else {
      // Default to current time if no time specified
      const now = new Date();
      startTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }
    
    // Default 1 hour duration
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    
    return {
      summary: title,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      description: `Created from natural language: "${input}"`
    };
  } catch (error) {
    console.error('Error parsing natural language event:', error);
    return null;
  }
}