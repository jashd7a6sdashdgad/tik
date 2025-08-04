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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    
    // List messages
    const messages = await gmail.listMessages(query, maxResults);
    
    // Get detailed message information for each message
    const detailedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        try {
          const detail = await gmail.getMessage(msg.id);
          return {
            id: detail.id,
            threadId: detail.threadId,
            snippet: detail.snippet,
            payload: {
              headers: detail.payload?.headers?.filter((h: any) => 
                ['From', 'To', 'Subject', 'Date'].includes(h.name)
              )
            }
          };
        } catch (error) {
          console.error(`Failed to get message ${msg.id}:`, error);
          return {
            id: msg.id,
            error: 'Failed to load message details'
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      data: detailedMessages,
      message: 'Messages retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('Gmail messages GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve messages'
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
    const gmail = new Gmail(auth);
    
    const body = await request.json();
    const { to, subject, message, html } = body;
    
    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, message: 'To, subject, and message are required' },
        { status: 400 }
      );
    }
    
    // Send email
    const result = await gmail.sendMessage(to, subject, message, html);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Email sent successfully'
    });
    
  } catch (error: any) {
    console.error('Gmail send error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to send email'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Message ID is required' },
        { status: 400 }
      );
    }
    
    // Delete message
    await gmail.deleteMessage(id);
    
    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Gmail delete error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete message'
      },
      { status: error.message?.includes('authentication') ? 401 : 500 }
    );
  }
}