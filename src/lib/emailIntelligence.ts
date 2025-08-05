// Intelligent Email Management System with AI-powered categorization and prioritization

export interface EmailMessage {
  id: string;
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
  };
  // AI-enhanced properties
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  category?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  aiSummary?: string;
  suggestedActions?: string[];
  isSpam?: boolean;
  confidence?: number;
}

export interface EmailCategory {
  name: string;
  description: string;
  keywords: string[];
  urgencyMultiplier: number;
  color: string;
  icon: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
}

export class EmailIntelligence {
  private categories: EmailCategory[] = [];
  private templates: EmailTemplate[] = [];
  private priorityKeywords: Record<string, number> = {};
  private spamKeywords: string[] = [];

  constructor() {
    this.initializeCategories();
    this.initializeTemplates();
    this.initializePriorityKeywords();
    this.initializeSpamDetection();
  }

  private initializeCategories(): void {
    this.categories = [
      {
        name: 'Work',
        description: 'Professional and business-related emails',
        keywords: ['meeting', 'project', 'deadline', 'report', 'proposal', 'contract', 'client', 'colleague', 'office', 'work', 'business', 'professional'],
        urgencyMultiplier: 1.2,
        color: '#3B82F6',
        icon: 'briefcase'
      },
      {
        name: 'Personal',
        description: 'Personal correspondence and family emails',
        keywords: ['family', 'friend', 'personal', 'birthday', 'wedding', 'vacation', 'dinner', 'weekend', 'holiday'],
        urgencyMultiplier: 0.8,
        color: '#10B981',
        icon: 'user'
      },
      {
        name: 'Financial',
        description: 'Banking, payments, and financial matters',
        keywords: ['bank', 'payment', 'invoice', 'bill', 'receipt', 'transaction', 'account', 'credit', 'debit', 'financial', 'money', 'loan'],
        urgencyMultiplier: 1.5,
        color: '#F59E0B',
        icon: 'dollar-sign'
      },
      {
        name: 'Shopping',
        description: 'Online purchases and retail communications',
        keywords: ['order', 'purchase', 'shipping', 'delivery', 'store', 'shop', 'cart', 'checkout', 'product', 'sale', 'discount'],
        urgencyMultiplier: 0.6,
        color: '#8B5CF6',
        icon: 'shopping-bag'
      },
      {
        name: 'Travel',
        description: 'Flight bookings, hotels, and travel arrangements',
        keywords: ['flight', 'hotel', 'booking', 'reservation', 'travel', 'trip', 'vacation', 'airport', 'airline', 'ticket'],
        urgencyMultiplier: 1.3,
        color: '#EF4444',
        icon: 'plane'
      },
      {
        name: 'Newsletters',
        description: 'Subscriptions and informational content',
        keywords: ['newsletter', 'subscription', 'unsubscribe', 'weekly', 'monthly', 'digest', 'news', 'update', 'blog'],
        urgencyMultiplier: 0.3,
        color: '#6B7280',
        icon: 'newspaper'
      },
      {
        name: 'Medical',
        description: 'Healthcare and medical appointments',
        keywords: ['doctor', 'appointment', 'medical', 'health', 'clinic', 'hospital', 'prescription', 'treatment', 'checkup'],
        urgencyMultiplier: 1.4,
        color: '#DC2626',
        icon: 'heart'
      },
      {
        name: 'Education',
        description: 'School, courses, and educational content',
        keywords: ['school', 'course', 'class', 'education', 'student', 'teacher', 'assignment', 'exam', 'grade', 'university'],
        urgencyMultiplier: 1.0,
        color: '#059669',
        icon: 'book'
      }
    ];
  }

