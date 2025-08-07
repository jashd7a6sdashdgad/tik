// Workflow Integration Services - Connect workflows with external systems

import { workflowEngine } from './workflowEngine';

export interface EmailIntegration {
  checkEmails(): Promise<any[]>;
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}

export interface CalendarIntegration {
  getEvents(startDate: Date, endDate: Date): Promise<any[]>;
  createEvent(event: any): Promise<any>;
  findFreeTime(duration: number): Promise<Date[]>;
}

export interface FileIntegration {
  watchDirectory(path: string): void;
  backupFiles(source: string, destination: string): Promise<any>;
  moveFiles(source: string, destination: string): Promise<any>;
}

export interface NotificationService {
  requestPermission(): Promise<boolean>;
  sendNotification(title: string, body: string, options?: any): Promise<void>;
}

// Email Integration Service
export class GmailIntegration implements EmailIntegration {
  private accessToken: string | null = null;

  constructor() {
    // Initialize with stored tokens
    this.loadTokens();
  }

  private loadTokens() {
    // Load Gmail API tokens from localStorage
    const tokens = localStorage.getItem('gmail_tokens');
    if (tokens) {
      const parsed = JSON.parse(tokens);
      this.accessToken = parsed.access_token;
    }
  }

  async checkEmails(): Promise<any[]> {
    if (!this.accessToken) {
      console.warn('Gmail not authenticated for workflow automation');
      return [];
    }

    try {
      // Simulate Gmail API call
      const response = await fetch('/api/gmail/messages', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error('Failed to check emails:', error);
    }

    return [];
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.accessToken) {
      console.warn('Gmail not authenticated for sending emails');
      return false;
    }

    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to, subject, body })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }
}

// Calendar Integration Service
export class GoogleCalendarIntegration implements CalendarIntegration {
  private accessToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    const tokens = localStorage.getItem('google_calendar_tokens');
    if (tokens) {
      const parsed = JSON.parse(tokens);
      this.accessToken = parsed.access_token;
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<any[]> {
    if (!this.accessToken) {
      console.warn('Google Calendar not authenticated');
      return [];
    }

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.items || [];
      }
    } catch (error) {
      console.error('Failed to get calendar events:', error);
    }

    return [];
  }

  async createEvent(event: any): Promise<any> {
    if (!this.accessToken) {
      console.warn('Google Calendar not authenticated');
      return null;
    }

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to create calendar event:', error);
    }

    return null;
  }

  async findFreeTime(duration: number): Promise<Date[]> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.getEvents(now, endOfDay);
    const freeSlots: Date[] = [];

    // Simple free time detection algorithm
    const currentTime = new Date(now);
    const endTime = new Date(endOfDay);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
      
      // Check if this slot conflicts with any events
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        return (currentTime < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict) {
        freeSlots.push(new Date(currentTime));
      }

      // Move to next 15-minute slot
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    return freeSlots;
  }
}

// File System Integration
export class FileSystemIntegration implements FileIntegration {
  private watchers: Map<string, any> = new Map();

  watchDirectory(path: string): void {
    if (this.watchers.has(path)) {
      return; // Already watching
    }

    // In a real implementation, this would use File System API or a file watcher
    console.log(`Watching directory: ${path}`);
    
    // Simulate file watching with periodic checks
    const watcher = setInterval(() => {
      this.checkDirectoryChanges(path);
    }, 5000);

    this.watchers.set(path, watcher);
  }

  private async checkDirectoryChanges(path: string) {
    // Simulate file system changes
    const hasChanges = Math.random() > 0.9; // 10% chance of changes
    
    if (hasChanges) {
      const changeData = {
        path,
        type: 'file_added',
        filename: `new_file_${Date.now()}.jpg`,
        timestamp: new Date()
      };

      // Trigger workflow events
      await workflowEngine.triggerEvent('file', changeData);
    }
  }

