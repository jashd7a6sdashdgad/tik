// Smart Notifications System - Priority-based, context-aware notifications
// Intelligent notification management with meeting awareness and contextual alerts

export interface SmartNotification {
  id: string;
  type: 'email' | 'calendar' | 'traffic' | 'weather' | 'contact' | 'task' | 'system';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: Date;
  scheduledFor?: Date;
  context: NotificationContext;
  actions?: NotificationAction[];
  metadata: Record<string, any>;
  status: 'pending' | 'delivered' | 'dismissed' | 'snoozed' | 'expired';
  deliveryChannel: 'push' | 'email' | 'sms' | 'in_app' | 'voice';
  vipLevel?: 'none' | 'important' | 'vip' | 'emergency';
}

export interface NotificationContext {
  source: string;
  category: string;
  urgency: number; // 1-10 scale
  isTimesensitive: boolean;
  isTimeAttribute?: boolean;
  expiresAt?: Date;
  relatedEvents?: string[];
  location?: string;
  weather?: WeatherCondition;
  traffic?: TrafficCondition;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: 'dismiss' | 'snooze' | 'reply' | 'call' | 'navigate' | 'reschedule' | 'custom';
  payload?: any;
}

export interface UserContext {
  currentActivity: 'available' | 'in_meeting' | 'do_not_disturb' | 'driving' | 'sleeping';
  location: string;
  nextMeeting?: Date;
  preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  allowDuringMeetings: boolean;
  quietHours: { start: string; end: string };
  vipAlwaysThrough: boolean;
  priorityThreshold: 'critical' | 'high' | 'medium' | 'low';
  channelPreferences: Record<string, string[]>;
  contextualAlertsEnabled: boolean;
  trafficAlertsEnabled: boolean;
  weatherAlertsEnabled: boolean;
}

export interface WeatherCondition {
  condition: 'clear' | 'rain' | 'snow' | 'storm' | 'fog' | 'extreme';
  temperature: number;
  severity: 'mild' | 'moderate' | 'severe';
  alert?: string;
}

export interface TrafficCondition {
  route: string;
  condition: 'light' | 'moderate' | 'heavy' | 'blocked';
  delayMinutes: number;
  suggestion: string;
}

export interface VIPContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: 'family' | 'boss' | 'client' | 'emergency' | 'colleague';
  priority: 'vip' | 'important';
  alwaysAllow: boolean;
  customRules?: ContactRule[];
}

export interface ContactRule {
  condition: string;
  action: 'allow' | 'prioritize' | 'defer' | 'block';
  timeWindow?: { start: string; end: string };
}

