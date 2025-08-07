import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { smartCalendar, VoiceSchedulingRequest } from '@/lib/smartCalendar';
import { getAuthenticatedClient, GoogleCalendar } from '@/lib/google';

// Enhanced Smart Calendar API with Voice Scheduling and Conflict Detection
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
    
    const body = await request.json();
    const { voiceInput, eventData, action } = body;

    switch (action) {
      case 'process_voice_scheduling':
        return await handleVoiceScheduling(voiceInput, request);
      
      case 'create_smart_event':
        return await handleSmartEventCreation(eventData, request);
      
      case 'check_conflicts':
        return await handleConflictCheck(eventData);
      
      case 'get_suggestions':
        return await handleGetSuggestions(eventData);
      
      case 'prepare_meeting':
        return await handleMeetingPreparation(eventData, request);
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action specified' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('Smart calendar API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process smart calendar request'
      },
      { status: 500 }
    );
  }
}

async function handleVoiceScheduling(voiceInput: string, request: NextRequest): Promise<NextResponse> {
  try {
    // Process voice input through smart calendar
    const schedulingRequest: VoiceSchedulingRequest = await smartCalendar.processVoiceScheduling(voiceInput);
    
    // If confidence is high enough, proceed with scheduling
    if (schedulingRequest.confidence > 0.7) {
      const eventData = convertIntentToEventData(schedulingRequest);
      
      // Create the event with conflict detection
      const createdEvent = await smartCalendar.createEvent(eventData);
      
      // Sync with Google Calendar if user is authenticated
      try {
        const googleEvent = await syncWithGoogleCalendar(createdEvent, request);
        createdEvent.id = googleEvent.id || createdEvent.id;
      } catch (syncError) {
        console.warn('Google Calendar sync failed, event created locally:', syncError);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          schedulingRequest,
          createdEvent,
          message: 'Event scheduled successfully with smart conflict detection!'
        }
      });
    } else {
      // Return suggestions for clarification
      return NextResponse.json({
        success: true,
        data: {
          schedulingRequest,
          requiresClarification: true,
          message: 'I need some clarification to schedule this event perfectly.'
        }
      });
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function handleSmartEventCreation(eventData: any, request: NextRequest): Promise<NextResponse> {
  try {
    // Create event with smart features
    const createdEvent = await smartCalendar.createEvent(eventData);
    
    // Sync with Google Calendar
    try {
      await syncWithGoogleCalendar(createdEvent, request);
    } catch (syncError) {
      console.warn('Google Calendar sync failed:', syncError);
    }
    
    return NextResponse.json({
      success: true,
      data: createdEvent,
      message: 'Smart event created with conflict detection and travel time!'
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function handleConflictCheck(eventData: any): Promise<NextResponse> {
  try {
    // Check for conflicts
    const conflicts = await smartCalendar.detectConflicts(eventData);
    
    // Generate alternative suggestions if conflicts exist
    const suggestions = conflicts.length > 0 ? 
      await generateAlternativeTimeSlots(eventData, conflicts) : [];
    
    return NextResponse.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts,
        suggestions,
        message: conflicts.length > 0 ? 
          `Found ${conflicts.length} conflict(s). Here are some alternative time slots.` :
          'No conflicts found! This time slot is available.'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function handleGetSuggestions(eventData: any): Promise<NextResponse> {
  try {
    const suggestions = await smartCalendar.getAvailableTimeSlots({
      eventType: eventData.eventType || 'meeting',
      duration: eventData.duration || 60,
      category: eventData.category || 'work'
    } as any);
    
    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        message: 'Here are some available time slots that work with your schedule.'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function handleMeetingPreparation(eventData: any, request: NextRequest): Promise<NextResponse> {
  try {
    // Get meeting preparation items
    const preparationItems = await generateMeetingPreparation(eventData, request);
    
    return NextResponse.json({
      success: true,
      data: {
        preparationItems,
        message: 'Meeting preparation items gathered successfully!'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Helper Functions

function convertIntentToEventData(schedulingRequest: VoiceSchedulingRequest): any {
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

async function syncWithGoogleCalendar(event: any, request: NextRequest): Promise<any> {
  try {
    const accessToken = request.cookies.get('google_access_token')?.value;
    const refreshToken = request.cookies.get('google_refresh_token')?.value;
    
    if (!accessToken) {
      throw new Error('Google authentication required for sync');
    }
    
    const auth = getAuthenticatedClient({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    
    const calendar = new GoogleCalendar(auth);
    
    // Convert to Google Calendar format
    const googleEvent: any = {
      summary: event.title,
      description: event.description || `Smart scheduled: ${event.title}`,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location: event.location?.address,
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map((r: any) => ({
          method: r.type === 'notification' ? 'popup' : r.type,
          minutes: r.minutesBefore
        })) || [
          { method: 'popup', minutes: 15 },
          { method: 'email', minutes: 60 }
        ]
      }
    };
    
    // Handle recurring events
    if (event.isRecurring && event.recurrenceRule) {
      googleEvent.recurrence = [buildRecurrenceRule(event.recurrenceRule)];
    }
    
    return await calendar.createEvent(googleEvent);
    
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    throw error;
  }
}

function buildRecurrenceRule(recurrenceRule: any): string {
  let rule = `RRULE:FREQ=${recurrenceRule.frequency.toUpperCase()}`;
  
  if (recurrenceRule.interval > 1) {
    rule += `;INTERVAL=${recurrenceRule.interval}`;
  }
  
  if (recurrenceRule.daysOfWeek && recurrenceRule.daysOfWeek.length > 0) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const ruleDays = recurrenceRule.daysOfWeek.map((day: number) => days[day]).join(',');
    rule += `;BYDAY=${ruleDays}`;
  }
  
  if (recurrenceRule.endDate) {
    rule += `;UNTIL=${recurrenceRule.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  } else if (recurrenceRule.occurrences) {
    rule += `;COUNT=${recurrenceRule.occurrences}`;
  }
  
  return rule;
}

async function generateAlternativeTimeSlots(eventData: any, conflicts: any[]): Promise<Date[]> {
  const alternatives: Date[] = [];
  const duration = eventData.endTime.getTime() - eventData.startTime.getTime();
  
  // Try different time slots
  const baseTime = new Date(eventData.startTime);
  
  // Try 1 hour earlier
  const earlierSlot = new Date(baseTime.getTime() - 60 * 60 * 1000);
  if (await smartCalendar.checkTimeSlotAvailability(earlierSlot, duration / (1000 * 60))) {
    alternatives.push(earlierSlot);
  }
  
  // Try 1 hour later
  const laterSlot = new Date(baseTime.getTime() + 60 * 60 * 1000);
  if (await smartCalendar.checkTimeSlotAvailability(laterSlot, duration / (1000 * 60))) {
    alternatives.push(laterSlot);
  }
  
  // Try next day same time
  const nextDay = new Date(baseTime);
  nextDay.setDate(nextDay.getDate() + 1);
  if (await smartCalendar.checkTimeSlotAvailability(nextDay, duration / (1000 * 60))) {
    alternatives.push(nextDay);
  }
  
  return alternatives;
}

async function generateMeetingPreparation(eventData: any, request: NextRequest): Promise<any[]> {
  const preparationItems: any[] = [];
  
  // Add agenda preparation
  preparationItems.push({
    type: 'task',
    title: 'Prepare meeting agenda',
    content: `Create detailed agenda for "${eventData.title}"`,
    priority: 'high',
    completed: false,
    dueDate: new Date(eventData.startTime.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
  });
  
  // Add document gathering
  preparationItems.push({
    type: 'document',
    title: 'Gather relevant documents',
    content: 'Collect and organize all documents related to the meeting topic',
    priority: 'medium',
    completed: false,
    dueDate: new Date(eventData.startTime.getTime() - 60 * 60 * 1000) // 1 hour before
  });
  
  // Add email review if attendees are present
  if (eventData.attendees && eventData.attendees.length > 0) {
    preparationItems.push({
      type: 'email',
      title: 'Review recent emails',
      content: `Review email threads with ${eventData.attendees.map((a: any) => a.name || a.email).join(', ')}`,
      priority: 'medium',
      completed: false,
      dueDate: new Date(eventData.startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
    });
  }
  
  // Add location and travel preparation
  if (eventData.location) {
    preparationItems.push({
      type: 'travel',
      title: 'Plan travel route',
      content: `Plan route to ${eventData.location.address}. Leave ${eventData.travelTime?.estimatedDuration || 15} minutes early.`,
      priority: 'high',
      completed: false,
      dueDate: new Date(eventData.startTime.getTime() - (eventData.travelTime?.estimatedDuration || 15) * 60 * 1000)
    });
  }
  
  // Add tech check for virtual meetings
  if (eventData.meetingType === 'virtual' && eventData.conferenceData) {
    preparationItems.push({
      type: 'tech',
      title: 'Test meeting technology',
      content: `Test camera, microphone, and connection for ${eventData.conferenceData.provider} meeting`,
      priority: 'medium',
      completed: false,
      dueDate: new Date(eventData.startTime.getTime() - 15 * 60 * 1000) // 15 minutes before
    });
  }
  
  return preparationItems;
}

// GET endpoint for retrieving smart calendar data
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'preferences':
        return NextResponse.json({
          success: true,
          data: smartCalendar.getPreferences()
        });
      
      case 'events':
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
        
        return NextResponse.json({
          success: true,
          data: smartCalendar.getEvents(startDate, endDate)
        });
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action specified' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}