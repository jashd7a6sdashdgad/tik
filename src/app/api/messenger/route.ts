import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { ENV_VARS } from '@/lib/env-validation';

// Use validated environment variables
const MESSENGER_PAGE_ACCESS_TOKEN = ENV_VARS.MESSENGER_PAGE_ACCESS_TOKEN || ENV_VARS.FACEBOOK_PAGE_ACCESS_TOKEN;
const MESSENGER_PAGE_ID = ENV_VARS.MESSENGER_PAGE_ID || ENV_VARS.FACEBOOK_PAGE_ID;
const MESSENGER_API_URL = 'https://graph.facebook.com/v18.0';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!MESSENGER_PAGE_ACCESS_TOKEN || !MESSENGER_PAGE_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Messenger credentials not configured. Please set MESSENGER_PAGE_ACCESS_TOKEN and MESSENGER_PAGE_ID in your environment variables.',
        error: 'MESSENGER_CONFIG_ERROR'
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'conversations';
    const limit = searchParams.get('limit') || '25';

    try {
      let data;
      
      switch (action) {
        case 'conversations':
          data = await getConversations(limit);
          break;
        case 'messages':
          const conversationId = searchParams.get('conversation_id');
          if (!conversationId) {
            return NextResponse.json({ 
              success: false, 
              message: 'Conversation ID is required for messages' 
            }, { status: 400 });
          }
          data = await getMessages(conversationId, limit);
          break;
        case 'profile':
          data = await getPageInfo();
          break;
        case 'connect':
          // Test connection by getting page info
          data = await getPageInfo();
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action. Available: conversations, messages, profile, connect' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: `Messenger ${action} retrieved successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Messenger API error:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to fetch Messenger data',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Messenger route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: error.message?.includes('Invalid token') ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    if (!MESSENGER_PAGE_ACCESS_TOKEN || !MESSENGER_PAGE_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Messenger credentials not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    try {
      let data;
      
      switch (action) {
        case 'send_message':
          if (!params.recipient_id || !params.message) {
            return NextResponse.json({ 
              success: false, 
              message: 'Recipient ID and message are required' 
            }, { status: 400 });
          }
          data = await sendMessage(params.recipient_id, params.message);
          break;
        case 'mark_read':
          if (!params.conversation_id) {
            return NextResponse.json({ 
              success: false, 
              message: 'Conversation ID is required' 
            }, { status: 400 });
          }
          data = await markAsRead(params.conversation_id);
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action. Available: send_message, mark_read' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data,
        message: `Messenger ${action} completed successfully`,
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Messenger POST error:', error);
      return NextResponse.json({
        success: false,
        message: error.message || 'Failed to perform Messenger action',
        userId: user.id,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Messenger POST route error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: error.message?.includes('Invalid token') ? 401 : 500 });
  }
}

// Helper functions for Messenger API calls
async function getConversations(limit: string) {
  const response = await fetch(
    `${MESSENGER_API_URL}/${MESSENGER_PAGE_ID}/conversations?fields=id,name,snippet,message_count,unread_count,updated_time&limit=${limit}&access_token=${MESSENGER_PAGE_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

async function getMessages(conversationId: string, limit: string) {
  const response = await fetch(
    `${MESSENGER_API_URL}/${conversationId}/messages?fields=id,message,from,created_time&limit=${limit}&access_token=${MESSENGER_PAGE_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

async function getPageInfo() {
  const response = await fetch(
    `${MESSENGER_API_URL}/${MESSENGER_PAGE_ID}?fields=id,name,about,follower_count,fan_count&access_token=${MESSENGER_PAGE_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

async function sendMessage(recipientId: string, message: string) {
  const response = await fetch(
    `${MESSENGER_API_URL}/${MESSENGER_PAGE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: MESSENGER_PAGE_ACCESS_TOKEN
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

async function markAsRead(conversationId: string) {
  const response = await fetch(
    `${MESSENGER_API_URL}/${conversationId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        read: true,
        access_token: MESSENGER_PAGE_ACCESS_TOKEN
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Messenger API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}