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
      
      // Fallback to simpler local processing if N8N fails
      console.log('🔄 Falling back to simple local processing...');
      
      const simpleResponse = await processSimpleCommand(message, language);
      
      return NextResponse.json({
        success: true,
        response: simpleResponse.response,
        action: simpleResponse.action,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        source: 'simple_local',
        warning: 'Advanced voice processing temporarily unavailable'
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

// Simple local command processor for fallback
async function processSimpleCommand(message: string, language: string): Promise<{ response: string; action?: any }> {
  const lowerMessage = message.toLowerCase().trim();
  let response = '';
  let action: any = null;

  // Navigation commands
  if (lowerMessage.includes('navigate to') || lowerMessage.includes('go to') || lowerMessage.includes('open')) {
    const navigationMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'calendar': '/calendar',
      'email': '/email',
      'expenses': '/expenses', 
      'diary': '/diary',
      'contacts': '/contacts',
      'budget': '/budget',
      'hotel expenses': '/hotel-expenses',
      'shopping': '/shopping-list',
      'youtube': '/youtube',
      'facebook': '/facebook',
      'instagram': '/instagram',
      'photos': '/photos',
      'tracking': '/tracking',
      'social media': '/social-media',
      'messenger': '/messenger',
      'weather': '/weather',
      'web scraper': '/web-scraper',
      'islamic settings': '/islamic-settings',
      'security': '/security',
      'chat': '/chat'
    };

    for (const [key, path] of Object.entries(navigationMap)) {
      if (lowerMessage.includes(key)) {
        response = language === 'ar' 
          ? `الانتقال إلى صفحة ${key}`
          : `Navigating to ${key} page`;
        action = { navigate: path };
        break;
      }
    }

    if (!action) {
      response = language === 'ar' 
        ? 'لست متأكداً من الصفحة التي تريد الانتقال إليها. يرجى تحديد اسم صفحة صحيح.'
        : 'I\'m not sure which page you want to navigate to. Please specify a valid page name.';
    }
  }
  // Add new item commands
  else if (lowerMessage.includes('add new') || lowerMessage.includes('create new')) {
    if (lowerMessage.includes('expense')) {
      response = language === 'ar' ? 'فتح صفحة المصاريف لإضافة مصروف جديد' : 'Opening expenses page to add a new expense';
      action = { navigate: '/expenses' };
    } else if (lowerMessage.includes('contact')) {
      response = language === 'ar' ? 'فتح صفحة جهات الاتصال لإضافة جهة اتصال جديدة' : 'Opening contacts page to add a new contact';
      action = { navigate: '/contacts' };
    } else if (lowerMessage.includes('diary entry') || lowerMessage.includes('journal')) {
      response = language === 'ar' ? 'فتح المذكرات لإضافة مذكرة جديدة' : 'Opening diary to add a new entry';
      action = { navigate: '/diary' };
    } else if (lowerMessage.includes('budget')) {
      response = language === 'ar' ? 'فتح صفحة الميزانية لإضافة عنصر ميزانية جديد' : 'Opening budget page to add a new budget item';
      action = { navigate: '/budget' };
    } else if (lowerMessage.includes('event')) {
      response = language === 'ar' ? 'فتح التقويم لإضافة حدث جديد' : 'Opening calendar to add a new event';
      action = { navigate: '/calendar' };
    } else {
      response = language === 'ar' 
        ? 'ماذا تريد أن تضيف؟ يمكنك إضافة مصاريف، جهات اتصال، مذكرات، عناصر الميزانية، أو أحداث التقويم.'
        : 'What would you like to add? You can add expenses, contacts, diary entries, budget items, or calendar events.';
    }
  }
  // Show/display commands
  else if (lowerMessage.includes('show me') || lowerMessage.includes('display')) {
    if (lowerMessage.includes('dashboard') || lowerMessage.includes('overview')) {
      response = language === 'ar' ? 'عرض لوحة التحكم مع جميع الأنشطة الحديثة' : 'Showing your dashboard with all recent activity';
      action = { navigate: '/dashboard' };
    } else if (lowerMessage.includes('expenses') || lowerMessage.includes('spending')) {
      response = language === 'ar' ? 'عرض تقارير المصاريف' : 'Showing your expense reports';
      action = { navigate: '/expenses' };
    } else if (lowerMessage.includes('calendar') || lowerMessage.includes('events')) {
      response = language === 'ar' ? 'عرض التقويم والأحداث القادمة' : 'Showing your calendar and upcoming events';
      action = { navigate: '/calendar' };
    } else if (lowerMessage.includes('photos')) {
      response = language === 'ar' ? 'فتح معرض الصور' : 'Opening your photo gallery';
      action = { navigate: '/photos' };
    } else {
      response = language === 'ar' 
        ? 'ماذا تريد أن أعرض عليك؟ يمكنني عرض لوحة التحكم، المصاريف، التقويم، الصور، والمزيد.'
        : 'What would you like me to show you? I can display your dashboard, expenses, calendar, photos, and more.';
    }
  }
  // Islamic/prayer commands
  else if (lowerMessage.includes('prayer') || lowerMessage.includes('islamic') || lowerMessage.includes('salah')) {
    response = language === 'ar' ? 'فتح الإعدادات الإسلامية لعرض أوقات الصلاة والميزات الإسلامية' : 'Opening Islamic settings to view prayer times and Islamic features';
    action = { navigate: '/islamic-settings' };
  }
  // Time-based queries
  else if (lowerMessage.includes('what time') || lowerMessage.includes('current time')) {
    const currentTime = new Date().toLocaleTimeString();
    response = language === 'ar' ? `الوقت الحالي هو ${currentTime}` : `The current time is ${currentTime}`;
  }
  // Weather queries
  else if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
    response = language === 'ar' ? 'دعني أعرض عليك معلومات الطقس الحالية' : 'Let me show you the current weather information';
    action = { navigate: '/weather' };
  }
  // Social media commands
  else if (lowerMessage.includes('facebook') || lowerMessage.includes('youtube') || lowerMessage.includes('social')) {
    if (lowerMessage.includes('facebook')) {
      response = language === 'ar' ? 'فتح أدوات إدارة فيسبوك' : 'Opening Facebook management tools';
      action = { navigate: '/facebook' };
    } else if (lowerMessage.includes('youtube')) {
      response = language === 'ar' ? 'فتح تحليلات وإدارة يوتيوب' : 'Opening YouTube analytics and management';
      action = { navigate: '/youtube' };
    } else {
      response = language === 'ar' ? 'فتح نظرة عامة على وسائل التواصل الاجتماعي' : 'Opening social media overview';
      action = { navigate: '/social-media' };
    }
  }
  // Help commands
  else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    response = language === 'ar' 
      ? 'يمكنني مساعدتك في الانتقال إلى صفحات مختلفة، إضافة عناصر جديدة، عرض المعلومات، والإجابة على الأسئلة. جرب قول "انتقل إلى لوحة التحكم"، "أضف مصروفاً جديداً"، أو "أعرض لي التقويم".'
      : 'I can help you navigate to different pages, add new items, show information, and answer questions. Try saying "navigate to dashboard", "add new expense", or "show me my calendar".';
  }
  // Greeting responses
  else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('مرحبا') || lowerMessage.includes('أهلا')) {
    response = language === 'ar' 
      ? 'مرحباً! كيف يمكنني مساعدتك اليوم؟ يمكنك أن تطلب مني الانتقال إلى صفحات مختلفة، إضافة عناصر جديدة، أو عرض معلومات.'
      : 'Hello! How can I assist you today? You can ask me to navigate to different pages, add new items, or show you information.';
  }
  // Default response
  else {
    response = language === 'ar'
      ? `سمعت "${message}" ولكنني لست متأكداً من كيفية المساعدة في ذلك. جرب أن تطلب مني الانتقال إلى صفحة، إضافة شيء جديد، أو عرض معلومات. يمكنك أيضاً قول "مساعدة" لتعلم المزيد حول ما يمكنني فعله.`
      : `I heard "${message}" but I'm not sure how to help with that. Try asking me to navigate to a page, add something new, or show you information. You can also say "help" to learn more about what I can do.`;
  }

  return { response, action };
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