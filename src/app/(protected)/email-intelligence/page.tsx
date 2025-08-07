'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail,
  Inbox,
  Send,
  Archive,
  Star,
  Clock,
  Filter,
  Brain,
  Zap,
  TrendingUp,
  Search,
  Settings,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Reply,
  Forward,
  Eye,
  BarChart3,
  Activity,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';
import { GmailApiService, initializeGmailApi } from '@/lib/gmailApi';

interface Email {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  timestamp: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  category: 'primary' | 'social' | 'promotions' | 'updates' | 'work' | 'personal';
  priority: 'high' | 'medium' | 'low' | 'urgent';
  needsResponse: boolean;
  responseDeadline?: Date;
  aiSummary?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

interface EmailFilter {
  id: string;
  name: string;
  description: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  isActive: boolean;
  matchCount: number;
}

interface FilterCondition {
  field: 'sender' | 'subject' | 'body' | 'attachment';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
}

interface FilterAction {
  type: 'label' | 'category' | 'priority' | 'archive' | 'star';
  value: string;
}

interface ResponseTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  useCount: number;
  lastUsed?: Date;
}

interface FollowUpReminder {
  id: string;
  emailId: string;
  emailSubject: string;
  sender: string;
  reminderDate: Date;
  status: 'pending' | 'completed' | 'overdue';
  notes?: string;
}

