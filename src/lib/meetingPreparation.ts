// Meeting Preparation Service - AI-powered meeting intelligence
// Automatically gathers relevant emails, documents, and preparation items

export interface MeetingPreparationItem {
  id: string;
  type: 'email' | 'document' | 'contact' | 'task' | 'note' | 'agenda' | 'travel';
  title: string;
  content?: string;
  url?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  dueDate?: Date;
  attachments?: string[];
  relatedEmails?: EmailReference[];
  relatedContacts?: ContactReference[];
}

export interface EmailReference {
  id: string;
  subject: string;
  from: string;
  date: Date;
  snippet: string;
  relevanceScore: number;
  attachments?: string[];
}

export interface ContactReference {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  lastInteraction?: Date;
  relevanceScore: number;
}

export interface DocumentReference {
  id: string;
  title: string;
  type: string;
  url: string;
  lastModified: Date;
  relevanceScore: number;
  size?: number;
}

export interface MeetingIntelligence {
  keyTopics: string[];
  previousMeetings: MeetingReference[];
  actionItems: ActionItem[];
  decisions: Decision[];
  risks: Risk[];
  opportunities: Opportunity[];
}

export interface MeetingReference {
  id: string;
  title: string;
  date: Date;
  attendees: string[];
  summary: string;
  outcomes: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
}

export interface Decision {
  id: string;
  decision: string;
  rationale: string;
  impact: string;
  date: Date;
}

export interface Risk {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: 'low' | 'medium' | 'high';
  mitigation?: string;
}

export interface Opportunity {
  id: string;
  description: string;
  value: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline?: string;
}

export class MeetingPreparationService {
  private emailCache = new Map<string, EmailReference[]>();
  private documentCache = new Map<string, DocumentReference[]>();
  private meetingHistoryCache = new Map<string, MeetingReference[]>();

