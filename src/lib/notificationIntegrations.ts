// Integration layer for Smart Notifications with existing systems
// Connects email, calendar, and other services to the notification engine

import { smartNotificationEngine } from './smartNotifications';
import { smartCalendar } from './smartCalendar';

export class NotificationIntegrations {
  private emailPollingInterval: NodeJS.Timeout | null = null;
  private calendarPollingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.initializeIntegrations();
  }

  private initializeIntegrations(): void {
    // Start monitoring various data sources
    this.startEmailMonitoring();
    this.startCalendarMonitoring();
    this.setupEventListeners();
  }

  // Email Integration
  private startEmailMonitoring(): void {
    // Poll for new emails every 30 seconds
    this.emailPollingInterval = setInterval(() => {
      this.checkForNewEmails();
    }, 30000);
  }

  private async checkForNewEmails(): Promise<void> {
    try {
      // This would integrate with the existing email API
      const response = await fetch('/api/email/messages?unread=true');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.data?.messages) return;

      // Process new emails for notifications
      for (const email of data.data.messages) {
        if (this.isNewEmail(email)) {
          await this.processEmailNotification(email);
        }
      }
    } catch (error) {
      console.error('Email monitoring error:', error);
    }
  }

  private isNewEmail(email: any): boolean {
    // Check if we've already processed this email
    const processed = localStorage.getItem('processed_emails') || '[]';
    const processedIds = JSON.parse(processed);
    return !processedIds.includes(email.id);
  }

  private async processEmailNotification(email: any): Promise<void> {
    // Determine priority based on sender and content
    const priority = this.determineEmailPriority(email);
    const vipLevel = this.determineEmailVIPLevel(email);

    // Create smart notification
    await smartNotificationEngine.createNotification({
      type: 'email',
      priority,
      vipLevel,
      title: `📧 ${email.from}`,
      message: email.subject,
      context: {
        source: 'email',
        category: 'communication',
        urgency: this.calculateEmailUrgency(email),
        isTimesensitive: this.isEmailTimeSensitive(email)
      },
      metadata: {
        emailId: email.id,
        fromEmail: email.from,
        subject: email.subject,
        snippet: email.snippet
      },
      actions: [
        {
          id: 'reply',
          label: 'Reply',
          action: 'reply',
          payload: { emailId: email.id }
        },
        {
          id: 'mark_read',
          label: 'Mark Read',
          action: 'custom',
          payload: { action: 'mark_read', emailId: email.id }
        }
      ]
    });

    // Mark as processed
    this.markEmailAsProcessed(email.id);
  }

  private determineEmailPriority(email: any): 'critical' | 'high' | 'medium' | 'low' {
    const subject = email.subject?.toLowerCase() || '';
    const from = email.from?.toLowerCase() || '';

    // Critical keywords
    if (subject.includes('urgent') || subject.includes('emergency') || subject.includes('asap')) {
      return 'critical';
    }

    // High priority senders (boss, clients)
    const vipContacts = smartNotificationEngine.getVIPContacts();
    const vipContact = vipContacts.find(c => from.includes(c.email.toLowerCase()));
    
    if (vipContact) {
      if (vipContact.relationship === 'emergency') return 'critical';
      if (vipContact.relationship === 'boss' || vipContact.priority === 'vip') return 'high';
      return 'medium';
    }

    // Important keywords
    if (subject.includes('important') || subject.includes('meeting') || subject.includes('deadline')) {
      return 'high';
    }

    // Check if it's a reply to a recent email
    if (subject.includes('re:') || subject.includes('fwd:')) {
      return 'medium';
    }

    return 'low';
  }

  private determineEmailVIPLevel(email: any): 'none' | 'important' | 'vip' | 'emergency' {
    const from = email.from?.toLowerCase() || '';
    const vipContacts = smartNotificationEngine.getVIPContacts();
    const vipContact = vipContacts.find(c => from.includes(c.email.toLowerCase()));
    
    if (vipContact) {
      if (vipContact.relationship === 'emergency') return 'emergency';
      if (vipContact.priority === 'vip') return 'vip';
      return 'important';
    }

    return 'none';
  }

  private calculateEmailUrgency(email: any): number {
    let urgency = 5; // Base urgency

    const subject = email.subject?.toLowerCase() || '';
    
    // Urgency keywords
    if (subject.includes('urgent')) urgency += 3;
    if (subject.includes('asap')) urgency += 4;
    if (subject.includes('emergency')) urgency += 5;
    if (subject.includes('important')) urgency += 2;
    if (subject.includes('deadline')) urgency += 2;

    return Math.min(urgency, 10);
  }

  private isEmailTimeSensitive(email: any): boolean {
    const subject = email.subject?.toLowerCase() || '';
    const timeSensitiveKeywords = [
      'meeting', 'appointment', 'deadline', 'today', 'tomorrow', 
      'urgent', 'asap', 'time-sensitive', 'expires'
    ];
    
    return timeSensitiveKeywords.some(keyword => subject.includes(keyword));
  }

  private markEmailAsProcessed(emailId: string): void {
    const processed = localStorage.getItem('processed_emails') || '[]';
    const processedIds = JSON.parse(processed);
    processedIds.push(emailId);
    
    // Keep only last 1000 processed emails
    if (processedIds.length > 1000) {
      processedIds.splice(0, processedIds.length - 1000);
    }
    
    localStorage.setItem('processed_emails', JSON.stringify(processedIds));
  }

  // Calendar Integration
  private startCalendarMonitoring(): void {
    // Check calendar events every 5 minutes
    this.calendarPollingInterval = setInterval(() => {
      this.checkCalendarEvents();
    }, 5 * 60 * 1000);
  }

  private async checkCalendarEvents(): Promise<void> {
    try {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Get upcoming events
      const events = smartCalendar.getEvents(now, nextHour);
      
      for (const event of events) {
        await this.processCalendarNotifications(event);
      }
    } catch (error) {
      console.error('Calendar monitoring error:', error);
    }
  }

  private async processCalendarNotifications(event: any): Promise<void> {
    const now = new Date();
    const eventStart = new Date(event.startTime);
    const minutesUntilEvent = Math.floor((eventStart.getTime() - now.getTime()) / (1000 * 60));

    // 15-minute warning for meetings
    if (minutesUntilEvent === 15 && !this.hasNotifiedForEvent(event.id, '15min')) {
      await smartNotificationEngine.createNotification({
        type: 'calendar',
        priority: 'medium',
        title: '📅 Meeting in 15 minutes',
        message: `"${event.title}" starts at ${eventStart.toLocaleTimeString()}`,
        context: {
          source: 'calendar',
          category: 'meeting_reminder',
          urgency: 7,
          isTimesensitive: true,
          relatedEvents: [event.id]
        },
        metadata: {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.startTime
        },
        actions: [
          {
            id: 'join',
            label: 'Join Meeting',
            action: 'custom',
            payload: { meetingUrl: event.conferenceData?.url }
          },
          {
            id: 'snooze',
            label: 'Remind in 5 min',
            action: 'snooze',
            payload: { minutes: 5 }
          }
        ]
      });

      this.markEventNotified(event.id, '15min');
    }

    // 5-minute urgent warning
    if (minutesUntilEvent === 5 && !this.hasNotifiedForEvent(event.id, '5min')) {
      await smartNotificationEngine.createNotification({
        type: 'calendar',
        priority: 'high',
        title: '🚨 Meeting starting soon!',
        message: `"${event.title}" starts in 5 minutes`,
        context: {
          source: 'calendar',
          category: 'meeting_urgent',
          urgency: 9,
          isTimesensitive: true,
          relatedEvents: [event.id]
        },
        metadata: {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.startTime
        },
        actions: [
          {
            id: 'join',
            label: 'Join Now',
            action: 'custom',
            payload: { meetingUrl: event.conferenceData?.url }
          }
        ]
      });

      this.markEventNotified(event.id, '5min');
    }

    // Travel time notifications
    if (event.travelTime && minutesUntilEvent === event.travelTime.estimatedDuration + 5) {
      await smartNotificationEngine.createNotification({
        type: 'traffic',
        priority: 'high',
        title: '🚗 Time to leave!',
        message: `Leave now for "${event.title}". ${event.travelTime.estimatedDuration} min travel time.`,
        context: {
          source: 'travel',
          category: 'departure',
          urgency: 8,
          isTimesensitive: true,
          traffic: {
            route: event.travelTime.route,
            condition: 'light', // Corrected from 'normal'
            delayMinutes: event.travelTime.estimatedDuration,
            suggestion: `Leave now to arrive on time`
          }
        },
        actions: [
          {
            id: 'navigate',
            label: 'Get Directions',
            action: 'navigate',
            payload: { destination: event.location?.address }
          }
        ]
      });
    }
  }

  private hasNotifiedForEvent(eventId: string, type: string): boolean {
    const key = `${eventId}_${type}`;
    const notified = localStorage.getItem('event_notifications') || '{}';
    const notifiedEvents = JSON.parse(notified);
    return notifiedEvents[key] === true;
  }

  private markEventNotified(eventId: string, type: string): void {
    const key = `${eventId}_${type}`;
    const notified = localStorage.getItem('event_notifications') || '{}';
    const notifiedEvents = JSON.parse(notified);
    notifiedEvents[key] = true;
    
    // Clean up old notifications (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(notifiedEvents).forEach(notifKey => {
      if (notifKey.includes('_') && parseInt(notifKey.split('_')[1]) < oneDayAgo) {
        delete notifiedEvents[notifKey];
      }
    });
    
    localStorage.setItem('event_notifications', JSON.stringify(notifiedEvents));
  }

  // Event Listeners Setup
  private setupEventListeners(): void {
    // Listen for calendar events from smart calendar
    window.addEventListener('calendarEventCreated', (event: any) => {
      this.handleCalendarEventCreated(event.detail);
    });

    // Listen for email events
    window.addEventListener('emailReceived', (event: any) => {
      this.processEmailNotification(event.detail);
    });

    // Listen for workflow events
    window.addEventListener('workflowTriggered', (event: any) => {
      this.handleWorkflowNotification(event.detail);
    });
  }

  private async handleCalendarEventCreated(eventData: any): Promise<void> {
    if (eventData.conflictResolution && eventData.conflictResolution.length > 0) {
      await smartNotificationEngine.createNotification({
        type: 'calendar',
        priority: 'medium',
        title: '⚠️ Event created with conflicts',
        message: `"${eventData.title}" has ${eventData.conflictResolution.length} potential conflicts`,
        context: {
          source: 'calendar',
          category: 'conflict_warning',
          urgency: 6,
          isTimesensitive: false
        },
        metadata: {
          eventId: eventData.id,
          conflicts: eventData.conflictResolution
        }
      });
    }

    if (eventData.travelTime) {
      await smartNotificationEngine.createNotification({
        type: 'calendar',
        priority: 'low',
        title: '🚗 Travel time added',
        message: `${eventData.travelTime.estimatedDuration} min travel time calculated for "${eventData.title}"`,
        context: {
          source: 'calendar',
          category: 'travel_info',
          urgency: 3,
          isTimesensitive: false
        }
      });
    }
  }

  private async handleWorkflowNotification(workflowData: any): Promise<void> {
    await smartNotificationEngine.createNotification({
      type: 'system',
      priority: workflowData.priority || 'medium',
      title: `🔄 ${workflowData.workflowName}`,
      message: workflowData.message || 'Workflow completed',
      context: {
        source: 'workflow',
        category: 'automation',
        urgency: 5,
        isTimesensitive: false
      },
      metadata: {
        workflowId: workflowData.id,
        workflowName: workflowData.workflowName
      }
    });
  }

  // Public methods for manual integration
  async createEmailNotification(emailData: any): Promise<void> {
    await this.processEmailNotification(emailData);
  }

  async createCalendarNotification(eventData: any): Promise<void> {
    await this.processCalendarNotifications(eventData);
  }

  async createTrafficAlert(route: string, delayMinutes: number, destination: string): Promise<void> {
    await smartNotificationEngine.createNotification({
      type: 'traffic',
      priority: delayMinutes > 20 ? 'high' : 'medium',
      title: '🚗 Traffic Alert',
      message: `Heavy traffic on ${route}. ${delayMinutes} min delay expected.`,
      context: {
        source: 'traffic',
        category: 'travel',
        urgency: delayMinutes > 20 ? 8 : 6,
        isTimesensitive: true,
        traffic: {
          route,
          condition: delayMinutes > 30 ? 'heavy' : 'moderate',
          delayMinutes,
          suggestion: `Consider leaving ${Math.ceil(delayMinutes / 5) * 5} minutes early`
        }
      },
      actions: [
        {
          id: 'navigate',
          label: 'Alternative Route',
          action: 'navigate',
          payload: { destination }
        }
      ]
    });
  }

  async createWeatherAlert(condition: string, severity: 'mild' | 'moderate' | 'severe', alert: string): Promise<void> {
    await smartNotificationEngine.createNotification({
      type: 'weather',
      priority: severity === 'severe' ? 'high' : 'medium',
      title: `🌦️ Weather Alert`,
      message: alert,
      context: {
        source: 'weather',
        category: 'safety',
        urgency: severity === 'severe' ? 9 : 6,
        isTimesensitive: true,
        weather: {
          condition: condition as any,
          temperature: 0,
          severity,
          alert
        }
      }
    });
  }

  // Cleanup
  cleanup(): void {
    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
    }
    if (this.calendarPollingInterval) {
      clearInterval(this.calendarPollingInterval);
    }
    
    smartNotificationEngine.cleanup();
  }
}

// Create singleton instance
export const notificationIntegrations = new NotificationIntegrations();