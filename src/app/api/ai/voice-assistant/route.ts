import { NextRequest, NextResponse } from 'next/server';

interface VoiceMessage {
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

interface RequestBody {
  message: string;
  language: string;
  context?: VoiceMessage[];
  audioBase64?: string; // For voice input
}

interface N8NResponse {
  success: boolean;
  response: string;
  audioBase64?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Voice Assistant API called - integrating with N8N');
    const body: RequestBody = await request.json();
    const { message, language, context = [], audioBase64 } = body;
    console.log('📝 Received message:', message, 'Language:', language);

    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    // Build conversation context for N8N
    const conversationHistory = context
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    // Prepare payload for N8N webhook
    const n8nPayload = {
      message: message.trim(),
      language: language,
      conversationHistory: conversationHistory,
      audioBase64: audioBase64 || null,
      timestamp: new Date().toISOString(),
      sessionId: 'voice_assistant_' + Date.now() // Simple session tracking
    };

    console.log('🔗 Sending to N8N webhook...');
    
    // Get N8N webhook URL from environment variables
    const n8nWebhookUrl = process.env.N8N_VOICE_ASSISTANT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('❌ N8N webhook URL not configured');
      return NextResponse.json({
        success: false,
        error: 'N8N webhook not configured'
      }, { status: 500 });
    }

    try {
      // Send request to N8N webhook
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mahboob-Personal-Assistant/1.0'
        },
        body: JSON.stringify(n8nPayload),
        timeout: 30000 // 30 second timeout
      });

      if (!n8nResponse.ok) {
        throw new Error(`N8N webhook failed with status: ${n8nResponse.status}`);
      }

      const n8nData: N8NResponse = await n8nResponse.json();
      console.log('✅ N8N response received:', n8nData.success ? 'Success' : 'Failed');

      if (n8nData.success) {
        // Handle binary audio response from N8N
        let audioUrl = null;
        
        if (n8nData.audioBase64) {
          console.log('🎵 Processing binary audio response from N8N');
          
          // Create a blob URL for the audio
          try {
            // Convert base64 to blob and create URL
            const audioBlob = base64ToBlob(n8nData.audioBase64, 'audio/mpeg');
            audioUrl = URL.createObjectURL(audioBlob);
            console.log('✅ Audio blob URL created');
          } catch (audioError) {
            console.error('❌ Failed to process audio from N8N:', audioError);
          }
        }

        return NextResponse.json({
          success: true,
          response: n8nData.response,
          audioUrl: audioUrl,
          audioBase64: n8nData.audioBase64, // Include raw base64 for frontend processing
          timestamp: new Date().toISOString(),
          source: 'n8n'
        });
      } else {
        throw new Error(n8nData.error || 'N8N processing failed');
      }

    } catch (n8nError) {
      console.error('❌ N8N webhook error:', n8nError);
      
      // Fallback to local processing if N8N fails
      console.log('🔄 Falling back to local processing...');
      
      const fallbackResponse = generateFallbackResponse(message, language);
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        warning: 'N8N unavailable, using fallback response'
      });
    }

  } catch (error) {
    console.error('❌ Voice assistant API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process voice message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Fallback response generator
function generateFallbackResponse(message: string, language: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (language === 'ar') {
    if (lowerMessage.includes('مرحبا') || lowerMessage.includes('أهلا') || lowerMessage.includes('السلام')) {
      return 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟';
    } else if (lowerMessage.includes('كيف حالك') || lowerMessage.includes('كيفك')) {
      return 'أنا بخير، شكراً لسؤالك! كيف يمكنني أن أساعدك؟';
    } else if (lowerMessage.includes('ما اسمك') || lowerMessage.includes('من أنت')) {
      return 'أنا مساعدك الصوتي الذكي. أنا هنا لمساعدتك في أي شيء تحتاجه.';
    } else if (lowerMessage.includes('وقت') || lowerMessage.includes('ساعة')) {
      const now = new Date();
      return `الوقت الآن ${now.toLocaleTimeString('ar-SA')}`;
    } else if (lowerMessage.includes('تاريخ') || lowerMessage.includes('يوم')) {
      const today = new Date();
      return `اليوم هو ${today.toLocaleDateString('ar-SA')}`;
    } else if (lowerMessage.includes('مساعدة') || lowerMessage.includes('ساعدني')) {
      return 'بالطبع! يمكنني مساعدتك في العديد من الأشياء. ما الذي تحتاج إليه تحديداً؟';
    } else if (lowerMessage.includes('شكرا') || lowerMessage.includes('شكراً')) {
      return 'عفواً! أنا سعيد لأنني تمكنت من مساعدتك.';
    } else if (lowerMessage.includes('وداعا') || lowerMessage.includes('مع السلامة')) {
      return 'وداعاً! كان من دواعي سروري التحدث معك.';
    } else {
      return 'هذا سؤال مثير للاهتمام! للأسف، الخدمة الذكية غير متاحة حالياً. هل يمكنك المحاولة لاحقاً؟';
    }
  } else {
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'Hello! How can I help you today?';
    } else if (lowerMessage.includes('how are you')) {
      return 'I\'m doing great, thank you for asking! How can I assist you?';
    } else if (lowerMessage.includes('what\'s your name') || lowerMessage.includes('who are you')) {
      return 'I\'m your intelligent voice assistant. I\'m here to help you with whatever you need.';
    } else if (lowerMessage.includes('time') || lowerMessage.includes('clock')) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()}`;
    } else if (lowerMessage.includes('date') || lowerMessage.includes('today')) {
      const today = new Date();
      return `Today is ${today.toLocaleDateString()}`;
    } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
      return 'Of course! I can help you with many things. What specifically do you need help with?';
    } else if (lowerMessage.includes('thank')) {
      return 'You\'re welcome! I\'m glad I could help you.';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return 'Goodbye! It was nice talking with you.';
    } else {
      return 'That\'s an interesting question! Unfortunately, the smart service is currently unavailable. Could you try again later?';
    }
  }
}