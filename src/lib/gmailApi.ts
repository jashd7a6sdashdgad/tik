// Gmail API Integration for Email Intelligence System

import { EmailMessage, EmailIntelligence, emailIntelligence } from './emailIntelligence';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: any[];
  };
  sizeEstimate: number;
}

export interface GmailApiConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface EmailFilter {
  query?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  maxResults?: number;
  pageToken?: string;
}

export interface ProcessedEmail extends EmailMessage {
  threadId: string;
  labelIds: string[];
  historyId: string;
  internalDate: Date;
  sizeEstimate: number;
  attachments?: EmailAttachment[];
  isThread?: boolean;
  threadCount?: number;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export class GmailApiService {
  private config: GmailApiConfig;
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  private intelligence: EmailIntelligence;

  constructor(config: GmailApiConfig) {
    this.config = config;
    this.intelligence = emailIntelligence;
  }

  // Update configuration (e.g., when tokens are refreshed)
  updateConfig(config: Partial<GmailApiConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Get user's Gmail profile
  async getProfile(): Promise<any> {
    const response = await this.makeRequest('/users/me/profile');
    return response;
  }

  // List emails with optional filtering
  async listEmails(filter: EmailFilter = {}): Promise<{ emails: ProcessedEmail[], nextPageToken?: string }> {
    const params = new URLSearchParams();
    
    if (filter.query) params.append('q', filter.query);
    if (filter.labelIds?.length) params.append('labelIds', filter.labelIds.join(','));
    if (filter.includeSpamTrash !== undefined) params.append('includeSpamTrash', filter.includeSpamTrash.toString());
    if (filter.maxResults) params.append('maxResults', filter.maxResults.toString());
    if (filter.pageToken) params.append('pageToken', filter.pageToken);

    const response = await this.makeRequest(`/users/me/messages?${params.toString()}`);
    
    if (!response.messages) {
      return { emails: [] };
    }

    // Get full message details for each email
    const emailPromises = response.messages.map((msg: any) => this.getEmail(msg.id));
    const emailDetails = await Promise.all(emailPromises);
    
    // Process emails through AI intelligence
    const processedEmails = emailDetails.map(email => this.processEmailWithAI(email));

    return {
      emails: processedEmails,
      nextPageToken: response.nextPageToken
    };
  }

  // Get a specific email by ID
  async getEmail(messageId: string): Promise<ProcessedEmail> {
    const response = await this.makeRequest(`/users/me/messages/${messageId}`);
    return this.processEmailWithAI(this.convertGmailToEmail(response));
  }

  // Get emails by thread
  async getThread(threadId: string): Promise<ProcessedEmail[]> {
    const response = await this.makeRequest(`/users/me/threads/${threadId}`);
    const emails = response.messages.map((msg: GmailMessage) => 
      this.processEmailWithAI(this.convertGmailToEmail(msg))
    );
    
    // Mark as thread and add thread count
    return emails.map((email, index) => ({
      ...email,
      isThread: true,
      threadCount: emails.length
    }));
  }

  // Search emails with advanced query
  async searchEmails(query: string, maxResults = 50): Promise<ProcessedEmail[]> {
    return (await this.listEmails({ query, maxResults })).emails;
  }

  // Get emails by label
  async getEmailsByLabel(labelName: string, maxResults = 50): Promise<ProcessedEmail[]> {
    const labels = await this.getLabels();
    const label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
    
    if (!label) {
      throw new Error(`Label "${labelName}" not found`);
    }

    return (await this.listEmails({ labelIds: [label.id], maxResults })).emails;
  }

  // Get unread emails
  async getUnreadEmails(maxResults = 50): Promise<ProcessedEmail[]> {
    return (await this.listEmails({ query: 'is:unread', maxResults })).emails;
  }

  // Get high priority emails (using AI classification)
  async getHighPriorityEmails(maxResults = 50): Promise<ProcessedEmail[]> {
    const emails = await this.listEmails({ maxResults: maxResults * 2 }); // Get more to filter
    return emails.emails.filter(email => email.priority === 'urgent' || email.priority === 'high').slice(0, maxResults);
  }

  // Get emails needing response
  async getEmailsNeedingResponse(maxResults = 50): Promise<ProcessedEmail[]> {
    const emails = await this.listEmails({ maxResults: maxResults * 2 });
    return emails.emails.filter(email => 
      email.suggestedActions?.some(action => 
        action.includes('respond') || action.includes('reply')
      )
    ).slice(0, maxResults);
  }

  // Get labels
  async getLabels(): Promise<any[]> {
    const response = await this.makeRequest('/users/me/labels');
    return response.labels || [];
  }

  // Mark email as read/unread
  async markAsRead(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    });
  }

