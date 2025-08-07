/**
 * Comprehensive Audit Logging System
 * Tracks all user actions, security events, and data access for compliance and security
 */

import { encryptedStorage } from './encryptedStorage';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  action: string;
  category: 'auth' | 'data' | 'security' | 'privacy' | 'system' | 'user' | 'api' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    resource?: string;
    method?: string;
    endpoint?: string;
    dataType?: string;
    dataId?: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    previousValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
  };
  tags: string[];
  encrypted: boolean;
  retention: number; // days
}

export interface AuditQuery {
  userId?: string;
  sessionId?: string;
  category?: AuditLogEntry['category'];
  severity?: AuditLogEntry['severity'];
  action?: string;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  totalEntries: number;
  entriesByCategory: Record<string, number>;
  entriesBySeverity: Record<string, number>;
  successRate: number;
  errorRate: number;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  securityEvents: number;
  privacyEvents: number;
  anomalies: AuditLogEntry[];
  trends: {
    daily: Record<string, number>;
    hourly: Record<string, number>;
  };
}

class AuditLogger {
  private readonly logKey = 'audit_logs';
  private readonly indexKey = 'audit_index';
  private readonly sessionId: string;
  private readonly maxLogsPerBatch = 1000;
  private logBuffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  // Sensitive actions that require encryption
  private readonly sensitiveActions = new Set([
    'login', 'logout', 'password_change', 'data_access', 'data_export',
    'settings_change', 'biometric_auth', 'encryption_key_access',
    'privacy_settings_change', 'data_delete', 'audit_access'
  ]);