export default function EmailIntelligencePage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [filters, setFilters] = useState<EmailFilter[]>([]);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpReminder[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading] = useState(false);
  const [view] = useState<'inbox' | 'sent' | 'starred' | 'important'>('inbox');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [gmailService, setGmailService] = useState<GmailApiService | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Initialize Gmail API connection
  const initializeGmailConnection = useCallback(async () => {
    try {
      // Check if we have stored Gmail credentials
      const storedCredentials = localStorage.getItem('gmail_credentials');
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        const service = initializeGmailApi(credentials);
        
        // Test connection by getting profile
        await service.getProfile();
        setGmailService(service);
        setIsConnected(true);
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize Gmail connection:', error);
      setIsConnected(false);
    }
    return false;
  }, []);

  // Sync emails from Gmail
  const syncEmails = useCallback(async () => {
    if (!gmailService) return;

    setSyncStatus('syncing');
    try {
      // Get emails from different sources
      const [inboxEmails] = await Promise.all([
        gmailService.listEmails({ maxResults: 50 })
      ]);

      // Convert ProcessedEmail to our Email interface
      const convertedEmails: Email[] = inboxEmails.emails.map(processedEmail => ({
        id: processedEmail.id,
        subject: getHeaderValue(processedEmail.payload.headers, 'Subject'),
        sender: getHeaderValue(processedEmail.payload.headers, 'From').split('<')[0].trim(),
        senderEmail: getHeaderValue(processedEmail.payload.headers, 'From'),
        snippet: processedEmail.snippet,
        timestamp: processedEmail.internalDate || new Date(),
        isRead: !processedEmail.labelIds.includes('UNREAD'),
        isStarred: processedEmail.labelIds.includes('STARRED'),
        labels: processedEmail.labelIds,
        category: mapCategoryToLocal(processedEmail.category || 'primary'),
        priority: processedEmail.priority || 'medium',
        needsResponse: processedEmail.suggestedActions?.some(action => 
          action.includes('respond') || action.includes('reply')
        ) || false,
        responseDeadline: processedEmail.priority === 'urgent' ? 
          new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
        aiSummary: processedEmail.aiSummary,
        sentiment: processedEmail.sentiment || 'neutral',
        confidence: processedEmail.confidence || 0.8
      }));

      setEmails(convertedEmails);
      setSyncStatus('success');
      
      // Auto-hide success status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to sync emails:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [gmailService]);

  // Helper function to get header value
  const getHeaderValue = (headers: any[], name: string): string => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  // Map Gmail categories to our local categories
  const mapCategoryToLocal = (category: string): 'primary' | 'social' | 'promotions' | 'updates' | 'work' | 'personal' => {
    const categoryMap: Record<string, 'primary' | 'social' | 'promotions' | 'updates' | 'work' | 'personal'> = {
      'Work': 'work',
      'Personal': 'personal',
      'Social': 'social',
      'Newsletters': 'updates',
      'Shopping': 'promotions',
      'Financial': 'work'
    };
    return categoryMap[category] || 'primary';
  };

  // Initialize connection on mount
  useEffect(() => {
    initializeGmailConnection();
  }, [initializeGmailConnection]);

  // Auto-sync emails when connected
  useEffect(() => {
    if (isConnected && gmailService) {
      syncEmails();
    }
  }, [isConnected, gmailService, syncEmails]);

  // Mock data for demonstration (fallback when not connected)
  useEffect(() => {
    const mockEmails: Email[] = [
      {
        id: '1',
        subject: 'Q4 Budget Review Meeting',
        sender: 'Sarah Johnson',
        senderEmail: 'sarah.johnson@company.com',
        snippet: 'Hi team, I wanted to schedule our Q4 budget review meeting for next week. Please let me know your availability...',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        isStarred: true,
        labels: ['work', 'urgent'],
        category: 'work',
        priority: 'high',
        needsResponse: true,
        responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        aiSummary: 'Meeting request for Q4 budget review with availability inquiry',
        sentiment: 'neutral',
        confidence: 0.85
      },
      {
        id: '2',
        subject: 'Your LinkedIn Weekly Summary',
        sender: 'LinkedIn',
        senderEmail: 'noreply@linkedin.com',
        snippet: 'See who viewed your profile this week and connect with new opportunities...',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        labels: ['social', 'newsletter'],
        category: 'social',
        priority: 'low',
        needsResponse: false,
        aiSummary: 'Weekly LinkedIn activity summary with profile views and opportunities',
        sentiment: 'positive',
        confidence: 0.92
      },
      {
        id: '3',
        subject: 'Project Update: New Features Released',
        sender: 'Development Team',
        senderEmail: 'dev-team@company.com',
        snippet: 'We are excited to announce that the new user dashboard features have been deployed to production...',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        labels: ['work', 'updates'],
        category: 'work',
        priority: 'medium',
        needsResponse: false,
        aiSummary: 'Development team announcement about new dashboard features deployment',
        sentiment: 'positive',
        confidence: 0.88
      },
      {
        id: '4',
        subject: 'Action Required: Complete Annual Training',
        sender: 'HR Department',
        senderEmail: 'hr@company.com',
        snippet: 'This is a reminder that your annual compliance training is due by the end of this month...',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        isRead: false,
        isStarred: false,
        labels: ['work', 'action-required'],
        category: 'work',
        priority: 'high',
        needsResponse: true,
        responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        aiSummary: 'HR reminder about mandatory annual compliance training deadline',
        sentiment: 'neutral',
        confidence: 0.90
      },
      {
        id: '5',
        subject: 'Weekend Sale: 50% Off Everything!',
        sender: 'Fashion Store',
        senderEmail: 'sales@fashionstore.com',
        snippet: 'Don\'t miss out on our biggest sale of the year! Get 50% off all items this weekend only...',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isRead: true,
        isStarred: false,
        labels: ['promotions', 'shopping'],
        category: 'promotions',
        priority: 'low',
        needsResponse: false,
        aiSummary: 'Promotional email advertising 50% weekend sale at fashion retailer',
        sentiment: 'positive',
        confidence: 0.95
      }
    ];

    const mockFilters: EmailFilter[] = [
      {
        id: '1',
        name: 'Work Emails',
        description: 'Automatically categorize emails from work domain',
        conditions: [
          { field: 'sender', operator: 'contains', value: '@company.com' }
        ],
        actions: [
          { type: 'category', value: 'work' },
          { type: 'label', value: 'work' }
        ],
        isActive: true,
        matchCount: 156
      },
      {
        id: '2',
        name: 'Urgent Emails',
        description: 'Mark emails with urgent keywords as high priority',
        conditions: [
          { field: 'subject', operator: 'contains', value: 'urgent' }
        ],
        actions: [
          { type: 'priority', value: 'high' },
          { type: 'star', value: 'true' }
        ],
        isActive: true,
        matchCount: 23
      }
    ];

    const mockTemplates: ResponseTemplate[] = [
      {
        id: '1',
        name: 'Meeting Acceptance',
        subject: 'Re: {original_subject}',
        content: 'Thank you for the invitation. I confirm my attendance at the meeting. Looking forward to it.\n\nBest regards,\n{signature}',
        category: 'meetings',
        useCount: 45,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Request More Information',
        subject: 'Re: {original_subject} - Additional Information Needed',
        content: 'Thank you for your email. To better assist you, could you please provide additional details about:\n\n- [Specific information needed]\n- [Timeline requirements]\n\nI look forward to hearing from you.\n\nBest regards,\n{signature}',
        category: 'inquiries',
        useCount: 32,
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];

    const mockFollowUps: FollowUpReminder[] = [
      {
        id: '1',
        emailId: '1',
        emailSubject: 'Q4 Budget Review Meeting',
        sender: 'Sarah Johnson',
        reminderDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'pending',
        notes: 'Need to respond with availability'
      },
      {
        id: '2',
        emailId: '4',
        emailSubject: 'Action Required: Complete Annual Training',
        sender: 'HR Department',
        reminderDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
        notes: 'Complete training by month end'
      }
    ];

    // Only use mock data if not connected to Gmail
    if (!isConnected) {
      setEmails(mockEmails);
      setFilters(mockFilters);
      setTemplates(mockTemplates);
      setFollowUps(mockFollowUps);
    }
  }, [isConnected]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'work': return 'text-blue-600 bg-blue-100';
      case 'personal': return 'text-purple-600 bg-purple-100';
      case 'social': return 'text-pink-600 bg-pink-100';
      case 'promotions': return 'text-orange-600 bg-orange-100';
      case 'updates': return 'text-cyan-600 bg-cyan-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredEmails = emails.filter(email => {
    if (categoryFilter !== 'all' && email.category !== categoryFilter) return false;
    if (searchQuery && !email.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.sender.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const emailStats = {
    total: emails.length,
    unread: emails.filter(e => !e.isRead).length,
    starred: emails.filter(e => e.isStarred).length,
    needsResponse: emails.filter(e => e.needsResponse).length,
    highPriority: emails.filter(e => e.priority === 'high').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Email Intelligence
                </h1>
                <p className="text-gray-600 font-medium mt-1">Smart email management with AI-powered insights and automation</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Gmail Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Using Demo Data</span>
                  </div>
                )}
              </div>
              
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
              
              <Button 
                onClick={syncEmails}
                disabled={!isConnected || syncStatus === 'syncing'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${
                  syncStatus === 'syncing' ? 'animate-spin' : ''
                }`} />
                {syncStatus === 'syncing' ? 'Syncing...' : 
                 syncStatus === 'success' ? 'Synced!' :
                 syncStatus === 'error' ? 'Sync Failed' : 'Sync Emails'}
              </Button>
            </div>
          </div>
        </div>

      {/* Email Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold">{emailStats.total}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-orange-600">{emailStats.unread}</p>
              </div>
              <Eye className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Starred</p>
                <p className="text-2xl font-bold text-yellow-600">{emailStats.starred}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Response</p>
                <p className="text-2xl font-bold text-red-600">{emailStats.needsResponse}</p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-purple-600">{emailStats.highPriority}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value="inbox" onValueChange={() => {}} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Smart Filters
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="social">Social</option>
              <option value="promotions">Promotions</option>
              <option value="updates">Updates</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Emails ({filteredEmails.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    <div className="space-y-1">
                      {filteredEmails.map((email) => (
                        <div
                          key={email.id}
                          className={`
                            p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors
                            ${selectedEmail?.id === email.id ? 'bg-muted' : ''}
                            ${!email.isRead ? 'border-l-4 border-l-primary' : ''}
                          `}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium ${!email.isRead ? 'font-bold' : ''}`}>
                                {email.sender}
                              </h3>
                              {email.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                              {getSentimentIcon(email.sentiment)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(email.priority)}>
                                {email.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {email.timestamp.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <p className={`text-sm mb-2 ${!email.isRead ? 'font-semibold' : ''}`}>
                            {email.subject}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mb-2">
                            {email.snippet.substring(0, 100)}...
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              <Badge className={getCategoryColor(email.category)}>
                                {email.category}
                              </Badge>
                              {email.needsResponse && (
                                <Badge variant="destructive">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Response Needed
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="w-3 h-3" />
                              {Math.round(email.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Email Preview */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Email Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedEmail ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold">{selectedEmail.subject}</h3>
                        <p className="text-sm text-muted-foreground">
                          From: {selectedEmail.sender} &lt;{selectedEmail.senderEmail}&gt;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedEmail.timestamp.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getPriorityColor(selectedEmail.priority)}>
                          {selectedEmail.priority} priority
                        </Badge>
                        <Badge className={getCategoryColor(selectedEmail.category)}>
                          {selectedEmail.category}
                        </Badge>
                        {selectedEmail.needsResponse && (
                          <Badge variant="destructive">Response needed</Badge>
                        )}
                      </div>

                      {selectedEmail.aiSummary && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">AI Summary</span>
                          </div>
                          <p className="text-sm text-blue-800">{selectedEmail.aiSummary}</p>
                        </div>
                      )}
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{selectedEmail.snippet}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm">
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </Button>
                        <Button size="sm" variant="outline">
                          <Forward className="w-4 h-4 mr-2" />
                          Forward
                        </Button>
                        <Button size="sm" variant="outline">
                          <Archive className="w-4 h-4 mr-2" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select an email to preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Smart Filters Tab */}
        <TabsContent value="filters" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Smart Email Filters</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Filter
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filters.map((filter) => (
              <Card key={filter.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{filter.name}</CardTitle>
                    <Badge variant={filter.isActive ? "default" : "secondary"}>
                      {filter.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{filter.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Conditions</h4>
                    <div className="space-y-1">
                      {filter.conditions.map((condition, index) => (
                        <div key={index} className="text-sm bg-muted p-2 rounded">
                          <span className="font-medium">{condition.field}</span> {condition.operator} 
                          <span className="ml-1 font-mono">"{condition.value}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Actions</h4>
                    <div className="space-y-1">
                      {filter.actions.map((action, index) => (
                        <div key={index} className="text-sm bg-green-50 p-2 rounded">
                          <span className="font-medium">{action.type}</span>: {action.value}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Matched {filter.matchCount} emails
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">
                        {filter.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Response Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Response Templates</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge>{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Subject</h4>
                    <p className="text-sm bg-muted p-2 rounded font-mono">
                      {template.subject}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Content Preview</h4>
                    <div className="text-sm bg-muted p-3 rounded max-h-32 overflow-y-auto">
                      {template.content.substring(0, 200)}...
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <p>Used {template.useCount} times</p>
                      {template.lastUsed && (
                        <p>Last used: {template.lastUsed.toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm">Use</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Follow-up Reminders</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Pending Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {followUps.map((followUp) => (
                  <div key={followUp.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{followUp.emailSubject}</h3>
                      <p className="text-sm text-muted-foreground">From: {followUp.sender}</p>
                      <p className="text-sm text-muted-foreground">
                        Reminder: {followUp.reminderDate.toLocaleString()}
                      </p>
                      {followUp.notes && (
                        <p className="text-sm mt-2 text-blue-600">{followUp.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        followUp.status === 'overdue' ? 'destructive' :
                        followUp.status === 'pending' ? 'default' : 'secondary'
                      }>
                        {followUp.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Email Analytics & Insights</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">3.2h</p>
                    <p className="text-xs text-green-600">↓ 15% vs last week</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Email Efficiency</p>
                    <p className="text-2xl font-bold">87%</p>
                    <p className="text-xs text-green-600">↑ 8% vs last week</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI Accuracy</p>
                    <p className="text-2xl font-bold">92%</p>
                    <p className="text-xs text-blue-600">Stable</p>
                  </div>
                  <Brain className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Spam Blocked</p>
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-xs text-orange-600">↑ 12% vs last week</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Volume and Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Email Categories Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Category breakdown */}
                  {[
                    { category: 'Work', count: 45, percentage: 42, color: 'bg-blue-500' },
                    { category: 'Personal', count: 28, percentage: 26, color: 'bg-green-500' },
                    { category: 'Promotions', count: 18, percentage: 17, color: 'bg-orange-500' },
                    { category: 'Social', count: 12, percentage: 11, color: 'bg-purple-500' },
                    { category: 'Updates', count: 5, percentage: 4, color: 'bg-gray-500' }
                  ].map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">{item.count} emails ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Priority Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { priority: 'High Priority', count: 23, percentage: 21, color: 'bg-red-500', textColor: 'text-red-600' },
                    { priority: 'Medium Priority', count: 54, percentage: 50, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                    { priority: 'Low Priority', count: 31, percentage: 29, color: 'bg-green-500', textColor: 'text-green-600' }
                  ].map((item) => (
                    <div key={item.priority} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${item.textColor}`}>{item.priority}</span>
                        <span className="text-muted-foreground">{item.count} emails ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Response Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">94%</p>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">3.2h</p>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Urgent Emails (&lt; 1h)</span>
                      <span className="font-medium text-green-600">98%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>High Priority (&lt; 4h)</span>
                      <span className="font-medium text-yellow-600">89%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Medium Priority (&lt; 24h)</span>
                      <span className="font-medium text-blue-600">76%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Productivity Peak</p>
                        <p className="text-xs text-blue-700">Your response time is fastest between 9-11 AM</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Template Success</p>
                        <p className="text-xs text-green-700">"Meeting Acceptance" template has 96% success rate</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Attention Needed</p>
                        <p className="text-xs text-yellow-700">12 emails from last week still need responses</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">Efficiency Tip</p>
                        <p className="text-xs text-purple-700">Use smart filters to auto-categorize 23% more emails</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sender Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <span>Sender</span>
                  <span>Emails</span>
                  <span>Category</span>
                  <span>Avg Priority</span>
                  <span>Response Rate</span>
                </div>
                
                {[
                  { sender: 'sarah.johnson@company.com', emails: 15, category: 'Work', priority: 'High', rate: '100%' },
                  { sender: 'dev-team@company.com', emails: 12, category: 'Work', priority: 'Medium', rate: '92%' },
                  { sender: 'hr@company.com', emails: 8, category: 'Work', priority: 'Medium', rate: '88%' },
                  { sender: 'noreply@linkedin.com', emails: 6, category: 'Social', priority: 'Low', rate: '23%' },
                  { sender: 'billing@service.com', emails: 4, category: 'Personal', priority: 'High', rate: '100%' }
                ].map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 text-sm py-2 border-b last:border-b-0">
                    <span className="font-medium truncate">{item.sender}</span>
                    <span>{item.emails}</span>
                    <Badge className={getCategoryColor(item.category.toLowerCase())} variant="outline">
                      {item.category}
                    </Badge>
                    <Badge className={getPriorityColor(item.priority.toLowerCase())}>
                      {item.priority}
                    </Badge>
                    <span className="font-medium">{item.rate}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-semibold">Email Intelligence Settings</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Auto-categorization</label>
                  <p className="text-sm text-muted-foreground">Automatically categorize incoming emails</p>
                </div>
                <Button variant="outline">Enabled</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Smart Priorities</label>
                  <p className="text-sm text-muted-foreground">AI-based email priority detection</p>
                </div>
                <Button variant="outline">Enabled</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Response Suggestions</label>
                  <p className="text-sm text-muted-foreground">Generate AI-powered reply suggestions</p>
                </div>
                <Button variant="outline">Enabled</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}