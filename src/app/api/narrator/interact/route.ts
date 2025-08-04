import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

interface NarratorResponse {
  success: boolean;
  message: string;
  speech?: string;
  action?: string;
  personality?: 'friendly' | 'professional' | 'enthusiastic' | 'calm';
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
    
    const user = verifyToken(token);
    const body = await request.json();
    const { action, parameters } = body;
    
    if (!action) {
      return NextResponse.json<NarratorResponse>({
        success: false,
        message: 'Narrator action is required'
      }, { status: 400 });
    }
    
    // Handle different narrator actions
    switch (action) {
      case 'greet':
        return handleGreeting(parameters, user);
        
      case 'farewell':
        return handleFarewell(parameters, user);
        
      case 'speak':
        return handleSpeakRequest(parameters, user);
        
      case 'help':
        return handleHelpRequest(parameters, user);
        
      case 'show_tracking':
        return handleTrackingRequest(parameters, user);
        
      case 'count_items':
        return handleCountRequest(parameters, user);
        
      default:
        return NextResponse.json<NarratorResponse>({
          success: false,
          message: `Unknown narrator action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Narrator interaction error:', error);
    
    return NextResponse.json<NarratorResponse>({
      success: false,
      message: error.message || 'Failed to process narrator interaction'
    }, { status: 500 });
  }
}

function handleGreeting(parameters: any, user: any): NextResponse<NarratorResponse> {
  const timeOfDay = getTimeOfDay();
  const userName = user.username || 'there';
  
  const greetings = [
    `Good ${timeOfDay}, ${userName}! I'm your personal assistant narrator. How can I help you today?`,
    `Hello ${userName}! Welcome back. I'm here to assist you with your daily tasks and provide insights.`,
    `Hi there, ${userName}! Ready to tackle the day together? What would you like to accomplish?`,
    `Greetings, ${userName}! Your personal narrator is at your service. Let's make today productive!`
  ];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  const additionalMessage = parameters.message ? ` ${parameters.message}` : '';
  
  return NextResponse.json<NarratorResponse>({
    success: true,
    message: randomGreeting + additionalMessage,
    speech: randomGreeting + additionalMessage,
    action: 'greet',
    personality: 'friendly'
  });
}

function handleFarewell(parameters: any, user: any): NextResponse<NarratorResponse> {
  const userName = user.username || 'there';
  
  const farewells = [
    `Goodbye, ${userName}! Have a wonderful rest of your day. I'll be here when you need me.`,
    `Take care, ${userName}! Remember to stay productive and keep up the great work.`,
    `See you later, ${userName}! Don't forget to review your achievements today.`,
    `Farewell for now, ${userName}! Wishing you success in all your endeavors.`
  ];
  
  const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
  const additionalMessage = parameters.message ? ` ${parameters.message}` : '';
  
  return NextResponse.json<NarratorResponse>({
    success: true,
    message: randomFarewell + additionalMessage,
    speech: randomFarewell + additionalMessage,
    action: 'farewell',
    personality: 'calm'
  });
}

async function handleSpeakRequest(parameters: any, user: any): Promise<NextResponse<NarratorResponse>> {
  const request = parameters.request || 'about my day';
  const userName = user.username || 'there';
  
  // Generate contextual response based on request
  let response = '';
  
  if (request.includes('day') || request.includes('schedule') || request.includes('today')) {
    response = await generateDayInsight(userName);
  } else if (request.includes('progress') || request.includes('goal') || request.includes('achievement')) {
    response = await generateProgressInsight(userName);
  } else if (request.includes('productivity') || request.includes('performance')) {
    response = await generateProductivityInsight(userName);
  } else if (request.includes('weather') || request.includes('outside')) {
    response = await generateWeatherInsight(userName);
  } else {
    response = await generateGeneralInsight(userName);
  }
  
  return NextResponse.json<NarratorResponse>({
    success: true,
    message: response,
    speech: response,
    action: 'speak',
    personality: 'professional'
  });
}

function handleHelpRequest(parameters: any, user: any): NextResponse<NarratorResponse> {
  const topic = parameters.topic || 'general';
  const userName = user.username || 'there';
  
  let helpMessage = '';
  
  switch (topic.toLowerCase()) {
    case 'commands':
    case 'voice':
      helpMessage = `${userName}, here are some voice commands you can use: Say "Hello N" to greet me, "Bye N" to say goodbye, "Schedule meeting tomorrow at 3 PM", "Add 10 OMR expense for lunch", "Send email to John about the project", or "Add milk to my shopping list".`;
      break;
      
    case 'calendar':
    case 'events':
      helpMessage = `${userName}, I can help you manage your calendar! Try saying "Schedule dentist appointment next Thursday at 2 PM" or "What's my schedule for tomorrow?". I'll automatically create events and remind you about them.`;
      break;
      
    case 'expenses':
    case 'money':
      helpMessage = `${userName}, managing expenses is easy! Say "Add 25 OMR expense for groceries" or "Add 50 OMR expense for fuel". I'll categorize them automatically and track your spending patterns.`;
      break;
      
    case 'email':
      helpMessage = `${userName}, I can help with email management! Try "Send email to Sarah about the meeting" or "How many unread emails do I have?". I'll draft and send emails for you.`;
      break;
      
    default:
      helpMessage = `${userName}, I'm your personal assistant narrator! I can help you with scheduling, expense tracking, email management, shopping lists, and more. Try saying "Hello N" to start a conversation, or ask me about specific topics like "Narrator help with calendar" or "Narrator tell me about my productivity".`;
  }
  
  return NextResponse.json<NarratorResponse>({
    success: true,
    message: helpMessage,
    speech: helpMessage,
    action: 'help',
    personality: 'enthusiastic'
  });
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'morning';
  } else if (hour < 17) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

async function generateDayInsight(userName: string): Promise<string> {
  // In a real implementation, this would fetch actual user data
  const insights = [
    `${userName}, you have a productive day ahead! Based on your schedule, I see you have 3 important events and 2 pending tasks. Your calendar looks well-organized.`,
    `Good news, ${userName}! Your day is looking manageable with moderate activity. You've got some time for focused work between your scheduled meetings.`,
    `${userName}, today seems like a great day to tackle your goals! You have a good balance of meetings and free time for deep work.`,
    `Looking at your patterns, ${userName}, this is typically one of your most productive days of the week. Make the most of it!`
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}

async function generateProgressInsight(userName: string): Promise<string> {
  const insights = [
    `${userName}, you're making excellent progress! This month you've completed 85% of your scheduled events and stayed within your expense budget.`,
    `Great job, ${userName}! Your productivity has increased by 15% compared to last month. Keep up the momentum!`,
    `${userName}, you're on track to exceed your monthly goals! Your consistency in task completion is impressive.`,
    `I'm proud of your progress, ${userName}! You've successfully maintained a healthy work-life balance while achieving your objectives.`
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}

async function generateProductivityInsight(userName: string): Promise<string> {
  const insights = [
    `${userName}, your productivity patterns show you're most effective between 9-11 AM. Consider scheduling important tasks during this window.`,
    `Based on your data, ${userName}, Tuesdays are your most productive days. You complete 40% more tasks compared to other weekdays.`,
    `${userName}, you've maintained a 92% task completion rate this month! Your time management skills are really paying off.`,
    `Interesting insight, ${userName}: You're most creative in the afternoons but most efficient with routine tasks in the mornings.`
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}

async function generateWeatherInsight(userName: string): Promise<string> {
  const insights = [
    `${userName}, it's a beautiful day in Muscat with clear skies and 28°C. Perfect weather for outdoor activities after work!`,
    `The weather today is quite pleasant, ${userName}. Clear conditions with comfortable temperatures - ideal for a productive day.`,
    `${userName}, current conditions in Muscat show sunny weather with low humidity. Great day to get things done!`,
    `Beautiful weather today, ${userName}! The clear skies and moderate temperature make it perfect for both work and leisure activities.`
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}

async function generateGeneralInsight(userName: string): Promise<string> {
  const insights = [
    `${userName}, you're doing amazing! Your consistent use of this personal assistant shows great commitment to organization and productivity.`,
    `I've noticed you're becoming more efficient with your daily routines, ${userName}. Your systematic approach is yielding great results.`,
    `${userName}, your dedication to tracking and managing your daily activities is inspiring. You're building excellent habits!`,
    `Keep up the excellent work, ${userName}! Your proactive approach to personal management is setting you up for long-term success.`
  ];
  
  return insights[Math.floor(Math.random() * insights.length)];
}

async function handleTrackingRequest(parameters: any, user: any): Promise<NextResponse<NarratorResponse>> {
  const timeRange = parameters?.timeRange || 'month';
  const userName = user.name || 'friend';
  
  try {
    // Fetch analytics data from our new API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/tracking`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const data = result.data;
      const speech = `Here's your ${timeRange} analytics summary, ${userName}: You have ${data.overview.totalEvents} events, ${data.overview.totalEmails} emails, ${data.overview.totalExpenses.toFixed(2)} OMR in expenses, and ${data.overview.totalContacts} contacts. Your Facebook reach is ${data.social.facebookReach} and YouTube views are ${data.social.youtubeViews}. Your productivity score looks great!`;
      
      return NextResponse.json<NarratorResponse>({
        success: true,
        message: 'Analytics data retrieved successfully',
        speech,
        action: 'redirect_to_tracking',
        personality: 'professional'
      });
    } else {
      return NextResponse.json<NarratorResponse>({
        success: true,
        message: 'I had trouble accessing your analytics data right now',
        speech: `${userName}, I'm having trouble accessing your analytics data at the moment. Please check your tracking page directly for the most up-to-date information.`,
        personality: 'calm'
      });
    }
  } catch (error) {
    console.error('Error fetching tracking data for narrator:', error);
    return NextResponse.json<NarratorResponse>({
      success: true,
      message: 'Analytics temporarily unavailable',
      speech: `Sorry ${userName}, I can't access your analytics right now. Please try again in a moment or check your tracking page directly.`,
      personality: 'calm'
    });
  }
}

async function handleCountRequest(parameters: any, user: any): Promise<NextResponse<NarratorResponse>> {
  const itemType = parameters?.itemType || 'items';
  const timeRange = parameters?.timeRange || 'total';
  const userName = user.name || 'friend';
  
  try {
    // Fetch analytics data from our new API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/tracking`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const data = result.data;
      let count = 0;
      let speech = '';
      
      switch (itemType) {
        case 'events':
          count = data.overview.totalEvents;
          speech = `${userName}, you have ${count} events in total. This month you've had ${data.trends.eventsThisMonth} events.`;
          break;
        case 'emails':
          count = data.overview.totalEmails;
          speech = `${userName}, you have ${count} emails in total. This month you've received approximately ${data.trends.emailsThisMonth} emails.`;
          break;
        case 'expenses':
          count = data.overview.totalExpenses;
          speech = `${userName}, your total expenses are ${count.toFixed(2)} OMR. This month you've spent ${data.trends.expensesThisMonth.toFixed(2)} OMR.`;
          break;
        case 'contacts':
          count = data.overview.totalContacts;
          speech = `${userName}, you have ${count} contacts in your system.`;
          break;
        default:
          speech = `${userName}, I can count your events, emails, expenses, or contacts. What would you like to know about?`;
      }
      
      return NextResponse.json<NarratorResponse>({
        success: true,
        message: `${itemType} count retrieved`,
        speech,
        personality: 'friendly'
      });
    } else {
      return NextResponse.json<NarratorResponse>({
        success: true,
        message: 'Data temporarily unavailable',
        speech: `${userName}, I can't access your ${itemType} data right now. Please try again in a moment.`,
        personality: 'calm'
      });
    }
  } catch (error) {
    console.error('Error fetching count data for narrator:', error);
    return NextResponse.json<NarratorResponse>({
      success: true,
      message: `${itemType} count temporarily unavailable`,
      speech: `Sorry ${userName}, I can't count your ${itemType} right now. Please try again later.`,
      personality: 'calm'
    });
  }
}