  private initializeTemplates(): void {
    this.templates = [
      {
        id: '1',
        name: 'Meeting Request',
        subject: 'Meeting Request: {topic}',
        body: `Dear {recipient},\n\nI hope this email finds you well. I would like to schedule a meeting to discuss {topic}.\n\nProposed time: {datetime}\nDuration: {duration}\nLocation/Platform: {location}\n\nPlease let me know if this time works for you, or suggest an alternative.\n\nBest regards,\n{sender}`,
        category: 'Work',
        variables: ['recipient', 'topic', 'datetime', 'duration', 'location', 'sender']
      },
      {
        id: '2',
        name: 'Follow-up',
        subject: 'Follow-up: {subject}',
        body: `Dear {recipient},\n\nI wanted to follow up on our previous discussion regarding {topic}.\n\n{details}\n\nPlease let me know if you need any additional information or have any questions.\n\nBest regards,\n{sender}`,
        category: 'Work',
        variables: ['recipient', 'subject', 'topic', 'details', 'sender']
      },
      {
        id: '3',
        name: 'Thank You',
        subject: 'Thank you for {reason}',
        body: `Dear {recipient},\n\nThank you for {reason}. I really appreciate {details}.\n\n{additional_message}\n\nWith gratitude,\n{sender}`,
        category: 'Personal',
        variables: ['recipient', 'reason', 'details', 'additional_message', 'sender']
      },
      {
        id: '4',
        name: 'Appointment Confirmation',
        subject: 'Appointment Confirmation - {date}',
        body: `Dear {recipient},\n\nThis is to confirm your appointment scheduled for:\n\nDate: {date}\nTime: {time}\nLocation: {location}\nPurpose: {purpose}\n\nPlease arrive 15 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.\n\nBest regards,\n{sender}`,
        category: 'Medical',
        variables: ['recipient', 'date', 'time', 'location', 'purpose', 'sender']
      },
      {
        id: '5',
        name: 'Invoice Reminder',
        subject: 'Payment Reminder: Invoice #{invoice_number}',
        body: `Dear {recipient},\n\nThis is a friendly reminder that invoice #{invoice_number} for {amount} is due on {due_date}.\n\nInvoice Details:\n- Amount: {amount}\n- Due Date: {due_date}\n- Description: {description}\n\nPlease process the payment at your earliest convenience. If you have already made the payment, please disregard this message.\n\nThank you,\n{sender}`,
        category: 'Financial',
        variables: ['recipient', 'invoice_number', 'amount', 'due_date', 'description', 'sender']
      }
    ];
  }

  private initializePriorityKeywords(): void {
    this.priorityKeywords = {
      // Urgent keywords
      'urgent': 3,
      'emergency': 3,
      'asap': 3,
      'immediate': 3,
      'critical': 3,
      'deadline': 2.5,
      'important': 2,
      'priority': 2,
      'action required': 2.5,
      'time sensitive': 2.5,
      'overdue': 2.5,
      'final notice': 3,
      'expires': 2,
      'reminder': 1.5,
      'follow up': 1.2,
      'meeting': 1.5,
      'appointment': 1.5,
      'interview': 2,
      'payment': 2,
      'invoice': 1.8,
      'medical': 2.2,
      'doctor': 2,
      'hospital': 2.5
    };
  }

  private initializeSpamDetection(): void {
    this.spamKeywords = [
      'free money', 'lottery winner', 'nigerian prince', 'inheritance',
      'click here now', 'act now', 'limited time offer', 'congratulations you won',
      'make money fast', 'work from home', 'lose weight', 'viagra',
      'casino', 'gambling', 'bitcoin investment', 'cryptocurrency scam',
      'verify account immediately', 'suspended account', 'click to verify'
    ];
  }

  // Main classification method
  classifyEmail(email: EmailMessage): EmailMessage {
    const subject = this.getHeaderValue(email.payload.headers, 'Subject').toLowerCase();
    const from = this.getHeaderValue(email.payload.headers, 'From').toLowerCase();
    const snippet = email.snippet.toLowerCase();
    const content = `${subject} ${from} ${snippet}`;

    // Categorize email
    const category = this.categorizeEmail(content);
    
    // Calculate priority
    const priority = this.calculatePriority(content, category);
    
    // Detect spam
    const isSpam = this.detectSpam(content);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(snippet);
    
    // Generate AI summary
    const aiSummary = this.generateSummary(email);
    
    // Suggest actions
    const suggestedActions = this.suggestActions(email, category, priority);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(content, category);

    return {
      ...email,
      category: category.name,
      priority,
      sentiment,
      aiSummary,
      suggestedActions,
      isSpam,
      confidence
    };
  }

