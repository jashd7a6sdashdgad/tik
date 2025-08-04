import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

interface N8nWebhookPayload {
  type: 'shopping-list' | 'expense' | 'contact' | 'hotel-expense' | 'diary' | 'calendar' | 'email' | 'chat' | 'firecrawl' | 'voice_message' | 'file_upload';
  action?: 'create' | 'update' | 'delete' | 'message' | 'scrape' | 'crawl' | 'search' | 'voice' | 'upload';
  data?: any;
  audio?: string; // base64 encoded audio
  file?: string; // base64 encoded file
  mimeType?: string;
  size?: number;
  fileName?: string;
  userId?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('N8n webhook called, URL:', N8N_WEBHOOK_URL);
    
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'your-n8n-webhook-url' || N8N_WEBHOOK_URL.includes('your-n8n')) {
      console.log('N8n webhook URL not configured, skipping n8n call');
      return NextResponse.json({
        success: true,
        message: 'N8n webhook URL not configured - webhook call skipped',
        data: { response: 'N8n webhook not configured. Please set N8N_WEBHOOK_URL environment variable.' }
      });
    }

    // Validate URL format
    try {
      new URL(N8N_WEBHOOK_URL);
    } catch (error) {
      console.error('Invalid N8N_WEBHOOK_URL format:', N8N_WEBHOOK_URL);
      return NextResponse.json({
        success: true,
        message: 'N8n webhook URL invalid - webhook call skipped',
        data: { response: 'N8n webhook URL format is invalid. Please check N8N_WEBHOOK_URL environment variable.' }
      });
    }
    
    const body: N8nWebhookPayload = await request.json();
    
    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { success: false, message: 'Type is required' },
        { status: 400 }
      );
    }
    
    // Special validation for voice messages and file uploads
    if (body.type === 'voice_message' && !body.audio) {
      return NextResponse.json(
        { success: false, message: 'Audio data is required for voice messages' },
        { status: 400 }
      );
    }
    
    if (body.type === 'file_upload' && !body.file) {
      return NextResponse.json(
        { success: false, message: 'File data is required for file uploads' },
        { status: 400 }
      );
    }
    
    // For other types, require action and data
    if (body.type !== 'voice_message' && body.type !== 'file_upload') {
      if (!body.action || !body.data) {
        return NextResponse.json(
          { success: false, message: 'Action and data are required' },
          { status: 400 }
        );
      }
    }
    
    // Enrich payload with user info and timestamp
    const enrichedPayload: N8nWebhookPayload = {
      ...body,
      userId: user.id,
      timestamp: new Date().toISOString()
    };
    
    // Send to N8n webhook
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedPayload),
    });
    
    if (!n8nResponse.ok) {
      throw new Error(`N8n webhook failed with status: ${n8nResponse.status}`);
    }
    
    const n8nResult = await n8nResponse.json().catch(() => ({}));
    console.log('N8n workflow response:', n8nResult);
    
    // Extract response text from n8n result
    let responseText = null;
    if (n8nResult) {
      // Try different possible response formats from n8n
      responseText = n8nResult.response || 
                    n8nResult.message || 
                    n8nResult.text || 
                    n8nResult.output ||
                    (typeof n8nResult === 'string' ? n8nResult : null);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...n8nResult,
        response: responseText
      },
      message: responseText || 'Data sent to N8n successfully'
    });
    
  } catch (error: any) {
    console.error('N8n webhook error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to send data to N8n'
      },
      { status: 500 }
    );
  }
}

