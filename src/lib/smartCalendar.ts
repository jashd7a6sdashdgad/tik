// Smart Calendar Integration - Voice Scheduling and Intelligent Meeting Management

import { workflowEngine } from './workflowEngine';
import { locationServices, LocationData, TravelTimeResult } from './locationServices';
import { meetingPreparationService, MeetingPreparationItem } from './meetingPreparation';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: EventLocation;
  attendees: EventAttendee[];
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  reminders: EventReminder[];
  category: EventCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdBy: string;
  lastModified: Date;
  meetingType: 'in-person' | 'virtual' | 'hybrid' | 'phone';
  conferenceData?: ConferenceData;
  preparationItems?: PreparationItem[];
  travelTime?: TravelTimeInfo;
  conflictResolution?: ConflictResolution[];
}

export interface EventLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
  name?: string;
  type: 'office' | 'home' | 'restaurant' | 'gym' | 'other';
  parking?: boolean;
  accessibility?: string[];
}

export interface EventAttendee {
  email: string;
  name: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
  isOptional: boolean;
  role?: 'organizer' | 'required' | 'optional';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[];
}

export interface EventReminder {
  type: 'notification' | 'email' | 'sms';
  minutesBefore: number;
  message?: string;
}

export interface ConferenceData {
  provider: 'zoom' | 'teams' | 'meet' | 'webex';
  url: string;
  meetingId?: string;
  password?: string;
  dialIn?: string;
}

export interface PreparationItem {
  type: 'email' | 'document' | 'contact' | 'task' | 'note' | 'travel' | 'agenda';
  title: string;
  content?: string;
  url?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
}

export interface TravelTimeInfo {
  origin: string;
  destination: string;
  estimatedDuration: number; // minutes
  transportMode: 'driving' | 'walking' | 'transit' | 'cycling';
  departureTime: Date;
  arrivalTime: Date;
  route?: string;
}

export interface ConflictResolution {
  conflictWith: string; // Event ID
  resolutionType: 'reschedule' | 'shorten' | 'decline' | 'accept_conflict';
  suggestedAlternatives: Date[];
  reason: string;
}

export interface VoiceSchedulingRequest {
  originalText: string;
  parsedIntent: SchedulingIntent;
  confidence: number;
  ambiguities: string[];
  suggestions: SchedulingSuggestion[];
}

export interface SchedulingIntent {
  action: 'create' | 'update' | 'cancel' | 'reschedule' | 'find';
  eventType: 'meeting' | 'appointment' | 'task' | 'reminder' | 'break';
  title?: string;
  duration?: number; // minutes
  startTime?: Date;
  endTime?: Date;
  location?: string;
  recurrence?: RecurrenceRule;
  attendees?: string[];
  priority?: string;
  category?: EventCategory;
}

export interface SchedulingSuggestion {
  type: 'time' | 'location' | 'duration' | 'attendees' | 'recurrence';
  options: any[];
  reason: string;
  confidence: number;
}

export type EventCategory = 'work' | 'personal' | 'health' | 'social' | 'travel' | 'education' | 'other';

export interface CalendarPreferences {
  workingHours: { start: string; end: string };
  workingDays: number[];
  timeZone: string;
  defaultMeetingDuration: number;
  defaultLocation: string;
  autoAddTravelTime: boolean;
  conflictResolutionMode: 'automatic' | 'ask' | 'manual';
  reminderDefaults: EventReminder[];
  preferredMeetingTypes: string[];
}

