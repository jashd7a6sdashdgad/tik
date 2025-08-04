import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

// Types for message processing
interface VoiceMessageRequest {
  type: 'voice_message';
  action: 'send';
  audioBase64: string;
  fileName: string;
  mimeType: string;
  duration: number;
  timestamp: string;
  size: number;
}

interface TextMessageRequest {
  type: 'text_message';
  action: 'send';
  content: string;
  timestamp: string;
}

interface TranscriptionResponse {
  text: string;
  confidence?: number;
  language?: string;
}

interface AIResponse {
  response: string;
  audioBase64?: string;
  audioUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Voice message API called');
    
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    console.log(`🔐 User authenticated: ${user.id}`);
    
    const body: VoiceMessageRequest | TextMessageRequest = await request.json();
    
    // Handle different message types
    if (body.type === 'text_message') {
      // Validate text message fields
      if (!body.content) {
        return NextResponse.json(
          { success: false, message: 'Missing required field: content' },
          { status: 400 }
        );
      }
      
      console.log(`📝 Processing text message: "${body.content}"`);
      
      // Send to N8N for processing
      const n8nResponse = await sendToN8N({
        ...body,
        userId: user.id,
        userName: (user as any).name || 'User'
      });
      
      if (!n8nResponse.success) {
        return NextResponse.json(
          {
            success: false,
            message: (n8nResponse as any).message || (n8nResponse as any).error || 'N8N processing failed',
            error: 'SERVICE_NOT_CONFIGURED'
          },
          { status: 503 }
        );
      }
      
      console.log('✅ Text message processed successfully');
      
      return NextResponse.json({
        success: true,
        data: {
          aiResponse: (n8nResponse as any).aiResponse,
          processingTime: (n8nResponse as any).processingTime
        },
        message: 'Text message processed successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Validate voice message fields
      if (!body.audioBase64 || !body.fileName || !body.mimeType) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: audioBase64, fileName, mimeType' },
          { status: 400 }
        );
      }
      
      console.log(`📁 Processing voice message: ${body.fileName} (${body.size} bytes, ${body.duration}s)`);
      
      // Send to N8N for processing (transcription + AI response)
      const n8nResponse = await sendToN8N({
        ...body,
        userId: user.id,
        userName: (user as any).name || 'User'
      });
      
      if (!n8nResponse.success) {
        return NextResponse.json(
          {
            success: false,
            message: (n8nResponse as any).message || (n8nResponse as any).error || 'N8N processing failed',
            error: 'SERVICE_NOT_CONFIGURED'
          },
          { status: 503 }
        );
      }
      
      console.log('✅ Voice message processed successfully');
      
      return NextResponse.json({
        success: true,
        data: {
          transcription: (n8nResponse as any).transcription,
          aiResponse: (n8nResponse as any).aiResponse,
          audioResponse: (n8nResponse as any).audioResponse,
          processingTime: (n8nResponse as any).processingTime
        },
        message: 'Voice message processed successfully',
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    console.error('❌ Voice message processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process voice message',
        error: 'VOICE_MESSAGE_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Send voice message to N8N for transcription and AI processing
 */
async function sendToN8N(payload: any) {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.VOICE_DEV_MODE === 'true';
  
  if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('your-n8n-webhook-url')) {
    console.warn('⚠️ N8N webhook not configured');
    if (DEV_MODE) {
      console.log('🔧 Development mode: using basic response');
      return createBasicResponse(payload);
    }
    return createServiceNotConfiguredResponse();
  }
  
  try {
    console.log('📡 Sending to N8N webhook...');
    const startTime = Date.now();
    
    // Structure data exactly as N8N workflow expects
    const n8nPayload = {
      type: payload.type || 'voice_message',
      action: 'process',
      data: payload, // Send the full payload as data
      timestamp: new Date().toISOString()
    };
    
    console.log('📦 N8N payload structure:', {
      type: n8nPayload.type,
      hasAudioBase64: !!n8nPayload.data.audioBase64,
      fileName: n8nPayload.data.fileName,
      audioSize: n8nPayload.data.audioBase64?.length || 0
    });

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });
    
    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ N8N processing completed in ${processingTime}ms`);
    
    // Check if response is binary audio file
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('audio/') || contentType.includes('application/octet-stream'))) {
      console.log('🎵 Received binary audio response from N8N');
      
      // Convert binary response to base64
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      
      return {
        success: true,
        transcription: 'Audio transcription completed',
        aiResponse: 'AI response provided as audio',
        audioResponse: audioBase64,
        mimeType: contentType,
        processingTime
      };
    } else {
      // Handle JSON response (text or structured data)
      const result = await response.json();
      
      return {
        success: true,
        transcription: result.transcription || result.text || 'Transcription not available',
        aiResponse: result.aiResponse || result.response || 'AI response not available',
        audioResponse: result.audioResponse || result.audioBase64,
        processingTime
      };
    }
    
  } catch (error: any) {
    console.error('❌ N8N webhook error:', error);
    
    // Use basic response in development mode if N8N fails
    if (DEV_MODE) {
      console.log('🔧 N8N failed, falling back to basic response');
      return createBasicResponse(payload);
    }
    
    // Return error if N8N fails in production
    console.log('❌ N8N webhook failed, no fallback available');
    return createServiceNotConfiguredResponse();
  }
}

/**
 * Create basic response for development/testing - DISABLED
 */
function createBasicResponse(payload: any) {
  // Basic responses disabled - always require proper N8N service
  return createServiceNotConfiguredResponse();
}

/**
 * Create error response when services are not configured
 */
function createServiceNotConfiguredResponse() {
  return {
    success: false,
    error: 'Voice processing service not configured. Please configure N8N webhook URL.',
    message: 'Unable to process voice messages - external service required'
  };
}

/**
 * Convert base64 to Buffer for processing
 */
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Convert Buffer back to base64
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Validate audio file format
 */
function validateAudioFormat(mimeType: string): boolean {
  const supportedFormats = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg'
  ];
  
  return supportedFormats.some(format => mimeType.includes(format));
}

/**
 * Get file extension from mime type
 */
function getFileExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  return 'webm'; // default
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Voice Messages API is running',
    endpoints: {
      POST: '/api/voice-messages - Process voice message',
      supportedFormats: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3'],
      maxFileSize: '10MB',
      maxDuration: '5 minutes'
    },
    timestamp: new Date().toISOString()
  });
}