  async prepareMeeting(
    meetingTitle: string,
    attendees: string[],
    startTime: Date,
    description?: string
  ): Promise<MeetingPreparationItem[]> {
    try {
      const preparationItems: MeetingPreparationItem[] = [];
      
      // Generate core preparation tasks
      preparationItems.push(...this.generateCoreTasks(meetingTitle, startTime));
      
      // Gather relevant emails
      const emailItems = await this.gatherRelevantEmails(meetingTitle, attendees, description);
      preparationItems.push(...emailItems);
      
      // Find relevant documents
      const documentItems = await this.findRelevantDocuments(meetingTitle, attendees, description);
      preparationItems.push(...documentItems);
      
      // Prepare contact information
      const contactItems = await this.prepareContactInformation(attendees);
      preparationItems.push(...contactItems);
      
      // Generate meeting intelligence
      const intelligenceItems = await this.generateMeetingIntelligence(meetingTitle, attendees, description);
      preparationItems.push(...intelligenceItems);
      
      // Sort by priority and due date
      return preparationItems.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        
        return 0;
      });
      
    } catch (error) {
      console.error('Meeting preparation error:', error);
      return this.generateFallbackTasks(meetingTitle, startTime);
    }
  }

  private generateCoreTasks(meetingTitle: string, startTime: Date): MeetingPreparationItem[] {
    const tasks: MeetingPreparationItem[] = [];
    
    // Agenda preparation
    tasks.push({
      id: `agenda_${Date.now()}`,
      type: 'agenda',
      title: 'Prepare meeting agenda',
      content: `Create comprehensive agenda for "${meetingTitle}" including:\n• Welcome and introductions\n• Review of previous action items\n• Main discussion topics\n• Decision points\n• Next steps and action items\n• Closing remarks`,
      priority: 'high',
      completed: false,
      dueDate: new Date(startTime.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
    });
    
    // Pre-meeting checklist
    tasks.push({
      id: `checklist_${Date.now()}`,
      type: 'task',
      title: 'Pre-meeting technical check',
      content: `Technical preparation:\n• Test video/audio equipment\n• Ensure stable internet connection\n• Prepare screen sharing materials\n• Set up virtual background if needed\n• Test meeting platform access`,
      priority: 'medium',
      completed: false,
      dueDate: new Date(startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
    });
    
    // Materials organization
    tasks.push({
      id: `materials_${Date.now()}`,
      type: 'document',
      title: 'Organize meeting materials',
      content: 'Gather and organize all relevant documents, presentations, and reference materials',
      priority: 'medium',
      completed: false,
      dueDate: new Date(startTime.getTime() - 60 * 60 * 1000) // 1 hour before
    });
    
    // Follow-up preparation
    tasks.push({
      id: `followup_${Date.now()}`,
      type: 'task',
      title: 'Prepare follow-up template',
      content: 'Create template for post-meeting summary including action items, decisions, and next steps',
      priority: 'low',
      completed: false,
      dueDate: new Date(startTime.getTime() - 15 * 60 * 1000) // 15 minutes before
    });
    
    return tasks;
  }

  private async gatherRelevantEmails(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<MeetingPreparationItem[]> {
    try {
      // This would integrate with Gmail API or other email services
      const relevantEmails = await this.searchRelevantEmails(meetingTitle, attendees, description);
      
      if (relevantEmails.length === 0) {
        return [];
      }
      
      return [{
        id: `emails_${Date.now()}`,
        type: 'email',
        title: `Review ${relevantEmails.length} relevant emails`,
        content: `Found ${relevantEmails.length} email threads related to this meeting:\n` + 
                relevantEmails.map(email => `• ${email.subject} (from ${email.from})`).join('\n'),
        priority: 'medium',
        completed: false,
        dueDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        relatedEmails: relevantEmails
      }];
      
    } catch (error) {
      console.error('Email gathering error:', error);
      return [];
    }
  }

  private async findRelevantDocuments(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<MeetingPreparationItem[]> {
    try {
      // This would integrate with Google Drive, SharePoint, or other document services
      const relevantDocs = await this.searchRelevantDocuments(meetingTitle, attendees, description);
      
      if (relevantDocs.length === 0) {
        return [];
      }
      
      return [{
        id: `docs_${Date.now()}`,
        type: 'document',
        title: `Review ${relevantDocs.length} relevant documents`,
        content: `Found ${relevantDocs.length} documents related to this meeting:\n` + 
                relevantDocs.map(doc => `• ${doc.title} (${doc.type})`).join('\n'),
        priority: 'medium',
        completed: false,
        dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        attachments: relevantDocs.map(doc => doc.url)
      }];
      
    } catch (error) {
      console.error('Document search error:', error);
      return [];
    }
  }

  private async prepareContactInformation(attendees: string[]): Promise<MeetingPreparationItem[]> {
    if (attendees.length === 0) {
      return [];
    }
    
    try {
      const contactInfo = await this.gatherContactInformation(attendees);
      
      return [{
        id: `contacts_${Date.now()}`,
        type: 'contact',
        title: 'Review attendee information',
        content: `Meeting attendees (${attendees.length}):\n` + 
                contactInfo.map(contact => 
                  `• ${contact.name} (${contact.email})${contact.role ? ` - ${contact.role}` : ''}`
                ).join('\n'),
        priority: 'low',
        completed: false,
        relatedContacts: contactInfo
      }];
      
    } catch (error) {
      console.error('Contact preparation error:', error);
      return [];
    }
  }

  private async generateMeetingIntelligence(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<MeetingPreparationItem[]> {
    try {
      const intelligence = await this.analyzeMeetingContext(meetingTitle, attendees, description);
      const items: MeetingPreparationItem[] = [];
      
      // Key topics preparation
      if (intelligence.keyTopics.length > 0) {
        items.push({
          id: `topics_${Date.now()}`,
          type: 'note',
          title: 'Key discussion topics',
          content: `Main topics to cover:\n` + intelligence.keyTopics.map(topic => `• ${topic}`).join('\n'),
          priority: 'high',
          completed: false
        });
      }
      
      // Previous meetings context
      if (intelligence.previousMeetings.length > 0) {
        items.push({
          id: `history_${Date.now()}`,
          type: 'note',
          title: 'Previous meeting context',
          content: `Related previous meetings:\n` + 
                  intelligence.previousMeetings.map(meeting => 
                    `• ${meeting.title} (${meeting.date.toLocaleDateString()}): ${meeting.summary}`
                  ).join('\n'),
          priority: 'medium',
          completed: false
        });
      }
      
      // Action items follow-up
      if (intelligence.actionItems.length > 0) {
        items.push({
          id: `actions_${Date.now()}`,
          type: 'task',
          title: 'Review pending action items',
          content: `Outstanding action items to discuss:\n` + 
                  intelligence.actionItems.map(item => 
                    `• ${item.description} (${item.assignee || 'Unassigned'}) - ${item.status}`
                  ).join('\n'),
          priority: 'high',
          completed: false
        });
      }
      
      return items;
      
    } catch (error) {
      console.error('Meeting intelligence error:', error);
      return [];
    }
  }

  // Integration methods (would connect to actual services)
  
  private async searchRelevantEmails(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<EmailReference[]> {
    // This would integrate with Gmail API
    // For now, return mock data based on common patterns
    
    const mockEmails: EmailReference[] = [];
    const keywords = this.extractKeywords(meetingTitle + ' ' + (description || ''));
    
    // Generate relevant email references based on keywords
    if (keywords.includes('project') || keywords.includes('planning')) {
      mockEmails.push({
        id: 'email_1',
        subject: 'Project Update and Planning',
        from: attendees[0] || 'colleague@company.com',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        snippet: 'Here are the latest updates on the project timeline and resource allocation...',
        relevanceScore: 0.8
      });
    }
    
    return mockEmails;
  }

  private async searchRelevantDocuments(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<DocumentReference[]> {
    // This would integrate with Google Drive, SharePoint, etc.
    const mockDocs: DocumentReference[] = [];
    const keywords = this.extractKeywords(meetingTitle + ' ' + (description || ''));
    
    if (keywords.includes('presentation') || keywords.includes('review')) {
      mockDocs.push({
        id: 'doc_1',
        title: 'Project Presentation Draft',
        type: 'PowerPoint',
        url: '/documents/project-presentation.pptx',
        lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        relevanceScore: 0.9
      });
    }
    
    return mockDocs;
  }

  private async gatherContactInformation(attendees: string[]): Promise<ContactReference[]> {
    // This would integrate with contacts API
    return attendees.map((email, index) => ({
      id: `contact_${index}`,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      relevanceScore: 1.0
    }));
  }

  private async analyzeMeetingContext(
    meetingTitle: string,
    attendees: string[],
    description?: string
  ): Promise<MeetingIntelligence> {
    // This would use AI/ML to analyze context
    const keywords = this.extractKeywords(meetingTitle + ' ' + (description || ''));
    
    return {
      keyTopics: keywords.slice(0, 5), // Top 5 keywords as topics
      previousMeetings: [], // Would be populated from meeting history
      actionItems: [], // Would be populated from previous meetings
      decisions: [],
      risks: [],
      opportunities: []
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (would use more sophisticated NLP in production)
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text.toLowerCase().split(/\W+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );
    
    return [...new Set(words)]; // Remove duplicates
  }

  private generateFallbackTasks(meetingTitle: string, startTime: Date): MeetingPreparationItem[] {
    return [{
      id: `fallback_${Date.now()}`,
      type: 'task',
      title: 'Basic meeting preparation',
      content: `Prepare for "${meetingTitle}":\n• Review meeting agenda\n• Gather relevant materials\n• Test technology\n• Prepare questions and discussion points`,
      priority: 'medium',
      completed: false,
      dueDate: new Date(startTime.getTime() - 30 * 60 * 1000)
    }];
  }
}

// Create singleton instance
export const meetingPreparationService = new MeetingPreparationService();