export class SmartNotificationEngine {
  private notifications: Map<string, SmartNotification> = new Map();
  private vipContacts: Map<string, VIPContact> = new Map();
  private userContext: UserContext;
  private preferences: NotificationPreferences;
  private contextUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.userContext = this.getDefaultUserContext();
    this.loadVIPContacts();
    this.startContextMonitoring();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      allowDuringMeetings: false,
      quietHours: { start: '22:00', end: '07:00' },
      vipAlwaysThrough: true,
      priorityThreshold: 'medium',
      channelPreferences: {
        critical: ['push', 'voice', 'sms'],
        high: ['push', 'in_app'],
        medium: ['in_app'],
        low: ['in_app']
      },
      contextualAlertsEnabled: true,
      trafficAlertsEnabled: true,
      weatherAlertsEnabled: true
    };
  }

  private getDefaultUserContext(): UserContext {
    return {
      currentActivity: 'available',
      location: 'home',
      preferences: this.preferences
    };
  }

  private loadVIPContacts(): void {
    try {
      const stored = localStorage.getItem('smart_notification_vips');
      if (stored) {
        const contacts = JSON.parse(stored);
        this.vipContacts = new Map(contacts);
      } else {
        // Default VIP contacts
        this.addDefaultVIPContacts();
      }
    } catch (error) {
      console.error('Failed to load VIP contacts:', error);
      this.addDefaultVIPContacts();
    }
  }

  private addDefaultVIPContacts(): void {
    // Add some default VIP examples
    this.vipContacts.set('boss@company.com', {
      id: 'boss@company.com',
      name: 'Manager',
      email: 'boss@company.com',
      relationship: 'boss',
      priority: 'vip',
      alwaysAllow: true
    });
  }

  private startContextMonitoring(): void {
    // Update context every 30 seconds
    this.contextUpdateInterval = setInterval(() => {
      this.updateUserContext();
    }, 30000);
  }

  private async updateUserContext(): Promise<void> {
    try {
      // Check if user is currently in a meeting
      const now = new Date();
      const nextMeeting = await this.getNextMeeting(now);
      
      if (nextMeeting && this.isInMeeting(now, nextMeeting)) {
        this.userContext.currentActivity = 'in_meeting';
      } else if (this.isQuietHours(now)) {
        this.userContext.currentActivity = 'sleeping';
      } else {
        this.userContext.currentActivity = 'available';
      }

      this.userContext.nextMeeting = nextMeeting?.startTime;

      // Generate contextual notifications
      await this.generateContextualNotifications();
      
    } catch (error) {
      console.error('Context update failed:', error);
    }
  }

  // Core notification methods
  async createNotification(data: Partial<SmartNotification>): Promise<SmartNotification> {
    const notification: SmartNotification = {
      id: this.generateNotificationId(),
      type: data.type || 'system',
      priority: data.priority || 'medium',
      title: data.title || 'New Notification',
      message: data.message || '',
      timestamp: new Date(),
      context: data.context || {
        source: 'system',
        category: 'general',
        urgency: 5,
        isTimesensitive: false
      },
      metadata: data.metadata || {},
      status: 'pending',
      deliveryChannel: data.deliveryChannel || 'in_app',
      vipLevel: this.determineVIPLevel(data),
      ...data
    };

    // Apply intelligent scheduling
    await this.scheduleNotification(notification);
    
    this.notifications.set(notification.id, notification);
    return notification;
  }

  private async scheduleNotification(notification: SmartNotification): Promise<void> {
    const deliveryTime = await this.calculateOptimalDeliveryTime(notification);
    
    if (deliveryTime > new Date()) {
      notification.scheduledFor = deliveryTime;
      notification.status = 'pending';
      
      // Schedule delivery
      setTimeout(() => {
        this.deliverNotification(notification.id);
      }, deliveryTime.getTime() - Date.now());
    } else {
      // Deliver immediately if conditions are right
      await this.deliverNotification(notification.id);
    }
  }

  private async calculateOptimalDeliveryTime(notification: SmartNotification): Promise<Date> {
    const now = new Date();
    
    // Critical and VIP notifications - deliver immediately unless absolutely necessary to delay
    if (notification.priority === 'critical' || notification.vipLevel === 'emergency') {
      return now;
    }

    // VIP notifications during meetings - still deliver but maybe with different channel
    if (notification.vipLevel === 'vip' && this.preferences.vipAlwaysThrough) {
      return now;
    }

    // Check if user is in meeting
    if (this.userContext.currentActivity === 'in_meeting' && !this.preferences.allowDuringMeetings) {
      const nextMeeting = await this.getNextMeeting(now);
      if (nextMeeting && nextMeeting.endTime) {
        // Schedule for after meeting
        return new Date(nextMeeting.endTime.getTime() + 5 * 60 * 1000); // 5 minutes after meeting
      }
    }

    // Check quiet hours
    if (this.isQuietHours(now) && (notification.priority === 'medium' || notification.priority === 'low')) {
      const quietEnd = this.getQuietHoursEnd(now);
      return quietEnd;
    }

    // Check if it's a contextual notification that should be timed perfectly
    if (notification.type === 'traffic' && notification.context.isTimeAttribute) {
      // Traffic notifications should be delivered at optimal departure time
      return this.calculateTrafficNotificationTime(notification);
    }

    return now; // Deliver immediately
  }

  private async deliverNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== 'pending') return;

    try {
      // Choose delivery channel based on context and priority
      const channel = this.selectOptimalChannel(notification);
      
      // Deliver via selected channel
      await this.deliverViaChannel(notification, channel);
      
      notification.status = 'delivered';
      notification.deliveryChannel = channel;
      
      // Trigger UI update
      this.notifyUI(notification);
      
    } catch (error) {
      console.error('Notification delivery failed:', error);
      notification.status = 'expired';
    }
  }

  private selectOptimalChannel(notification: SmartNotification): 'push' | 'email' | 'sms' | 'in_app' | 'voice' {
    const preferredChannels = this.preferences.channelPreferences[notification.priority] || ['in_app'];
    
    // During meetings, use less intrusive channels
    if (this.userContext.currentActivity === 'in_meeting') {
      return 'in_app'; // Least intrusive
    }

    // Critical notifications should use the most attention-grabbing channel
    if (notification.priority === 'critical') {
      return 'push'; // Most noticeable
    }

    // VIP notifications get priority channels
    if (notification.vipLevel === 'vip') {
      return 'push';
    }

    return preferredChannels[0] as any || 'in_app';
  }

  private async deliverViaChannel(notification: SmartNotification, channel: string): Promise<void> {
    switch (channel) {
      case 'push':
        await this.sendPushNotification(notification);
        break;
      case 'in_app':
        await this.showInAppNotification(notification);
        break;
      case 'voice':
        await this.announceVoiceNotification(notification);
        break;
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
    }
  }

  // Contextual notification generation
  private async generateContextualNotifications(): Promise<void> {
    if (!this.preferences.contextualAlertsEnabled) return;

    try {
      // Generate traffic notifications
      if (this.preferences.trafficAlertsEnabled) {
        await this.generateTrafficNotifications();
      }

      // Generate weather notifications
      if (this.preferences.weatherAlertsEnabled) {
        await this.generateWeatherNotifications();
      }

      // Generate meeting preparation notifications
      await this.generateMeetingPrepNotifications();

    } catch (error) {
      console.error('Contextual notification generation failed:', error);
    }
  }

  private async generateTrafficNotifications(): Promise<void> {
    const nextMeeting = await this.getNextMeeting(new Date());
    if (!nextMeeting || !nextMeeting.location) return;

    const now = new Date();
    const meetingTime = nextMeeting.startTime;
    const timeUntilMeeting = meetingTime.getTime() - now.getTime();

    // Generate traffic notification 30-60 minutes before meeting
    if (timeUntilMeeting > 30 * 60 * 1000 && timeUntilMeeting < 90 * 60 * 1000) {
      const trafficCondition = await this.getTrafficCondition(
        this.userContext.location,
        nextMeeting.location
      );

      if (trafficCondition.condition === 'heavy' || trafficCondition.delayMinutes > 15) {
        await this.createNotification({
          type: 'traffic',
          priority: 'high',
          title: '🚗 Traffic Alert',
          message: `Traffic is ${trafficCondition.condition} to ${nextMeeting.title}. ${trafficCondition.suggestion}`,
          context: {
            source: 'traffic_service',
            category: 'travel',
            urgency: 8,
            isTimesensitive: true,
            isTimeAttribute: true,
            traffic: trafficCondition
          },
          actions: [
            {
              id: 'navigate',
              label: 'Get Directions',
              action: 'navigate',
              payload: { destination: nextMeeting.location }
            },
            {
              id: 'reschedule',
              label: 'Reschedule Meeting',
              action: 'reschedule',
              payload: { eventId: nextMeeting.id }
            }
          ]
        });
      }
    }
  }

  private async generateWeatherNotifications(): Promise<void> {
    const weather = await this.getCurrentWeather();
    
    if (weather.condition === 'storm' || weather.condition === 'extreme') {
      await this.createNotification({
        type: 'weather',
        priority: weather.severity === 'severe' ? 'high' : 'medium',
        title: '🌦️ Weather Alert',
        message: weather.alert || `${weather.condition} conditions detected`,
        context: {
          source: 'weather_service',
          category: 'safety',
          urgency: weather.severity === 'severe' ? 9 : 6,
          isTimesensitive: true,
          isTimeAttribute: true,
          weather
        }
      });
    }
  }

  private async generateMeetingPrepNotifications(): Promise<void> {
    const nextMeeting = await this.getNextMeeting(new Date());
    if (!nextMeeting) return;

    const now = new Date();
    const timeUntilMeeting = nextMeeting.startTime.getTime() - now.getTime();

    // 15 minutes before meeting - final prep reminder
    if (timeUntilMeeting > 10 * 60 * 1000 && timeUntilMeeting < 20 * 60 * 1000) {
      await this.createNotification({
        type: 'calendar',
        priority: 'medium',
        title: '📅 Meeting in 15 minutes',
        message: `"${nextMeeting.title}" starts soon. Ready to join?`,
        context: {
          source: 'calendar',
          category: 'meeting_prep',
          urgency: 7,
          isTimesensitive: true,
          isTimeAttribute: true,
          relatedEvents: [nextMeeting.id]
        },
        actions: [
          {
            id: 'join',
            label: 'Join Meeting',
            action: 'custom',
            payload: { meetingUrl: nextMeeting.conferenceData?.url }
          },
          {
            id: 'snooze',
            label: 'Remind in 5 min',
            action: 'snooze',
            payload: { minutes: 5 }
          }
        ]
      });
    }
  }

  // VIP Contact Management
  addVIPContact(contact: Omit<VIPContact, 'id'>): VIPContact {
    const vipContact: VIPContact = {
      id: contact.email,
      ...contact
    };
    
    this.vipContacts.set(vipContact.id, vipContact);
    this.saveVIPContacts();
    return vipContact;
  }

  removeVIPContact(contactId: string): boolean {
    const removed = this.vipContacts.delete(contactId);
    if (removed) {
      this.saveVIPContacts();
    }
    return removed;
  }

  private determineVIPLevel(data: Partial<SmartNotification>): 'none' | 'important' | 'vip' | 'emergency' {
    // Check if from VIP contact
    if (data.metadata?.fromEmail) {
      const vip = this.vipContacts.get(data.metadata.fromEmail);
      if (vip) {
        if (vip.relationship === 'emergency') return 'emergency';
        if (vip.priority === 'vip') return 'vip';
        return 'important';
      }
    }

    // Check urgency keywords
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediate', 'critical'];
    const text = `${data.title} ${data.message}`.toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'important';
    }

    return 'none';
  }

  // Utility methods
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getNextMeeting(from: Date): Promise<any> {
    // This would integrate with the smart calendar
    try {
      // Mock implementation - would use smartCalendar.getEvents()
      const events: any[] = []; // await smartCalendar.getEvents(from, new Date(from.getTime() + 24 * 60 * 60 * 1000));
      return events.find(event => event.startTime > from) || null;
    } catch (error) {
      return null;
    }
  }

  private isInMeeting(now: Date, meeting: any): boolean {
    return now >= meeting.startTime && now <= meeting.endTime;
  }

  private isQuietHours(now: Date): boolean {
    const hour = now.getHours();
    const startHour = parseInt(this.preferences.quietHours.start.split(':')[0]);
    const endHour = parseInt(this.preferences.quietHours.end.split(':')[0]);
    
    if (startHour > endHour) {
      // Overnight quiet hours (e.g., 22:00 to 07:00)
      return hour >= startHour || hour < endHour;
    } else {
      // Daytime quiet hours (e.g., 14:00 to 16:00)
      return hour >= startHour && hour < endHour;
    }
  }

  private getQuietHoursEnd(now: Date): Date {
    const endTime = new Date(now);
    const endHour = parseInt(this.preferences.quietHours.end.split(':')[0]);
    const endMinute = parseInt(this.preferences.quietHours.end.split(':')[1]);
    
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // If end time is before current time, it's next day
    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return endTime;
  }

  private calculateTrafficNotificationTime(notification: SmartNotification): Date {
    const traffic = notification.context.traffic;
    if (!traffic) return new Date();

    // Calculate optimal departure time based on traffic
    const baseTime = new Date();
    const departureTime = new Date(baseTime.getTime() + traffic.delayMinutes * 60 * 1000);
    
    // Notify 15 minutes before suggested departure
    return new Date(departureTime.getTime() - 15 * 60 * 1000);
  }

  private async getTrafficCondition(origin: string, destination: string): Promise<TrafficCondition> {
    // Mock implementation - would integrate with real traffic API
    const conditions: TrafficCondition[] = [
      {
        route: `${origin} to ${destination}`,
        condition: 'heavy',
        delayMinutes: 20,
        suggestion: 'Leave 15 minutes early to avoid delays'
      },
      {
        route: `${origin} to ${destination}`,
        condition: 'moderate',
        delayMinutes: 10,
        suggestion: 'Normal travel time expected'
      }
    ];
    
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private async getCurrentWeather(): Promise<WeatherCondition> {
    // Mock implementation - would integrate with weather API
    return {
      condition: 'clear',
      temperature: 22,
      severity: 'mild'
    };
  }

  // Delivery channel implementations
  private async sendPushNotification(notification: SmartNotification): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        tag: notification.id,
        requireInteraction: notification.priority === 'critical'
      });
    }
  }

  private async showInAppNotification(notification: SmartNotification): Promise<void> {
    // This would trigger the UI notification system
    this.notifyUI(notification);
  }

  private async announceVoiceNotification(notification: SmartNotification): Promise<void> {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `${notification.title}. ${notification.message}`
      );
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  }

  private async sendEmailNotification(notification: SmartNotification): Promise<void> {
    // Would integrate with email service
    console.log('Email notification sent:', notification);
  }

  private async sendSMSNotification(notification: SmartNotification): Promise<void> {
    // Would integrate with SMS service
    console.log('SMS notification sent:', notification);
  }

  private getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      email: '📧',
      calendar: '📅',
      traffic: '🚗',
      weather: '🌦️',
      contact: '👤',
      task: '✅',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  }

  private notifyUI(notification: SmartNotification): void {
    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('smartNotification', {
      detail: notification
    }));
  }

  private saveVIPContacts(): void {
    try {
      const contacts = Array.from(this.vipContacts.entries());
      localStorage.setItem('smart_notification_vips', JSON.stringify(contacts));
    } catch (error) {
      console.error('Failed to save VIP contacts:', error);
    }
  }

  // Public API methods
  getNotifications(filter?: { status?: string; priority?: string; type?: string }): SmartNotification[] {
    let notifications = Array.from(this.notifications.values());
    
    if (filter) {
      if (filter.status) {
        notifications = notifications.filter(n => n.status === filter.status);
      }
      if (filter.priority) {
        notifications = notifications.filter(n => n.priority === filter.priority);
      }
      if (filter.type) {
        notifications = notifications.filter(n => n.type === filter.type);
      }
    }
    
    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  dismissNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'dismissed';
      return true;
    }
    return false;
  }

  snoozeNotification(notificationId: string, minutes: number): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'snoozed';
      notification.scheduledFor = new Date(Date.now() + minutes * 60 * 1000);
      
      // Reschedule delivery
      setTimeout(() => {
        this.deliverNotification(notificationId);
      }, minutes * 60 * 1000);
      
      return true;
    }
    return false;
  }

  updatePreferences(updates: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    localStorage.setItem('smart_notification_preferences', JSON.stringify(this.preferences));
  }

  getVIPContacts(): VIPContact[] {
    return Array.from(this.vipContacts.values());
  }

  cleanup(): void {
    if (this.contextUpdateInterval) {
      clearInterval(this.contextUpdateInterval);
    }
  }
}

// Create singleton instance
export const smartNotificationEngine = new SmartNotificationEngine();