  async backupFiles(source: string, destination: string): Promise<any> {
    console.log(`Backing up from ${source} to ${destination}`);
    
    // Simulate backup process
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          filesBackedUp: Math.floor(Math.random() * 50) + 1,
          totalSize: Math.floor(Math.random() * 1000) + 100, // MB
          timestamp: new Date()
        });
      }, 2000);
    });
  }

  async moveFiles(source: string, destination: string): Promise<any> {
    console.log(`Moving files from ${source} to ${destination}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          filesMoved: Math.floor(Math.random() * 20) + 1,
          timestamp: new Date()
        });
      }, 1000);
    });
  }

  stopWatching(path: string): void {
    const watcher = this.watchers.get(path);
    if (watcher) {
      clearInterval(watcher);
      this.watchers.delete(path);
      console.log(`Stopped watching directory: ${path}`);
    }
  }

  stopAllWatchers(): void {
    for (const [_path, watcher] of this.watchers) {
      clearInterval(watcher);
    }
    this.watchers.clear();
    console.log('Stopped all file watchers');
  }
}

// Browser Notification Service
export class BrowserNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<void> {
    if (!await this.requestPermission()) {
      console.warn('Notification permission denied');
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || `notification-${Date.now()}`,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      ...options
    });

    // Auto-close after specified time
    if (options.autoClose) {
      setTimeout(() => notification.close(), options.autoClose * 1000);
    }

    // Handle click events
    notification.onclick = () => {
      if (options.onClick) {
        options.onClick();
      }
      notification.close();
    };
  }
}

// Task Management Integration
export class TaskManagerIntegration {
  async createTask(title: string, description: string, priority: string = 'medium', dueDate?: Date): Promise<any> {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      description,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date(),
      createdBy: 'workflow-automation'
    };

    // Store in localStorage for now
    const existingTasks = JSON.parse(localStorage.getItem('workflow_tasks') || '[]');
    existingTasks.push(task);
    localStorage.setItem('workflow_tasks', JSON.stringify(existingTasks));

    console.log('Task created by workflow:', task);
    return task;
  }

  async getTasks(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('workflow_tasks') || '[]');
  }

  async getTaskSuggestions(freeTimeMinutes: number): Promise<any[]> {
    const tasks = await this.getTasks();
    
    // Filter incomplete tasks and sort by priority
    const availableTasks = tasks.filter(task => !task.completed);
    
    // Simple priority scoring
    const scoredTasks = availableTasks.map(task => ({
      ...task,
      score: this.calculateTaskScore(task, freeTimeMinutes)
    }));

    // Return top 3 suggestions
    return scoredTasks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private calculateTaskScore(task: any, availableMinutes: number): number {
    let score = 0;

    // Priority scoring
    const priorityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    score += priorityScores[task.priority] || 1;

    // Due date urgency
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) score += 3;
      else if (daysUntilDue <= 3) score += 2;
      else if (daysUntilDue <= 7) score += 1;
    }

    // Estimated time vs available time
    const estimatedMinutes = this.estimateTaskTime(task);
    if (estimatedMinutes <= availableMinutes) {
      score += 2;
    } else if (estimatedMinutes <= availableMinutes * 1.5) {
      score += 1;
    }

    return score;
  }

  private estimateTaskTime(task: any): number {
    // Simple heuristic based on title/description length
    const textLength = (task.title + task.description).length;
    
    if (textLength < 50) return 15; // Quick task
    if (textLength < 100) return 30; // Medium task
    if (textLength < 200) return 60; // Longer task
    return 90; // Complex task
  }
}

// Workflow Integration Manager
export class WorkflowIntegrationManager {
  private emailService: GmailIntegration;
  private calendarService: GoogleCalendarIntegration;
  private fileService: FileSystemIntegration;
  private notificationService: BrowserNotificationService;
  private taskService: TaskManagerIntegration;
  private isRunning: boolean = false;
  private pollingInterval: number = 60000; // 1 minute
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.emailService = new GmailIntegration();
    this.calendarService = new GoogleCalendarIntegration();
    this.fileService = new FileSystemIntegration();
    this.notificationService = new BrowserNotificationService();
    this.taskService = new TaskManagerIntegration();
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Workflow integrations started');

    // Request notification permission
    await this.notificationService.requestPermission();

    // Start polling for external events
    this.intervalId = setInterval(() => {
      this.pollExternalEvents();
    }, this.pollingInterval);

    // Set up common workflow scenarios
    this.setupCommonScenarios();
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.fileService.stopAllWatchers();
    console.log('⏹️ Workflow integrations stopped');
  }

  private async pollExternalEvents() {
    try {
      // Check for new emails
      const emails = await this.emailService.checkEmails();
      for (const email of emails) {
        await workflowEngine.triggerEvent('email', {
          id: email.id,
          from: email.from,
          subject: email.subject,
          body: email.body,
          timestamp: new Date(email.timestamp)
        });
      }

      // Check calendar for free time
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      const freeSlots = await this.calendarService.findFreeTime(30); // 30+ minute slots
      for (const slot of freeSlots.slice(0, 1)) { // Only trigger for first free slot
        const duration = 60; // Assume 60 minutes for now
        const suggestedTasks = await this.taskService.getTaskSuggestions(duration);
        
        await workflowEngine.triggerEvent('calendar', {
          hasEvents: false,
          duration,
          freeTime: slot,
          suggestedTask: suggestedTasks[0]?.title || 'No tasks available',
          suggestions: suggestedTasks
        });
      }

    } catch (error) {
      console.error('Error polling external events:', error);
    }
  }

  private setupCommonScenarios() {
    // Auto-backup photos weekly (simulated)
    const photoDirectory = '/Users/Pictures'; // This would be configurable
    this.fileService.watchDirectory(photoDirectory);

    // Simulate weekly backup trigger
    setTimeout(() => {
      workflowEngine.triggerEvent('time', {
        dayOfWeek: 0, // Sunday
        hour: 20, // 8 PM
        timestamp: new Date(),
        trigger: 'weekly_backup'
      });
    }, 5000); // 5 seconds after startup for demo
  }

  // Public methods for manual triggering
  async triggerEmailCheck() {
    const emails = await this.emailService.checkEmails();
    console.log(`📧 Found ${emails.length} emails to process`);
    return emails;
  }

  async triggerFreeTimeCheck() {
    const freeSlots = await this.calendarService.findFreeTime(30);
    console.log(`📅 Found ${freeSlots.length} free time slots`);
    return freeSlots;
  }

  async triggerBackup(source: string, destination: string = 'Google Drive') {
    const result = await this.fileService.backupFiles(source, destination);
    console.log('💾 Backup completed:', result);
    return result;
  }

  // Service getters for external use
  get email() { return this.emailService; }
  get calendar() { return this.calendarService; }
  get files() { return this.fileService; }
  get notifications() { return this.notificationService; }
  get tasks() { return this.taskService; }
}

// Create singleton instance
export const workflowIntegrations = new WorkflowIntegrationManager();

// Auto-start integrations
if (typeof window !== 'undefined') {
  // Start after a short delay to allow other services to initialize
  setTimeout(() => {
    workflowIntegrations.start();
  }, 2000);
}