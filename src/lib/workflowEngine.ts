// Workflow Automation Engine - Intelligent Rule-Based Task Automation

export interface WorkflowTrigger {
  id: string;
  type: 'email' | 'calendar' | 'file' | 'time' | 'location' | 'webhook' | 'manual';
  name: string;
  description: string;
  conditions: TriggerCondition[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'matches' | 'exists';
  value: any;
  caseSensitive?: boolean;
}

export interface WorkflowAction {
  id: string;
  type: 'notification' | 'email' | 'file_operation' | 'api_call' | 'task_creation' | 'calendar_event' | 'backup' | 'reminder';
  name: string;
  description: string;
  parameters: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  enabled: boolean;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkflowExecution {
  id: string;
  ruleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: string;
    data: any;
  };
  actions: {
    actionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    result?: any;
    error?: string;
  }[];
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  template: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted' | 'executionCount' | 'successCount' | 'failureCount'>;
  variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'email' | 'url';
    description: string;
    required: boolean;
    defaultValue?: any;
  }[];
}

export class WorkflowEngine {
  private rules: Map<string, WorkflowRule> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private isRunning: boolean = false;
  private pollingInterval: number = 5000; // 5 seconds
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.initializeTemplates();
  }

  // Core workflow management
  async createRule(rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'failureCount'>): Promise<WorkflowRule> {
    const newRule: WorkflowRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0
    };

    this.rules.set(newRule.id, newRule);
    this.saveRulesToStorage();
    
    return newRule;
  }

  async updateRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule | null> {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.rules.set(id, updatedRule);
    this.saveRulesToStorage();
    
    return updatedRule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const deleted = this.rules.delete(id);
    if (deleted) {
      this.saveRulesToStorage();
    }
    return deleted;
  }

  getRules(): WorkflowRule[] {
    return Array.from(this.rules.values());
  }

  getRule(id: string): WorkflowRule | null {
    return this.rules.get(id) || null;
  }

  // Execution engine
  async executeRule(ruleId: string, triggerData?: any): Promise<WorkflowExecution> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    if (!rule.enabled) {
      throw new Error(`Rule ${ruleId} is disabled`);
    }

    const execution: WorkflowExecution = {
      id: this.generateId(),
      ruleId,
      startTime: new Date(),
      status: 'running',
      trigger: {
        type: rule.trigger.type,
        data: triggerData || {}
      },
      actions: rule.actions.map(action => ({
        actionId: action.id,
        status: 'pending'
      })),
      logs: []
    };

    this.executions.set(execution.id, execution);
    this.log(execution, 'info', `Starting execution of rule: ${rule.name}`);

    try {
      // Execute actions sequentially
      for (const action of rule.actions) {
        if (!action.enabled) {
          this.updateActionStatus(execution, action.id, 'skipped');
          this.log(execution, 'info', `Skipped disabled action: ${action.name}`);
          continue;
        }

        this.updateActionStatus(execution, action.id, 'running', new Date());
        this.log(execution, 'info', `Executing action: ${action.name}`);

        try {
          const result = await this.executeAction(action, triggerData);
          this.updateActionStatus(execution, action.id, 'completed', undefined, new Date(), result);
          this.log(execution, 'info', `Action completed: ${action.name}`, result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.updateActionStatus(execution, action.id, 'failed', undefined, new Date(), undefined, errorMessage);
          this.log(execution, 'error', `Action failed: ${action.name}`, error);
          
          // Continue with other actions unless it's a critical failure
          if (rule.priority === 'critical') {
            throw error;
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      
      // Update rule statistics
      rule.executionCount++;
      rule.successCount++;
      rule.lastExecuted = new Date();
      this.rules.set(ruleId, rule);

      this.log(execution, 'info', 'Rule execution completed successfully');

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      
      rule.executionCount++;
      rule.failureCount++;
      this.rules.set(ruleId, rule);

      this.log(execution, 'error', 'Rule execution failed', error);
    }

    this.saveRulesToStorage();
    return execution;
  }

  // Action execution
  private async executeAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    switch (action.type) {
      case 'notification':
        return this.executeNotificationAction(action, triggerData);
      case 'email':
        return this.executeEmailAction(action, triggerData);
      case 'file_operation':
        return this.executeFileOperationAction(action, triggerData);
      case 'api_call':
        return this.executeApiCallAction(action, triggerData);
      case 'task_creation':
        return this.executeTaskCreationAction(action, triggerData);
      case 'calendar_event':
        return this.executeCalendarEventAction(action, triggerData);
      case 'backup':
        return this.executeBackupAction(action, triggerData);
      case 'reminder':
        return this.executeReminderAction(action, triggerData);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeNotificationAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    // Send browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = this.interpolateString(action.parameters.title || 'Workflow Notification', triggerData);
      const body = this.interpolateString(action.parameters.body || 'A workflow rule has been triggered', triggerData);
      
      const notification = new Notification(title, {
        body,
        icon: action.parameters.icon || '/favicon.ico',
        tag: `workflow-${action.id}`
      });

      // Auto-close after specified time
      if (action.parameters.autoClose) {
        setTimeout(() => notification.close(), action.parameters.autoClose * 1000);
      }

      return { notificationId: `workflow-${action.id}`, title, body };
    } else {
      // Fallback to console notification
      console.log('Workflow Notification:', action.parameters.title, action.parameters.body);
      return { fallback: true, message: 'Notification shown in console' };
    }
  }

  private async executeEmailAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    // This would integrate with email service
    const to = this.interpolateString(action.parameters.to, triggerData);
    const subject = this.interpolateString(action.parameters.subject, triggerData);
    const body = this.interpolateString(action.parameters.body, triggerData);

    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Email sent:', { to, subject, body });
        resolve({ emailId: this.generateId(), to, subject, sent: true });
      }, 1000);
    });
  }

  private async executeFileOperationAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const operation = action.parameters.operation; // 'copy', 'move', 'delete', 'backup'
    const source = this.interpolateString(action.parameters.source, triggerData);
    const destination = this.interpolateString(action.parameters.destination, triggerData);

    // This would integrate with file system APIs
    console.log(`File operation: ${operation} from ${source} to ${destination}`);
    
    return { 
      operation, 
      source, 
      destination, 
      success: true,
      timestamp: new Date()
    };
  }

  private async executeApiCallAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const url = this.interpolateString(action.parameters.url, triggerData);
    const method = action.parameters.method || 'GET';
    const headers = action.parameters.headers || {};
    const body = action.parameters.body ? this.interpolateString(JSON.stringify(action.parameters.body), triggerData) : undefined;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.parse(body) : undefined
      });

      const result = await response.json();
      return { status: response.status, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`API call failed: ${errorMessage}`);
    }
  }

  private async executeTaskCreationAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const title = this.interpolateString(action.parameters.title, triggerData);
    const description = this.interpolateString(action.parameters.description, triggerData);
    const priority = action.parameters.priority || 'medium';
    const dueDate = action.parameters.dueDate ? new Date(action.parameters.dueDate) : undefined;

    // This would integrate with task management system
    const task = {
      id: this.generateId(),
      title,
      description,
      priority,
      dueDate,
      createdAt: new Date(),
      createdBy: 'workflow-automation'
    };

    console.log('Task created:', task);
    return task;
  }

  private async executeCalendarEventAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const title = this.interpolateString(action.parameters.title, triggerData);
    const startTime = new Date(action.parameters.startTime);
    const endTime = new Date(action.parameters.endTime);
    const description = this.interpolateString(action.parameters.description || '', triggerData);

    // This would integrate with calendar API
    const event = {
      id: this.generateId(),
      title,
      startTime,
      endTime,
      description,
      createdBy: 'workflow-automation'
    };

    console.log('Calendar event created:', event);
    return event;
  }

  private async executeBackupAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const source = this.interpolateString(action.parameters.source, triggerData);
    const destination = action.parameters.destination || 'Google Drive';
    const includeSubfolders = action.parameters.includeSubfolders !== false;

    // This would integrate with backup services
    console.log(`Backup started: ${source} to ${destination}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          backupId: this.generateId(),
          source,
          destination,
          includeSubfolders,
          status: 'completed',
          filesBackedUp: Math.floor(Math.random() * 100) + 1,
          timestamp: new Date()
        });
      }, 2000);
    });
  }

  private async executeReminderAction(action: WorkflowAction, triggerData?: any): Promise<any> {
    const message = this.interpolateString(action.parameters.message, triggerData);
    const delay = action.parameters.delay || 0; // in minutes
    const reminderTime = new Date(Date.now() + delay * 60 * 1000);

    // Schedule reminder
    setTimeout(() => {
      this.executeNotificationAction({
        ...action,
        parameters: {
          title: 'Reminder',
          body: message
        }
      }, triggerData);
    }, delay * 60 * 1000);

    return {
      reminderId: this.generateId(),
      message,
      scheduledFor: reminderTime,
      delay
    };
  }

  // Trigger evaluation
  async evaluateTriggers(eventType: string, eventData: any): Promise<WorkflowRule[]> {
    const triggeredRules: WorkflowRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.trigger.type !== eventType) continue;

      if (this.evaluateTriggerConditions(rule.trigger.conditions, eventData)) {
        triggeredRules.push(rule);
        
        // Update trigger statistics
        rule.trigger.lastTriggered = new Date();
        rule.trigger.triggerCount++;
        
        // Execute the rule
        try {
          await this.executeRule(rule.id, eventData);
        } catch (error) {
          console.error(`Failed to execute rule ${rule.id}:`, error);
        }
      }
    }

    return triggeredRules;
  }

  private evaluateTriggerConditions(conditions: TriggerCondition[], data: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(data, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private evaluateCondition(fieldValue: any, condition: TriggerCondition): boolean {
    const { operator, value, caseSensitive = false } = condition;
    
    // Convert to strings for string operations if needed
    const fieldStr = caseSensitive ? String(fieldValue) : String(fieldValue).toLowerCase();
    const conditionStr = caseSensitive ? String(value) : String(value).toLowerCase();

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return fieldStr.includes(conditionStr);
      case 'startsWith':
        return fieldStr.startsWith(conditionStr);
      case 'endsWith':
        return fieldStr.endsWith(conditionStr);
      case 'greaterThan':
        return Number(fieldValue) > Number(value);
      case 'lessThan':
        return Number(fieldValue) < Number(value);
      case 'between':
        const [min, max] = Array.isArray(value) ? value : [value.min, value.max];
        const numValue = Number(fieldValue);
        return numValue >= min && numValue <= max;
      case 'matches':
        const regex = new RegExp(value, caseSensitive ? 'g' : 'gi');
        return regex.test(String(fieldValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  // Utility methods
  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private interpolateString(template: string, data: any): string {
    if (!template || typeof template !== 'string') return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath) => {
      const value = this.getFieldValue(data, fieldPath.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private updateActionStatus(
    execution: WorkflowExecution, 
    actionId: string, 
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
    startTime?: Date,
    endTime?: Date,
    result?: any,
    error?: string
  ): void {
    const actionExecution = execution.actions.find(a => a.actionId === actionId);
    if (actionExecution) {
      actionExecution.status = status;
      if (startTime) actionExecution.startTime = startTime;
      if (endTime) actionExecution.endTime = endTime;
      if (result) actionExecution.result = result;
      if (error) actionExecution.error = error;
    }
  }

  private log(execution: WorkflowExecution, level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    const logEntry: WorkflowLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };
    execution.logs.push(logEntry);
    console.log(`[Workflow ${execution.ruleId}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Storage methods
  private saveRulesToStorage(): void {
    try {
      const rulesData = Array.from(this.rules.entries());
      localStorage.setItem('workflow_rules', JSON.stringify(rulesData));
    } catch (error) {
      console.error('Failed to save workflow rules:', error);
    }
  }

  private loadRulesFromStorage(): void {
    try {
      const stored = localStorage.getItem('workflow_rules');
      if (stored) {
        const rulesData = JSON.parse(stored);
        this.rules = new Map(rulesData.map(([id, rule]: [string, any]) => [
          id,
          {
            ...rule,
            createdAt: new Date(rule.createdAt),
            updatedAt: new Date(rule.updatedAt),
            lastExecuted: rule.lastExecuted ? new Date(rule.lastExecuted) : undefined
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load workflow rules:', error);
    }
  }

  // Template management
  private initializeTemplates(): void {
    this.loadRulesFromStorage();
  }

  getTemplates(): WorkflowTemplate[] {
    return [
      {
        id: 'boss-email-notification',
        name: 'Boss Email Alert',
        description: 'Get immediate notification when receiving email from your boss',
        category: 'Email',
        icon: '📧',
        template: {
          name: 'Boss Email Alert',
          description: 'Immediate notification for boss emails',
          trigger: {
            id: 'email-trigger',
            type: 'email',
            name: 'Email Received',
            description: 'Triggers when email is received',
            conditions: [
              {
                field: 'from.email',
                operator: 'equals',
                value: '{{bossEmail}}'
              }
            ],
            enabled: true,
            triggerCount: 0
          },
          actions: [
            {
              id: 'notify-action',
              type: 'notification',
              name: 'Send Notification',
              description: 'Show browser notification',
              parameters: {
                title: 'Email from Boss',
                body: 'You have a new email from {{from.name}}: {{subject}}',
                autoClose: 10
              },
              enabled: true
            }
          ],
          enabled: true,
          tags: ['email', 'boss', 'urgent'],
          priority: 'high'
        },
        variables: [
          {
            name: 'bossEmail',
            type: 'email',
            description: 'Your boss\'s email address',
            required: true
          }
        ]
      },
      {
        id: 'photo-backup',
        name: 'Weekly Photo Backup',
        description: 'Automatically backup photos taken this week to Google Drive',
        category: 'File Management',
        icon: '📸',
        template: {
          name: 'Weekly Photo Backup',
          description: 'Auto-backup recent photos',
          trigger: {
            id: 'time-trigger',
            type: 'time',
            name: 'Weekly Schedule',
            description: 'Triggers weekly on Sunday',
            conditions: [
              {
                field: 'dayOfWeek',
                operator: 'equals',
                value: 0 // Sunday
              },
              {
                field: 'hour',
                operator: 'equals',
                value: 20 // 8 PM
              }
            ],
            enabled: true,
            triggerCount: 0
          },
          actions: [
            {
              id: 'backup-action',
              type: 'backup',
              name: 'Backup Photos',
              description: 'Backup recent photos to Google Drive',
              parameters: {
                source: '{{photosDirectory}}',
                destination: 'Google Drive',
                includeSubfolders: true,
                filter: 'this-week'
              },
              enabled: true
            },
            {
              id: 'notify-backup',
              type: 'notification',
              name: 'Backup Complete',
              description: 'Notify when backup is done',
              parameters: {
                title: 'Photo Backup Complete',
                body: 'This week\'s photos have been backed up to Google Drive'
              },
              enabled: true
            }
          ],
          enabled: true,
          tags: ['backup', 'photos', 'weekly'],
          priority: 'medium'
        },
        variables: [
          {
            name: 'photosDirectory',
            type: 'string',
            description: 'Path to your photos directory',
            required: true,
            defaultValue: '/Users/Photos'
          }
        ]
      },
      {
        id: 'free-time-tasks',
        name: 'Free Time Task Suggestions',
        description: 'Suggest tasks from your todo list when calendar shows free time',
        category: 'Productivity',
        icon: '📅',
        template: {
          name: 'Free Time Task Suggestions',
          description: 'Suggest tasks during free time',
          trigger: {
            id: 'calendar-trigger',
            type: 'calendar',
            name: 'Free Time Detected',
            description: 'Triggers when calendar shows free time',
            conditions: [
              {
                field: 'hasEvents',
                operator: 'equals',
                value: false
              },
              {
                field: 'duration',
                operator: 'greaterThan',
                value: 30 // 30 minutes
              }
            ],
            enabled: true,
            triggerCount: 0
          },
          actions: [
            {
              id: 'suggest-tasks',
              type: 'notification',
              name: 'Suggest Tasks',
              description: 'Show task suggestions',
              parameters: {
                title: 'Free Time Detected',
                body: 'You have {{duration}} minutes free. Would you like to work on: {{suggestedTask}}?',
                autoClose: 30
              },
              enabled: true
            }
          ],
          enabled: true,
          tags: ['productivity', 'calendar', 'tasks'],
          priority: 'low'
        },
        variables: []
      }
    ];
  }

  // Lifecycle methods
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Workflow engine started');
    
    // Start polling for time-based triggers
    this.intervalId = setInterval(() => {
      this.checkTimeTriggers();
    }, this.pollingInterval);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    console.log('Workflow engine stopped');
  }

  private checkTimeTriggers(): void {
    const now = new Date();
    const timeData = {
      timestamp: now,
      hour: now.getHours(),
      minute: now.getMinutes(),
      dayOfWeek: now.getDay(),
      dayOfMonth: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear()
    };

    this.evaluateTriggers('time', timeData);
  }

  // Public API for external integrations
  async triggerEvent(eventType: string, eventData: any): Promise<WorkflowRule[]> {
    return this.evaluateTriggers(eventType, eventData);
  }

  getExecutions(ruleId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    return ruleId ? executions.filter(e => e.ruleId === ruleId) : executions;
  }

  getExecution(id: string): WorkflowExecution | null {
    return this.executions.get(id) || null;
  }
}

// Create singleton instance
export const workflowEngine = new WorkflowEngine();

// Auto-start the engine in browser environment
if (typeof window !== 'undefined') {
  try {
    workflowEngine.start();
  } catch (error) {
    console.warn('Failed to auto-start workflow engine:', error);
  }
}