export class SmartCalendarEngine {
  private events: Map<string, CalendarEvent> = new Map();
  private preferences: CalendarPreferences;
  private nlpPatterns: Map<string, RegExp[]> = new Map();
  private locationCache: Map<string, EventLocation> = new Map();
  private travelTimeCache: Map<string, TravelTimeInfo> = new Map();

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.initializeNLPPatterns();
    this.loadEventsFromStorage();
  }

  private getDefaultPreferences(): CalendarPreferences {
    return {
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultMeetingDuration: 60,
      defaultLocation: '',
      autoAddTravelTime: true,
      conflictResolutionMode: 'ask',
      reminderDefaults: [
        { type: 'notification', minutesBefore: 15 },
        { type: 'email', minutesBefore: 60 }
      ],
      preferredMeetingTypes: ['virtual', 'in-person']
    };
  }

  private initializeNLPPatterns(): void {
    // Time patterns
    this.nlpPatterns.set('time', [
      /at (\d{1,2}):?(\d{2})?\s*(am|pm)?/gi,
      /(\d{1,2})\s*(am|pm)/gi,
      /(morning|afternoon|evening|night)/gi,
      /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /in (\d+) (minutes?|hours?|days?|weeks?)/gi,
      /next (week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi
    ]);

    // Duration patterns
    this.nlpPatterns.set('duration', [
      /for (\d+) (minutes?|hours?)/gi,
      /(\d+) (min|mins|minutes?|hr|hrs|hours?)/gi,
      /(half an hour|30 minutes|1 hour|2 hours|all day)/gi
    ]);

    // Frequency patterns
    this.nlpPatterns.set('frequency', [
      /every (day|week|month|year)/gi,
      /every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /daily|weekly|monthly|yearly/gi,
      /(\d+) times? (a|per) (week|month|year)/gi
    ]);

    // Location patterns
    this.nlpPatterns.set('location', [
      /at (.+?)(?: at| on| for|$)/gi,
      /in the (.+?)(?: at| on| for|$)/gi,
      /(gym|office|home|restaurant|cafe|park|library|hospital|school)/gi
    ]);

    // Action patterns
    this.nlpPatterns.set('action', [
      /book|schedule|add|create|plan/gi,
      /cancel|delete|remove/gi,
      /reschedule|move|change/gi,
      /find|search|show/gi
    ]);

    // Event type patterns
    this.nlpPatterns.set('eventType', [
      /(meeting|appointment|call|interview|presentation)/gi,
      /(workout|gym|exercise|run|yoga)/gi,
      /(lunch|dinner|breakfast|meal)/gi,
      /(break|rest|personal time)/gi,
      /(reminder|task|todo)/gi
    ]);
  }

  // Voice Scheduling Methods
  async processVoiceScheduling(voiceText: string): Promise<VoiceSchedulingRequest> {
    const originalText = voiceText.trim();
    
    try {
      const parsedIntent = this.parseSchedulingIntent(originalText);
      const confidence = this.calculateConfidence(parsedIntent, originalText);
      const ambiguities = this.detectAmbiguities(parsedIntent, originalText);
      const suggestions = await this.generateSuggestions(parsedIntent, ambiguities);

      return {
        originalText,
        parsedIntent,
        confidence,
        ambiguities,
        suggestions
      };
    } catch (error) {
      console.error('Voice scheduling parsing error:', error);
      throw new Error('Failed to parse voice scheduling request');
    }
  }

  private parseSchedulingIntent(text: string): SchedulingIntent {
    const intent: SchedulingIntent = {
      action: 'create',
      eventType: 'meeting'
    };

    // Parse action
    const actionMatches = this.findPatternMatches(text, 'action');
    if (actionMatches.length > 0) {
      const actionText = actionMatches[0].toLowerCase();
      if (actionText.includes('cancel') || actionText.includes('delete')) {
        intent.action = 'cancel';
      } else if (actionText.includes('reschedule') || actionText.includes('move')) {
        intent.action = 'reschedule';
      } else if (actionText.includes('find') || actionText.includes('search')) {
        intent.action = 'find';
      }
    }

    // Parse event type
    const typeMatches = this.findPatternMatches(text, 'eventType');
    if (typeMatches.length > 0) {
      const typeText = typeMatches[0].toLowerCase();
      if (typeText.includes('workout') || typeText.includes('gym') || typeText.includes('exercise')) {
        intent.eventType = 'task';
        intent.category = 'health';
      } else if (typeText.includes('meeting') || typeText.includes('call')) {
        intent.eventType = 'meeting';
        intent.category = 'work';
      } else if (typeText.includes('lunch') || typeText.includes('dinner')) {
        intent.eventType = 'appointment';
        intent.category = 'personal';
      }
    }

    // Parse title from context
    intent.title = this.extractEventTitle(text, intent);

    // Parse time
    const timeInfo = this.parseTimeFromText(text);
    if (timeInfo.startTime) {
      intent.startTime = timeInfo.startTime;
    }
    if (timeInfo.endTime) {
      intent.endTime = timeInfo.endTime;
    }

    // Parse duration
    const duration = this.parseDurationFromText(text);
    if (duration > 0) {
      intent.duration = duration;
    }

    // Parse location
    const location = this.parseLocationFromText(text);
    if (location) {
      intent.location = location;
    }

    // Parse recurrence
    const recurrence = this.parseRecurrenceFromText(text);
    if (recurrence) {
      intent.recurrence = recurrence;
    }

    return intent;
  }

  private parseTimeFromText(text: string): { startTime?: Date; endTime?: Date } {
    const timeMatches = this.findPatternMatches(text, 'time');
    const result: { startTime?: Date; endTime?: Date } = {};

    for (const match of timeMatches) {
      const parsedTime = this.parseTimeString(match);
      if (parsedTime && !result.startTime) {
        result.startTime = parsedTime;
      }
    }

    // Handle relative time expressions
    if (text.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (result.startTime) {
        result.startTime.setFullYear(tomorrow.getFullYear());
        result.startTime.setMonth(tomorrow.getMonth());
        result.startTime.setDate(tomorrow.getDate());
      }
    }

    // Handle recurring time (e.g., "every Tuesday")
    const dayMatch = text.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const dayName = dayMatch[1].toLowerCase();
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
      const nextOccurrence = this.getNextDayOccurrence(dayIndex);
      if (!result.startTime) {
        result.startTime = nextOccurrence;
      }
    }

    return result;
  }

  private parseTimeString(timeStr: string): Date | null {
    const now = new Date();
    
    // Handle "at 3pm", "at 15:30" format
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }

      const result = new Date(now);
      result.setHours(hours, minutes, 0, 0);
      
      // If time is in the past, assume it's for tomorrow
      if (result < now) {
        result.setDate(result.getDate() + 1);
      }
      
      return result;
    }

    return null;
  }

  private parseDurationFromText(text: string): number {
    const durationMatches = this.findPatternMatches(text, 'duration');
    
    for (const match of durationMatches) {
      // Parse "1 hour", "30 minutes", etc.
      const durationMatch = match.match(/(\d+)\s*(min|mins|minutes?|hr|hrs|hours?)/i);
      if (durationMatch) {
        const value = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        
        if (unit.startsWith('h')) {
          return value * 60; // Convert hours to minutes
        } else {
          return value; // Already in minutes
        }
      }

      // Handle special cases
      if (match.includes('half an hour')) return 30;
      if (match.includes('all day')) return 8 * 60; // 8 hours
    }

    return this.preferences.defaultMeetingDuration;
  }

  private parseLocationFromText(text: string): string | null {
    const locationMatches = this.findPatternMatches(text, 'location');
    
    for (const match of locationMatches) {
      // Clean up the location string
      const cleanLocation = match
        .replace(/^(at|in the)\s+/i, '')
        .replace(/\s+(at|on|for).*$/i, '')
        .trim();
        
      if (cleanLocation.length > 0) {
        return cleanLocation;
      }
    }

    return null;
  }

  // Enhanced location resolution method
  private async resolveEventLocation(locationInput: string, eventTitle: string, eventType: string): Promise<EventLocation | null> {
    try {
      // Use location services to resolve and enhance location
      const locationData = await locationServices.resolveLocation(locationInput);
      
      // Auto-detect location type if not specified
      const detectedType = locationServices.autoDetectLocationType(eventTitle, eventType);
      
      return {
        address: locationData.address,
        coordinates: locationData.coordinates,
        name: locationData.name,
        type: (locationData.type as any) || detectedType,
        parking: locationData.parking,
        accessibility: locationData.accessibility
      };
      
    } catch (error) {
      console.error('Location resolution failed:', error);
      return {
        address: locationInput,
        coordinates: { lat: 0, lng: 0 },
        type: 'other'
      };
    }
  }

  private parseRecurrenceFromText(text: string): RecurrenceRule | null {
    const frequencyMatches = this.findPatternMatches(text, 'frequency');
    
    for (const match of frequencyMatches) {
      const matchLower = match.toLowerCase();
      
      if (matchLower.includes('every day') || matchLower.includes('daily')) {
        return { frequency: 'daily', interval: 1 };
      }
      
      if (matchLower.includes('every week') || matchLower.includes('weekly')) {
        return { frequency: 'weekly', interval: 1 };
      }
      
      // Handle "every Tuesday", "every Friday", etc.
      const dayMatch = match.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        const dayName = dayMatch[1].toLowerCase();
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
        return {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [dayIndex]
        };
      }
    }

    return null;
  }

  private extractEventTitle(text: string, intent: SchedulingIntent): string {
    // Try to extract a meaningful title from the voice input
    let title = '';

    if (intent.eventType === 'task' && intent.category === 'health') {
      const gymMatch = text.match(/(?:book|schedule|add).+?(gym|workout|exercise|yoga|run)/i);
      if (gymMatch) {
        title = gymMatch[1].charAt(0).toUpperCase() + gymMatch[1].slice(1);
      }
    } else if (intent.eventType === 'meeting') {
      const meetingMatch = text.match(/(?:book|schedule|add).+?(meeting|call|interview)/i);
      if (meetingMatch) {
        title = meetingMatch[1].charAt(0).toUpperCase() + meetingMatch[1].slice(1);
      }
    }

    // Fallback to a generic title
    if (!title) {
      title = `${intent.eventType.charAt(0).toUpperCase() + intent.eventType.slice(1)}`;
    }

    return title;
  }

  private findPatternMatches(text: string, patternType: string): string[] {
    const patterns = this.nlpPatterns.get(patternType) || [];
    const matches: string[] = [];

    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    return matches;
  }

  private getNextDayOccurrence(dayIndex: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next week
    }

    const result = new Date(today);
    result.setDate(today.getDate() + daysToAdd);
    result.setHours(9, 0, 0, 0); // Default to 9 AM
    
    return result;
  }

  private calculateConfidence(intent: SchedulingIntent, originalText: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on recognized elements
    if (intent.startTime) confidence += 0.2;
    if (intent.duration) confidence += 0.15;
    if (intent.location) confidence += 0.1;
    if (intent.title && intent.title !== 'Meeting') confidence += 0.1;
    if (intent.recurrence) confidence += 0.05;

    // Decrease confidence for ambiguous text
    const ambiguousWords = ['maybe', 'probably', 'might', 'could', 'should'];
    if (ambiguousWords.some(word => originalText.toLowerCase().includes(word))) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  private detectAmbiguities(intent: SchedulingIntent, originalText: string): string[] {
    const ambiguities: string[] = [];

    if (!intent.startTime) {
      ambiguities.push('No specific time mentioned');
    }

    if (!intent.duration && intent.eventType !== 'reminder') {
      ambiguities.push('Duration not specified');
    }

    if (intent.location && this.isLocationAmbiguous(intent.location)) {
      ambiguities.push(`Location "${intent.location}" may need clarification`);
    }

    return ambiguities;
  }

  private isLocationAmbiguous(location: string): boolean {
    const ambiguousLocations = ['there', 'here', 'usual place', 'same place'];
    return ambiguousLocations.some(amb => location.toLowerCase().includes(amb));
  }

  private async generateSuggestions(intent: SchedulingIntent, ambiguities: string[]): Promise<SchedulingSuggestion[]> {
    const suggestions: SchedulingSuggestion[] = [];

    // Time suggestions
    if (!intent.startTime || ambiguities.includes('No specific time mentioned')) {
      const timeOptions = await this.suggestAvailableTimes(intent);
      suggestions.push({
        type: 'time',
        options: timeOptions,
        reason: 'Suggest available time slots',
        confidence: 0.8
      });
    }

    // Duration suggestions
    if (!intent.duration || ambiguities.includes('Duration not specified')) {
      const durationOptions = this.suggestDurations(intent.eventType);
      suggestions.push({
        type: 'duration',
        options: durationOptions,
        reason: 'Typical durations for this event type',
        confidence: 0.7
      });
    }

    // Location suggestions
    if (!intent.location || this.isLocationAmbiguous(intent.location || '')) {
      const locationOptions = await this.suggestLocations(intent);
      suggestions.push({
        type: 'location',
        options: locationOptions,
        reason: 'Common locations for this event type',
        confidence: 0.6
      });
    }

    return suggestions;
  }

  private async suggestAvailableTimes(intent: SchedulingIntent): Promise<Date[]> {
    const suggestions: Date[] = [];
    const now = new Date();
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM

    // Suggest times for the next 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);

      // Skip weekends for work events
      if (intent.category === 'work' && (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }

      for (let hour = startHour; hour < endHour; hour += 2) {
        const timeSlot = new Date(date);
        timeSlot.setHours(hour, 0, 0, 0);

        // Check if this time slot is available
        if (await this.isTimeSlotAvailable(timeSlot, intent.duration || 60)) {
          suggestions.push(timeSlot);
        }

        if (suggestions.length >= 5) break;
      }

      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }

  private suggestDurations(eventType: string): number[] {
    const durationMap: Record<string, number[]> = {
      'meeting': [30, 60, 90],
      'appointment': [30, 60],
      'task': [60, 90, 120],
      'reminder': [5, 15, 30],
      'break': [15, 30, 60]
    };

    return durationMap[eventType] || [30, 60, 90];
  }

  private async suggestLocations(intent: SchedulingIntent): Promise<string[]> {
    const locationMap: Record<string, string[]> = {
      'health': ['Gym', 'Home', 'Park', 'Yoga Studio'],
      'work': ['Office', 'Conference Room A', 'Conference Room B', 'Virtual Meeting'],
      'personal': ['Home', 'Restaurant', 'Cafe', 'Park'],
      'social': ['Restaurant', 'Cafe', 'Park', 'Mall']
    };

    const category = intent.category || 'work';
    return locationMap[category] || ['Office', 'Home', 'Virtual Meeting'];
  }

  // Event Management Methods
  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: this.generateEventId(),
      title: eventData.title || 'New Event',
      startTime: eventData.startTime || new Date(),
      endTime: eventData.endTime || new Date(Date.now() + 60 * 60 * 1000),
      attendees: eventData.attendees || [],
      isRecurring: eventData.isRecurring || false,
      reminders: eventData.reminders || this.preferences.reminderDefaults,
      category: eventData.category || 'other',
      priority: eventData.priority || 'medium',
      status: eventData.status || 'confirmed',
      createdBy: 'smart-calendar',
      lastModified: new Date(),
      meetingType: eventData.meetingType || 'virtual',
      ...eventData
    };

    // Enhanced location resolution and travel time calculation
    if (event.location && this.preferences.autoAddTravelTime) {
      // Resolve location details
      if (typeof event.location === 'string') {
        const resolvedLocation = await this.resolveEventLocation(event.location, event.title, event.category);
        if (resolvedLocation) {
          event.location = resolvedLocation;
        }
      }
      
      // Calculate travel time
      const travelTime = await this.calculateTravelTime(event);
      if (travelTime) {
        event.travelTime = travelTime;
        // Adjust start time to account for travel
        event.startTime = new Date(event.startTime.getTime() - travelTime.estimatedDuration * 60 * 1000);
      }
    }

    // Check for conflicts
    const conflicts = await this.detectConflicts(event);
    if (conflicts.length > 0) {
      event.conflictResolution = await this.generateConflictResolutions(event, conflicts);
    }

    // Add meeting preparation if it's a work meeting
    if (event.category === 'work' && event.meetingType !== 'phone') {
      event.preparationItems = await this.generateMeetingPreparation(event);
    }

    this.events.set(event.id, event);
    this.saveEventsToStorage();

    // Trigger workflow events
    await workflowEngine.triggerEvent('calendar', {
      action: 'event_created',
      event,
      hasConflicts: conflicts.length > 0
    });

    return event;
  }

  async detectConflicts(newEvent: CalendarEvent): Promise<CalendarEvent[]> {
    const conflicts: CalendarEvent[] = [];
    
    for (const [, existingEvent] of this.events) {
      if (existingEvent.id === newEvent.id) continue;
      if (existingEvent.status === 'cancelled') continue;

      // Check for time overlap
      if (this.eventsOverlap(newEvent, existingEvent)) {
        conflicts.push(existingEvent);
      }
    }

    return conflicts;
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.startTime < event2.endTime && event2.startTime < event1.endTime;
  }

  private async generateConflictResolutions(newEvent: CalendarEvent, conflicts: CalendarEvent[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const alternatives = await this.suggestAlternativeTimes(newEvent, conflict);
      
      resolutions.push({
        conflictWith: conflict.id,
        resolutionType: 'reschedule',
        suggestedAlternatives: alternatives,
        reason: `Conflicts with "${conflict.title}" at ${conflict.startTime.toLocaleString()}`
      });
    }

    return resolutions;
  }

  private async suggestAlternativeTimes(newEvent: CalendarEvent, conflictEvent: CalendarEvent): Promise<Date[]> {
    const alternatives: Date[] = [];
    const duration = newEvent.endTime.getTime() - newEvent.startTime.getTime();
    
    // Try slots before the conflict
    const beforeSlot = new Date(conflictEvent.startTime.getTime() - duration);
    if (await this.isTimeSlotAvailable(beforeSlot, duration / (1000 * 60))) {
      alternatives.push(beforeSlot);
    }

    // Try slots after the conflict
    const afterSlot = new Date(conflictEvent.endTime);
    if (await this.isTimeSlotAvailable(afterSlot, duration / (1000 * 60))) {
      alternatives.push(afterSlot);
    }

    // Try the next day at the same time
    const nextDay = new Date(newEvent.startTime);
    nextDay.setDate(nextDay.getDate() + 1);
    if (await this.isTimeSlotAvailable(nextDay, duration / (1000 * 60))) {
      alternatives.push(nextDay);
    }

    return alternatives;
  }

  private async isTimeSlotAvailable(startTime: Date, durationMinutes: number): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    
    for (const [, event] of this.events) {
      if (event.status === 'cancelled') continue;
      
      if (startTime < event.endTime && endTime > event.startTime) {
        return false; // Overlap found
      }
    }

    return true;
  }

  // Enhanced Location and Travel Time Methods
  private async calculateTravelTime(event: CalendarEvent): Promise<TravelTimeInfo | null> {
    if (!event.location?.address) return null;

    const cacheKey = `${this.preferences.defaultLocation}-${event.location.address}`;
    
    // Check cache first
    if (this.travelTimeCache.has(cacheKey)) {
      return this.travelTimeCache.get(cacheKey)!;
    }

    try {
      // Use enhanced location services for accurate travel time
      const travelResult = await locationServices.calculateTravelTime(
        this.preferences.defaultLocation,
        event.location.address,
        'driving',
        event.startTime
      );
      
      const travelInfo: TravelTimeInfo = {
        origin: this.preferences.defaultLocation,
        destination: event.location.address,
        estimatedDuration: travelResult.duration,
        transportMode: travelResult.mode,
        departureTime: travelResult.departureTime,
        arrivalTime: travelResult.arrivalTime,
        route: travelResult.route.summary
      };

      // Cache the result
      this.travelTimeCache.set(cacheKey, travelInfo);
      
      return travelInfo;
    } catch (error) {
      console.error('Failed to calculate travel time:', error);
      return this.createFallbackTravelTime(event);
    }
  }

  private createFallbackTravelTime(event: CalendarEvent): TravelTimeInfo {
    const estimatedDuration = this.estimateTravelTime(this.preferences.defaultLocation, event.location?.address || '');
    
    return {
      origin: this.preferences.defaultLocation,
      destination: event.location?.address || '',
      estimatedDuration,
      transportMode: 'driving',
      departureTime: new Date(event.startTime.getTime() - estimatedDuration * 60 * 1000),
      arrivalTime: event.startTime,
      route: `Estimated route from ${this.preferences.defaultLocation} to ${event.location?.address}`
    };
  }

  private estimateTravelTime(origin: string, destination: string): number {
    // Simple estimation based on location type and distance
    const gymLocations = ['gym', 'fitness', 'yoga'];
    const officeLocations = ['office', 'work', 'building'];
    
    const destLower = destination.toLowerCase();
    
    if (gymLocations.some(term => destLower.includes(term))) {
      return 15; // 15 minutes to gym
    }
    
    if (officeLocations.some(term => destLower.includes(term))) {
      return 20; // 20 minutes to office
    }
    
    if (destLower.includes('home')) {
      return 0; // Already at home
    }
    
    return 25; // Default 25 minutes
  }

  // Enhanced Meeting Preparation Methods
  private async generateMeetingPreparation(event: CalendarEvent): Promise<PreparationItem[]> {
    try {
      // Use the enhanced meeting preparation service
      const attendeeEmails = event.attendees.map(a => a.email);
      const preparationItems = await meetingPreparationService.prepareMeeting(
        event.title,
        attendeeEmails,
        event.startTime,
        event.description
      );

      // Convert to the existing PreparationItem format
      return preparationItems.map(item => ({
        type: item.type,
        title: item.title,
        content: item.content || '',
        url: item.url,
        priority: item.priority,
        completed: item.completed
      }));

    } catch (error) {
      console.error('Enhanced meeting preparation failed, using fallback:', error);
      return this.generateFallbackMeetingPreparation(event);
    }
  }

  private generateFallbackMeetingPreparation(event: CalendarEvent): PreparationItem[] {
    const items: PreparationItem[] = [];

    // Add agenda preparation
    items.push({
      type: 'task',
      title: 'Prepare meeting agenda',
      content: `Create agenda for "${event.title}"`,
      priority: 'high',
      completed: false
    });

    // Add document gathering
    items.push({
      type: 'document',
      title: 'Gather relevant documents',
      content: 'Collect and review documents related to the meeting topic',
      priority: 'medium',
      completed: false
    });

    // Add email review if attendees are present
    if (event.attendees.length > 0) {
      items.push({
        type: 'email',
        title: 'Review recent emails',
        content: `Review email threads with ${event.attendees.map(a => a.name).join(', ')}`,
        priority: 'medium',
        completed: false
      });
    }

    // Add contact information
    items.push({
      type: 'contact',
      title: 'Update contact information',
      content: 'Ensure all attendee contact details are current',
      priority: 'low',
      completed: false
    });

    return items;
  }

  // Utility Methods
  private generateEventId(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveEventsToStorage(): void {
    try {
      const eventsArray = Array.from(this.events.entries()).map(([id, event]) => [
        id,
        {
          ...event,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          lastModified: event.lastModified.toISOString()
        }
      ]);
      localStorage.setItem('smart_calendar_events', JSON.stringify(eventsArray));
    } catch (error) {
      console.error('Failed to save events to storage:', error);
    }
  }

  private loadEventsFromStorage(): void {
    try {
      const stored = localStorage.getItem('smart_calendar_events');
      if (stored) {
        const eventsArray = JSON.parse(stored);
        this.events = new Map(eventsArray.map(([id, event]: [string, any]) => [
          id,
          {
            ...event,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            lastModified: new Date(event.lastModified)
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load events from storage:', error);
    }
  }

  // Enhanced public method to check time slot availability
  async checkTimeSlotAvailability(startTime: Date, durationMinutes: number): Promise<boolean> {
    return this.isTimeSlotAvailable(startTime, durationMinutes);
  }

  // Method to suggest available times with better filtering
  async getAvailableTimeSlots(intent: SchedulingIntent): Promise<Date[]> {
    return this.suggestAvailableTimes(intent);
  }

  // Public API Methods
  getEvents(startDate?: Date, endDate?: Date): CalendarEvent[] {
    const events = Array.from(this.events.values());
    
    if (!startDate && !endDate) {
      return events;
    }

    return events.filter(event => {
      if (startDate && event.endTime < startDate) return false;
      if (endDate && event.startTime > endDate) return false;
      return true;
    });
  }

  getEvent(id: string): CalendarEvent | null {
    return this.events.get(id) || null;
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const event = this.events.get(id);
    if (!event) return null;

    const updatedEvent = {
      ...event,
      ...updates,
      lastModified: new Date()
    };

    this.events.set(id, updatedEvent);
    this.saveEventsToStorage();

    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const deleted = this.events.delete(id);
    if (deleted) {
      this.saveEventsToStorage();
    }
    return deleted;
  }

  getPreferences(): CalendarPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<CalendarPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    localStorage.setItem('smart_calendar_preferences', JSON.stringify(this.preferences));
  }
}

// Create singleton instance
export const smartCalendar = new SmartCalendarEngine();