  private categorizeEmail(content: string): EmailCategory {
    let bestMatch = this.categories[1]; // Default to Personal
    let maxScore = 0;

    for (const category of this.categories) {
      let score = 0;
      for (const keyword of category.keywords) {
        const keywordCount = (content.match(new RegExp(keyword, 'gi')) || []).length;
        score += keywordCount;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  private calculatePriority(content: string, category: EmailCategory): 'urgent' | 'high' | 'medium' | 'low' {
    let priorityScore = 1;

    // Check for priority keywords
    for (const [keyword, multiplier] of Object.entries(this.priorityKeywords)) {
      if (content.includes(keyword)) {
        priorityScore *= multiplier;
      }
    }

    // Apply category multiplier
    priorityScore *= category.urgencyMultiplier;

    // Check for time-sensitive patterns
    if (content.match(/\b(today|tomorrow|by \d+|within \d+)\b/i)) {
      priorityScore *= 1.5;
    }

    // Check for question marks (often require response)
    const questionCount = (content.match(/\?/g) || []).length;
    priorityScore *= (1 + questionCount * 0.2);

    // Convert score to priority level
    if (priorityScore >= 3) return 'urgent';
    if (priorityScore >= 2) return 'high';
    if (priorityScore >= 1.2) return 'medium';
    return 'low';
  }

  private detectSpam(content: string): boolean {
    const spamScore = this.spamKeywords.reduce((score, keyword) => {
      return content.includes(keyword) ? score + 1 : score;
    }, 0);

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\b[A-Z]{3,}\b.*\b[A-Z]{3,}\b/g, // Multiple ALL CAPS words
      /\$\d+,?\d*\.?\d*/g, // Money amounts
      /click here/gi,
      /free.{0,20}(money|cash|gift)/gi,
      /act now/gi
    ];

    const patternMatches = suspiciousPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    return spamScore >= 2 || patternMatches >= 3;
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['thank', 'great', 'excellent', 'wonderful', 'good', 'pleased', 'happy', 'congratulat', 'success', 'approve'];
    const negativeWords = ['problem', 'issue', 'error', 'fail', 'disappoint', 'concern', 'urgent', 'emergency', 'cancel', 'reject'];

    const positiveCount = positiveWords.reduce((count, word) => {
      return count + (text.match(new RegExp(word, 'gi')) || []).length;
    }, 0);

    const negativeCount = negativeWords.reduce((count, word) => {
      return count + (text.match(new RegExp(word, 'gi')) || []).length;
    }, 0);

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private generateSummary(email: EmailMessage): string {
    const subject = this.getHeaderValue(email.payload.headers, 'Subject');
    const from = this.getHeaderValue(email.payload.headers, 'From').split('<')[0].trim();
    const snippet = email.snippet;

    // Extract key information
    const wordCount = snippet.split(' ').length;
    
    if (wordCount <= 15) {
      return snippet; // Short enough, return as is
    }

    // Simple extractive summary - take first and potentially last sentence
    const sentences = snippet.split('.').filter(s => s.trim().length > 10);
    if (sentences.length === 1) {
      return sentences[0].trim() + '.';
    }

    const summary = sentences[0].trim();
    return summary.length > 100 ? summary.substring(0, 97) + '...' : summary + '.';
  }

  private suggestActions(email: EmailMessage, category: EmailCategory, priority: string): string[] {
    const actions: string[] = [];
    const subject = this.getHeaderValue(email.payload.headers, 'Subject').toLowerCase();
    const snippet = email.snippet.toLowerCase();

    // Priority-based actions
    if (priority === 'urgent') {
      actions.push('Respond immediately');
      actions.push('Mark as important');
    } else if (priority === 'high') {
      actions.push('Respond today');
    }

    // Content-based actions
    if (snippet.includes('meeting') || snippet.includes('schedule')) {
      actions.push('Add to calendar');
      actions.push('Check availability');
    }

    if (snippet.includes('attachment') || snippet.includes('attached')) {
      actions.push('Download attachments');
    }

    if (snippet.includes('invoice') || snippet.includes('payment') || snippet.includes('bill')) {
      actions.push('Review payment details');
      actions.push('Add to expense tracker');
    }

    if (snippet.includes('deadline') || snippet.includes('due')) {
      actions.push('Set reminder');
      actions.push('Add to task list');
    }

    if (snippet.includes('confirm') || snippet.includes('rsvp')) {
      actions.push('Send confirmation');
    }

    // Category-based actions
    switch (category.name) {
      case 'Work':
        if (!actions.includes('Respond today')) actions.push('Respond within 24 hours');
        break;
      case 'Financial':
        actions.push('Verify sender');
        actions.push('Check account');
        break;
      case 'Medical':
        actions.push('Call to confirm');
        actions.push('Add to health records');
        break;
      case 'Travel':
        actions.push('Save booking details');
        actions.push('Add to travel itinerary');
        break;
    }

    // Default actions if none found
    if (actions.length === 0) {
      actions.push('Read and decide');
      if (priority !== 'low') {
        actions.push('Consider replying');
      }
    }

    return actions.slice(0, 3); // Limit to 3 actions
  }

  private calculateConfidence(content: string, category: EmailCategory): number {
    const keywordMatches = category.keywords.filter(keyword => 
      content.includes(keyword)
    ).length;
    
    const maxPossibleMatches = Math.min(category.keywords.length, 5);
    const confidence = Math.min((keywordMatches / maxPossibleMatches) * 100, 95);
    
    return Math.max(confidence, 15); // Minimum 15% confidence
  }

  private getHeaderValue(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  // Public methods for accessing data
  getCategories(): EmailCategory[] {
    return [...this.categories];
  }

  getTemplates(): EmailTemplate[] {
    return [...this.templates];
  }

  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  // Smart reply generation
  generateSmartReply(email: EmailMessage, replyType: 'accept' | 'decline' | 'acknowledge' | 'request_info'): string {
    const from = this.getHeaderValue(email.payload.headers, 'From').split('<')[0].trim();
    const subject = this.getHeaderValue(email.payload.headers, 'Subject');
    
    switch (replyType) {
      case 'accept':
        return `Dear ${from},\n\nThank you for your email regarding "${subject}". I accept your proposal/invitation.\n\nPlease let me know the next steps.\n\nBest regards`;
      
      case 'decline':
        return `Dear ${from},\n\nThank you for your email regarding "${subject}". Unfortunately, I won't be able to proceed with this at the moment.\n\nI appreciate your understanding.\n\nBest regards`;
      
      case 'acknowledge':
        return `Dear ${from},\n\nThank you for your email regarding "${subject}". I have received your message and will review it carefully.\n\nI will get back to you soon.\n\nBest regards`;
      
      case 'request_info':
        return `Dear ${from},\n\nThank you for your email regarding "${subject}". I would like to proceed, but I need some additional information.\n\nCould you please provide more details about:\n- [Please specify]\n\nBest regards`;
      
      default:
        return '';
    }
  }

  // Email search and filtering
  searchEmails(emails: EmailMessage[], query: string): EmailMessage[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return emails.filter(email => {
      const searchableContent = [
        this.getHeaderValue(email.payload.headers, 'Subject'),
        this.getHeaderValue(email.payload.headers, 'From'),
        email.snippet,
        email.category || '',
        email.aiSummary || ''
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableContent.includes(term));
    });
  }

  // Batch processing
  batchClassifyEmails(emails: EmailMessage[]): EmailMessage[] {
    return emails.map(email => this.classifyEmail(email));
  }

  // Export email data for analysis
  exportEmailAnalytics(emails: EmailMessage[]) {
    const analytics = {
      totalEmails: emails.length,
      categoryCounts: {} as Record<string, number>,
      priorityCounts: {} as Record<string, number>,
      sentimentCounts: {} as Record<string, number>,
      spamCount: 0,
      averageConfidence: 0
    };

    emails.forEach(email => {
      // Category counts
      if (email.category) {
        analytics.categoryCounts[email.category] = (analytics.categoryCounts[email.category] || 0) + 1;
      }

      // Priority counts
      if (email.priority) {
        analytics.priorityCounts[email.priority] = (analytics.priorityCounts[email.priority] || 0) + 1;
      }

      // Sentiment counts
      if (email.sentiment) {
        analytics.sentimentCounts[email.sentiment] = (analytics.sentimentCounts[email.sentiment] || 0) + 1;
      }

      // Spam count
      if (email.isSpam) {
        analytics.spamCount++;
      }
    });

    // Calculate average confidence
    const totalConfidence = emails.reduce((sum, email) => sum + (email.confidence || 0), 0);
    analytics.averageConfidence = emails.length > 0 ? totalConfidence / emails.length : 0;

    return analytics;
  }
}

// Create singleton instance
export const emailIntelligence = new EmailIntelligence();