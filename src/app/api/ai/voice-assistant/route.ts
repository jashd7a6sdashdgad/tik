import { NextRequest, NextResponse } from 'next/server';
import { smartCalendar } from '@/lib/smartCalendar';
import { VoiceCommandProcessor } from '@/lib/voiceCommandProcessor';

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
        body: JSON.stringify(n8nPayload)
      });

      if (!n8nResponse.ok) {
        throw new Error(`N8N webhook failed with status: ${n8nResponse.status}`);
      }

      const n8nData: N8NResponse = await n8nResponse.json();
      console.log('✅ N8N response received:', n8nData.success ? 'Success' : 'Failed');

      if (n8nData.success) {
        // Handle binary audio response from N8N
        let audioUrl: string | null = null;
        
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
      
      // Fallback to local smart processing if N8N fails
      console.log('🔄 Falling back to smart local processing...');
      
      const smartResponse = await processSmartCommand(message, language);
      
      return NextResponse.json({
        success: true,
        response: smartResponse.response,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        source: 'smart_local',
        data: smartResponse.data,
        warning: 'N8N unavailable, using smart local processing'
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

// Smart command processor
async function processSmartCommand(message: string, language: string): Promise<{ response: string; data?: any }> {
  try {
    console.log('🧠 Processing smart command:', message);
    
    // Initialize voice command processor
    const voiceProcessor = new VoiceCommandProcessor();
    const commandResult = voiceProcessor.processCommand(message);
    
    if (!commandResult) {
      return { response: generateFallbackResponse(message, language) };
    }
    
    console.log('🎯 Command action detected:', commandResult.action);
    
    // Handle smart calendar commands
    if (commandResult.action === 'schedule_recurring_activity' || 
        commandResult.action === 'schedule_recurring_meeting' || 
        commandResult.action === 'schedule_event') {
      
      try {
        // Process voice scheduling through smart calendar
        const schedulingResult = await smartCalendar.processVoiceScheduling(message);
        
        if (schedulingResult.confidence > 0.7) {
          // High confidence - create the event
          const eventData = convertIntentToEventData(schedulingResult);
          const createdEvent = await smartCalendar.createEvent(eventData);
          
          const successMessage = language === 'ar' 
            ? `تم! لقد جدولت "${createdEvent.title}" بنجاح. ${createdEvent.conflictResolution && createdEvent.conflictResolution.length > 0 ? 'وجدت بعض التعارضات ولكن اقترحت أوقاتاً بديلة.' : ''}`
            : `Done! I've successfully scheduled "${createdEvent.title}". ${createdEvent.conflictResolution && createdEvent.conflictResolution.length > 0 ? 'I found some conflicts but suggested alternative times.' : ''}`;
          
          return {
            response: successMessage,
            data: {
              action: 'event_created',
              event: createdEvent,
              schedulingRequest: schedulingResult
            }
          };
        } else {
          // Low confidence - ask for clarification
          const clarificationMessage = language === 'ar'
            ? `أحتاج إلى توضيح بعض التفاصيل لجدولة هذا الحدث بشكل مثالي. ${schedulingResult.ambiguities.join(', ')}`
            : `I need some clarification to schedule this event perfectly. ${schedulingResult.ambiguities.join(', ')}`;
          
          return {
            response: clarificationMessage,
            data: {
              action: 'clarification_needed',
              schedulingRequest: schedulingResult
            }
          };
        }
      } catch (calendarError) {
        console.error('Calendar processing error:', calendarError);
        const errorMessage = language === 'ar'
          ? 'عذراً، حدث خطأ أثناء جدولة الحدث. يرجى المحاولة مرة أخرى.'
          : 'Sorry, there was an error scheduling the event. Please try again.';
        
        return { response: errorMessage };
      }
    }
    
    // Handle conflict checking
    if (commandResult.action === 'check_conflicts') {
      try {
        // Get events for conflict checking
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const events = smartCalendar.getEvents(today, nextWeek);
        
        const conflictMessage = language === 'ar'
          ? `لديك ${events.length} أحداث مجدولة في الأسبوع القادم. هل تريد التحقق من وقت محدد؟`
          : `You have ${events.length} events scheduled for the next week. Would you like me to check a specific time?`;
        
        return {
          response: conflictMessage,
          data: {
            action: 'conflict_check',
            eventsCount: events.length,
            events: events.slice(0, 5) // First 5 events
          }
        };
      } catch (error) {
        console.error('Conflict check error:', error);
        return { response: generateFallbackResponse(message, language) };
      }
    }
    
    // Handle meeting preparation
    if (commandResult.action === 'prepare_meeting') {
      const prepMessage = language === 'ar'
        ? 'سأساعدك في التحضير للاجتماع. سأجمع الإيميلات والمستندات ذات الصلة وأحضر جدول الأعمال.'
        : 'I\'ll help you prepare for the meeting. I\'ll gather relevant emails, documents, and prepare an agenda.';
      
      return {
        response: prepMessage,
        data: {
          action: 'meeting_preparation',
          preparationStarted: true
        }
      };
    }
    
    // Handle other commands normally
    return {
      response: commandResult.response,
      data: commandResult.data
    };
    
  } catch (error) {
    console.error('Smart command processing error:', error);
    return { response: generateFallbackResponse(message, language) };
  }
}

// Convert scheduling intent to event data
function convertIntentToEventData(schedulingRequest: any): any {
  const { parsedIntent } = schedulingRequest;
  
  const eventData: any = {
    title: parsedIntent.title || 'Scheduled Event',
    category: parsedIntent.category || 'other',
    priority: 'medium',
    isRecurring: !!parsedIntent.recurrence,
    recurrenceRule: parsedIntent.recurrence
  };
  
  // Set start time
  if (parsedIntent.startTime) {
    eventData.startTime = parsedIntent.startTime;
  } else {
    // Default to next available slot
    eventData.startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  }
  
  // Set end time
  if (parsedIntent.endTime) {
    eventData.endTime = parsedIntent.endTime;
  } else if (parsedIntent.duration) {
    eventData.endTime = new Date(eventData.startTime.getTime() + parsedIntent.duration * 60 * 1000);
  } else {
    eventData.endTime = new Date(eventData.startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
  }
  
  // Set location if specified
  if (parsedIntent.location) {
    eventData.location = {
      address: parsedIntent.location,
      type: getLocationType(parsedIntent.location)
    };
  }
  
  return eventData;
}

function getLocationType(location: string): string {
  const locationLower = location.toLowerCase();
  
  if (locationLower.includes('gym') || locationLower.includes('fitness')) return 'gym';
  if (locationLower.includes('office') || locationLower.includes('work')) return 'office';
  if (locationLower.includes('home')) return 'home';
  if (locationLower.includes('restaurant') || locationLower.includes('cafe')) return 'restaurant';
  
  return 'other';
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