  async markAsUnread(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: ['UNREAD']
      })
    });
  }

  // Star/unstar email
  async starEmail(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: ['STARRED']
      })
    });
  }

  async unstarEmail(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['STARRED']
      })
    });
  }

  // Archive email
  async archiveEmail(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['INBOX']
      })
    });
  }

  // Delete email (move to trash)
  async deleteEmail(messageId: string): Promise<void> {
    await this.makeRequest(`/users/me/messages/${messageId}/trash`, {
      method: 'POST'
    });
  }

  // Send email
  async sendEmail(to: string, subject: string, body: string, options: {
    cc?: string;
    bcc?: string;
    replyTo?: string;
    threadId?: string;
  } = {}): Promise<any> {
    const email = this.createEmailMessage(to, subject, body, options);
    
    return await this.makeRequest('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        raw: email,
        threadId: options.threadId
      })
    });
  }

  // Reply to email
  async replyToEmail(originalMessageId: string, replyBody: string): Promise<any> {
    const originalEmail = await this.getEmail(originalMessageId);
    const originalFrom = this.getHeaderValue(originalEmail.payload.headers, 'From');
    const originalSubject = this.getHeaderValue(originalEmail.payload.headers, 'Subject');
    
    const replySubject = originalSubject.startsWith('Re: ') ? originalSubject : `Re: ${originalSubject}`;
    
    return await this.sendEmail(originalFrom, replySubject, replyBody, {
      threadId: originalEmail.threadId
    });
  }

  // Get email analytics
  async getEmailAnalytics(days = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const query = `after:${Math.floor(since.getTime() / 1000)}`;
    
    const emails = await this.searchEmails(query, 1000);
    
    return this.intelligence.exportEmailAnalytics(emails);
  }

  // Batch process emails for AI classification
  async batchProcessEmails(messageIds: string[]): Promise<ProcessedEmail[]> {
    const emailPromises = messageIds.map(id => this.getEmail(id));
    const emails = await Promise.all(emailPromises);
    
    // The getEmail method already returns a ProcessedEmail object that has been processed by AI.
    // The previous code had a type error because it was trying to re-process an already processed
    // object. This simplified version correctly returns the processed emails.
    return emails;
  }

  // Convert Gmail message format to our EmailMessage format
  private convertGmailToEmail(gmailMessage: GmailMessage): ProcessedEmail {
    const headers = gmailMessage.payload.headers;
    const subject = this.getHeaderValue(headers, 'Subject');
    const from = this.getHeaderValue(headers, 'From');
    const to = this.getHeaderValue(headers, 'To');
    const date = this.getHeaderValue(headers, 'Date');

    return {
      id: gmailMessage.id,
      threadId: gmailMessage.threadId,
      labelIds: gmailMessage.labelIds,
      historyId: gmailMessage.historyId,
      internalDate: new Date(parseInt(gmailMessage.internalDate)),
      sizeEstimate: gmailMessage.sizeEstimate,
      snippet: gmailMessage.snippet,
      payload: {
        headers: gmailMessage.payload.headers
      },
      attachments: this.extractAttachments(gmailMessage.payload)
    };
  }

  // Process email through AI intelligence
  private processEmailWithAI(email: ProcessedEmail): ProcessedEmail {
    const processedEmail = this.intelligence.classifyEmail(email);
    return { ...email, ...processedEmail };
  }

  // Extract attachments from Gmail payload
  private extractAttachments(payload: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const extractFromPart = (part: any) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId
        });
      }

      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload.parts) {
      payload.parts.forEach(extractFromPart);
    }

    return attachments;
  }

  // Get header value by name
  private getHeaderValue(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  // Create email message for sending
  private createEmailMessage(to: string, subject: string, body: string, options: any = {}): string {
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`
    ];

    if (options.cc) headers.push(`Cc: ${options.cc}`);
    if (options.bcc) headers.push(`Bcc: ${options.bcc}`);
    if (options.replyTo) headers.push(`Reply-To: ${options.replyTo}`);

    const email = headers.join('\r\n') + '\r\n\r\n' + body;
    return btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Make authenticated request to Gmail API
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Gmail API authentication failed. Please re-authenticate.');
      }
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Helper method to refresh access token
  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('Missing refresh token or client credentials');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    this.config.accessToken = data.access_token;
    
    return data.access_token;
  }
}

// Export singleton for easy usage
export let gmailApiService: GmailApiService | null = null;

export function initializeGmailApi(config: GmailApiConfig): GmailApiService {
  gmailApiService = new GmailApiService(config);
  return gmailApiService;
}

export function getGmailApiService(): GmailApiService {
  if (!gmailApiService) {
    throw new Error('Gmail API service not initialized. Call initializeGmailApi() first.');
  }
  return gmailApiService;
}

// Helper functions for common operations
export const GmailHelpers = {
  // Build search queries
  buildQuery: {
    from: (email: string) => `from:${email}`,
    to: (email: string) => `to:${email}`,
    subject: (text: string) => `subject:"${text}"`,
    hasAttachment: () => 'has:attachment',
    isUnread: () => 'is:unread',
    isImportant: () => 'is:important',
    afterDate: (date: Date) => `after:${Math.floor(date.getTime() / 1000)}`,
    beforeDate: (date: Date) => `before:${Math.floor(date.getTime() / 1000)}`,
    label: (labelName: string) => `label:${labelName}`,
    combine: (...queries: string[]) => queries.join(' ')
  },

  // Parse email addresses
  parseEmailAddress: (emailString: string) => {
    const match = emailString.match(/(.+?)\s*<(.+?)>|(.+)/);
    if (match) {
      return {
        name: match[1]?.trim() || match[3]?.trim() || '',
        email: match[2] || match[3]?.trim() || ''
      };
    }
    return { name: '', email: emailString };
  },

  // Format date for Gmail queries
  formatDateForQuery: (date: Date) => {
    return Math.floor(date.getTime() / 1000).toString();
  }
};