  // Critical security events
  private readonly criticalEvents = new Set([
    'failed_login_attempts', 'unauthorized_access', 'data_breach_attempt',
    'suspicious_activity', 'system_compromise', 'encryption_failure',
    'audit_tampering', 'privilege_escalation'
  ]);

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
    this.logSystemEvent('audit_logger_initialized', 'system');
  }

  /**
   * Log a user action
   */
  async logAction(
    action: string,
    category: AuditLogEntry['category'],
    details: Partial<AuditLogEntry['details']>,
    userId: string = 'anonymous',
    tags: string[] = []
  ): Promise<void> {
    const severity = this.determineSeverity(action, category, details.success);
    const shouldEncrypt = this.shouldEncryptLog(action, category, severity);
    
    const logEntry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      sessionId: this.sessionId,
      action,
      category,
      severity,
      details: {
        success: true,
        ipAddress: this.getClientIP(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ...details,
      },
      tags: [...tags, category, severity],
      encrypted: shouldEncrypt,
      retention: this.getRetentionPeriod(category, severity),
    };

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);
    
    // Flush immediately for critical events
    if (severity === 'critical' || this.criticalEvents.has(action)) {
      await this.flushLogs();
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${severity.toUpperCase()}: ${action}`, details);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'login' | 'logout' | 'failed_login' | 'password_change' | 'biometric_auth',
    success: boolean,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction(action, 'auth', {
      ...details,
      success,
      method: details.method || 'password',
    }, userId, ['authentication']);
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'read' | 'write' | 'delete' | 'export' | 'import',
    dataType: string,
    dataId: string,
    success: boolean,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction(`data_${action}`, 'data', {
      ...details,
      dataType,
      dataId,
      success,
    }, userId, ['data-access', dataType]);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: string,
    success: boolean,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction(action, 'security', {
      ...details,
      success,
    }, userId, ['security']);
  }

  /**
   * Log privacy events
   */
  async logPrivacyEvent(
    action: 'data_anonymized' | 'data_deleted' | 'consent_given' | 'consent_withdrawn' | 'privacy_settings_changed',
    success: boolean,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction(action, 'privacy', {
      ...details,
      success,
    }, userId, ['privacy']);
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    category: AuditLogEntry['category'] = 'system',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction(action, category, {
      ...details,
      success: true,
    }, 'system', ['system']);
  }

  /**
   * Log API calls
   */
  async logApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    const success = statusCode < 400;
    await this.logAction('api_call', 'api', {
      ...details,
      method,
      endpoint,
      success,
      duration,
      errorCode: success ? undefined : statusCode.toString(),
    }, userId, ['api', method.toLowerCase()]);
  }

  /**
   * Log errors
   */
  async logError(
    error: Error,
    context: string,
    userId: string = 'anonymous',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logAction('error_occurred', 'error', {
      ...details,
      success: false,
      errorMessage: error.message,
      errorCode: 'RUNTIME_ERROR',
      metadata: {
        stack: error.stack,
        context,
      },
    }, userId, ['error', context]);
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditQuery = {}): Promise<AuditLogEntry[]> {
    await this.flushLogs(); // Ensure all logs are persisted
    
    const allLogs = await this.getAllLogs();
    let filteredLogs = allLogs;

    // Apply filters
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }
    
    if (query.sessionId) {
      filteredLogs = filteredLogs.filter(log => log.sessionId === query.sessionId);
    }
    
    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category);
    }
    
    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }
    
    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action.includes(query.action!));
    }
    
    if (query.resource) {
      filteredLogs = filteredLogs.filter(log => log.details.resource === query.resource);
    }
    
    if (query.dateFrom) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= query.dateFrom!);
    }
    
    if (query.dateTo) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= query.dateTo!);
    }
    
    if (query.tags && query.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        query.tags!.some(tag => log.tags.includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Generate audit report
   */
  async generateReport(dateFrom?: Date, dateTo?: Date): Promise<AuditReport> {
    const logs = await this.queryLogs({ dateFrom, dateTo });
    
    const report: AuditReport = {
      totalEntries: logs.length,
      entriesByCategory: {},
      entriesBySeverity: {},
      successRate: 0,
      errorRate: 0,
      topActions: [],
      topResources: [],
      securityEvents: 0,
      privacyEvents: 0,
      anomalies: [],
      trends: { daily: {}, hourly: {} },
    };

    const actionCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      // Count by category
      report.entriesByCategory[log.category] = (report.entriesByCategory[log.category] || 0) + 1;
      
      // Count by severity
      report.entriesBySeverity[log.severity] = (report.entriesBySeverity[log.severity] || 0) + 1;
      
      // Count success/errors
      if (log.details.success) successCount++;
      else errorCount++;
      
      // Count actions
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Count resources
      if (log.details.resource) {
        resourceCounts[log.details.resource] = (resourceCounts[log.details.resource] || 0) + 1;
      }
      
      // Count special events
      if (log.category === 'security') report.securityEvents++;
      if (log.category === 'privacy') report.privacyEvents++;
      
      // Daily trends
      const day = log.timestamp.toISOString().split('T')[0];
      report.trends.daily[day] = (report.trends.daily[day] || 0) + 1;
      
      // Hourly trends
      const hour = log.timestamp.getHours().toString();
      report.trends.hourly[hour] = (report.trends.hourly[hour] || 0) + 1;
      
      // Detect anomalies
      if (this.isAnomalous(log)) {
        report.anomalies.push(log);
      }
    }

    // Calculate rates
    report.successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;
    report.errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

    // Top actions and resources
    report.topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));
      
    report.topResources = Object.entries(resourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    return report;
  }

  /**
   * Export logs for compliance
   */
  async exportLogs(format: 'json' | 'csv' = 'json', query: AuditQuery = {}): Promise<string> {
    const logs = await this.queryLogs(query);
    
    if (format === 'csv') {
      const headers = ['timestamp', 'userId', 'action', 'category', 'severity', 'success', 'resource', 'details'];
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.userId,
        log.action,
        log.category,
        log.severity,
        log.details.success.toString(),
        log.details.resource || '',
        JSON.stringify(log.details),
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    const allLogs = await this.getAllLogs();
    const now = new Date();
    let cleanedCount = 0;
    
    const activeLogs = allLogs.filter(log => {
      const ageInDays = (now.getTime() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > log.retention) {
        cleanedCount++;
        return false;
      }
      return true;
    });
    
    if (cleanedCount > 0) {
      await this.storeLogs(activeLogs);
      console.log(`Cleaned up ${cleanedCount} old audit logs`);
    }
    
    return cleanedCount;
  }

  /**
   * Verify log integrity
   */
  async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const logs = await this.getAllLogs();
      const logIds = new Set<string>();
      
      for (const log of logs) {
        // Check for duplicate IDs
        if (logIds.has(log.id)) {
          issues.push(`Duplicate log ID found: ${log.id}`);
        }
        logIds.add(log.id);
        
        // Check timestamp validity
        if (isNaN(new Date(log.timestamp).getTime())) {
          issues.push(`Invalid timestamp in log ${log.id}`);
        }
        
        // Check required fields
        if (!log.userId || !log.action || !log.category) {
          issues.push(`Missing required fields in log ${log.id}`);
        }
        
        // Check for future timestamps
        if (new Date(log.timestamp) > new Date()) {
          issues.push(`Future timestamp in log ${log.id}`);
        }
      }
      
      return { valid: issues.length === 0, issues };
    } catch (error) {
      return { valid: false, issues: [`Integrity check failed: ${error}`] };
    }
  }

  // Private helper methods
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  private determineSeverity(
    action: string,
    category: AuditLogEntry['category'],
    success?: boolean
  ): AuditLogEntry['severity'] {
    if (this.criticalEvents.has(action) || (!success && category === 'security')) {
      return 'critical';
    }
    
    if (category === 'security' || category === 'privacy' || this.sensitiveActions.has(action)) {
      return 'high';
    }
    
    if (category === 'auth' || category === 'data') {
      return 'medium';
    }
    
    return 'low';
  }

  private shouldEncryptLog(action: string, category: AuditLogEntry['category'], severity: AuditLogEntry['severity']): boolean {
    return this.sensitiveActions.has(action) || 
           category === 'security' || 
           category === 'privacy' ||
           severity === 'critical';
  }

  private getRetentionPeriod(category: AuditLogEntry['category'], severity: AuditLogEntry['severity']): number {
    const retentionMap = {
      'critical': 2555, // 7 years
      'high': 1825,     // 5 years
      'medium': 1095,   // 3 years
      'low': 365,       // 1 year
    };

    // Security and privacy logs kept longer
    if (category === 'security' || category === 'privacy') {
      return retentionMap['critical'];
    }
    
    return retentionMap[severity];
  }

  private getClientIP(): string {
    // In a real application, this would come from the server
    return 'unknown';
  }

  private isAnomalous(log: AuditLogEntry): boolean {
    // Simple anomaly detection - this could be much more sophisticated
    const anomalyPatterns = [
      // Multiple failed logins
      log.action === 'failed_login',
      // Security events that failed
      log.category === 'security' && !log.details.success,
      // Critical events
      log.severity === 'critical',
      // Unusual hours (2 AM - 5 AM)
      log.timestamp.getHours() >= 2 && log.timestamp.getHours() <= 5,
    ];
    
    return anomalyPatterns.some(pattern => pattern);
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const existingLogs = await this.getAllLogs();
      const allLogs = [...existingLogs, ...logsToFlush];
      await this.storeLogs(allLogs);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Put logs back in buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async getAllLogs(): Promise<AuditLogEntry[]> {
    try {
      // Try encrypted storage first
      const encryptedLogs = await encryptedStorage.getItem(this.logKey, 'audit-encryption-key');
      if (encryptedLogs) return encryptedLogs;
      
      // Fall back to regular storage
      const stored = localStorage.getItem(this.logKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async storeLogs(logs: AuditLogEntry[]): Promise<void> {
    // Store encrypted logs
    await encryptedStorage.setItem(this.logKey, logs, 'audit-encryption-key');
    
    // Also store index for quick queries
    const index = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      category: log.category,
      severity: log.severity,
      userId: log.userId,
      action: log.action,
    }));
    
    localStorage.setItem(this.indexKey, JSON.stringify(index));
  }

  private startPeriodicFlush(): void {
    // Flush logs every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000);
    
    // Cleanup old logs daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  // Cleanup on page unload
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs();
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    auditLogger.destroy();
  });
}

export default AuditLogger;