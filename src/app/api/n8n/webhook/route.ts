import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

interface N8nWebhookPayload {
  type: 'shopping-list' | 'expense' | 'contact' | 'hotel-expense' | 'diary' | 'calendar' | 'email' | 'chat' | 'firecrawl' | 'voice_message' | 'file_upload' | 'expense_ocr';
  action?: 'create' | 'update' | 'delete' | 'message' | 'scrape' | 'crawl' | 'search' | 'voice' | 'upload' | 'extract_data';
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
    console.log('🔗 N8n webhook called, URL configured:', !!N8N_WEBHOOK_URL);
    
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
      console.log('⚠️ N8n webhook URL not configured, skipping n8n call');
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
      console.error('❌ Invalid N8N_WEBHOOK_URL format:', N8N_WEBHOOK_URL);
      return NextResponse.json({
        success: true,
        message: 'N8n webhook URL invalid - webhook call skipped',
        data: { response: 'N8n webhook URL format is invalid. Please check N8N_WEBHOOK_URL environment variable.' }
      });
    }
    
    const body: N8nWebhookPayload = await request.json();
    console.log('📨 Webhook payload received:', {
      type: body.type,
      action: body.action,
      hasData: !!body.data,
      dataKeys: body.data ? Object.keys(body.data) : [],
      imageSize: body.data?.image ? body.data.image.length : 0
    });
    
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
    
    // Special validation for expense OCR
    if (body.type === 'expense_ocr') {
      if (!body.data?.image && !body.data?.imageBase64) {
        return NextResponse.json(
          { success: false, message: 'Image data is required for expense OCR' },
          { status: 400 }
        );
      }
      
      // Log OCR-specific details
      console.log('🖼️ Expense OCR request:', {
        fileName: body.data?.fileName,
        mimeType: body.data?.mimeType,
        fileSize: body.data?.fileSize,
        hasImage: !!(body.data?.image || body.data?.imageBase64),
        imageLength: (body.data?.image || body.data?.imageBase64)?.length
      });
    }
    
    // For other types, require action and data
    if (!['voice_message', 'file_upload', 'expense_ocr'].includes(body.type)) {
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
    console.log('📤 Sending payload to N8n...');
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mahboob-Personal-Assistant/1.0'
      },
      body: JSON.stringify(enrichedPayload),
    });
    
    console.log('📡 N8n response status:', n8nResponse.status);
    
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => 'Unknown error');
      console.error('❌ N8n webhook failed:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: errorText.slice(0, 500)
      });
      throw new Error(`N8n webhook failed (${n8nResponse.status}): ${errorText.slice(0, 200)}`);
    }
    
    const n8nResult = await n8nResponse.json().catch((parseError) => {
      console.error('❌ Failed to parse N8n response as JSON:', parseError);
      return { error: 'Invalid JSON response from N8n' };
    });
    
    console.log('✅ N8n workflow response:', {
      success: !!n8nResult,
      hasData: !!n8nResult?.data,
      keys: n8nResult ? Object.keys(n8nResult) : []
    });
    
    // Extract response text from n8n result with OCR-specific handling
    let responseText = null;
    if (n8nResult) {
      // For expense OCR, look for extracted data in various formats
      if (body.type === 'expense_ocr') {
        // N8n might return extracted data in different structures
        responseText = n8nResult.extractedData || 
                      n8nResult.ocrResult ||
                      n8nResult.data ||
                      n8nResult.response || 
                      n8nResult.message || 
                      n8nResult.text || 
                      n8nResult.output ||
                      (typeof n8nResult === 'string' ? n8nResult : null);
        
        console.log('🔍 OCR response extraction:', {
          hasExtractedData: !!n8nResult.extractedData,
          hasOcrResult: !!n8nResult.ocrResult,
          hasData: !!n8nResult.data,
          responseKeys: Object.keys(n8nResult)
        });
      } else {
        // Standard response extraction for other types
        responseText = n8nResult.response || 
                      n8nResult.message || 
                      n8nResult.text || 
                      n8nResult.output ||
                      (typeof n8nResult === 'string' ? n8nResult : null);
      }
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

