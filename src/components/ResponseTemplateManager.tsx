'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  Send,
  Brain,
  Zap,
  Clock,
  TrendingUp,
  MessageSquare,
  Star,
  Search,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface ResponseTemplate {
  id: string;
  name: string;
  category: 'work' | 'personal' | 'sales' | 'support' | 'meeting' | 'follow-up' | 'thank-you' | 'apology';
  subject: string;
  content: string;
  placeholders: string[];
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'urgent';
  useCount: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed?: Date;
  aiGenerated: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AISuggestion {
  id: string;
  emailContext: string;
  suggestedResponse: string;
  confidence: number;
  reasoning: string;
  tone: string;
  responseType: 'quick_reply' | 'detailed' | 'meeting_request' | 'follow_up';
}

export default function ResponseTemplateManager() {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAiPanel, setShowAiPanel] = useState(true);

  // Sample data - in real app, this would come from API
  useEffect(() => {
    const sampleTemplates: ResponseTemplate[] = [
      {
        id: '1',
        name: 'Meeting Acceptance',
        category: 'meeting',
        subject: 'Re: {meeting_subject} - Confirmed',
        content: `Thank you for the meeting invitation. I confirm my attendance for the meeting on {date} at {time}.

Looking forward to discussing {topic}.

Best regards,
{sender_name}`,
        placeholders: ['meeting_subject', 'date', 'time', 'topic', 'sender_name'],
        tone: 'professional',
        useCount: 156,
        successRate: 92,
        averageResponseTime: 45,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        aiGenerated: false,
        tags: ['meeting', 'confirmation', 'professional'],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Quick Acknowledgment',
        category: 'work',
        subject: 'Re: {original_subject}',
        content: `Thank you for your email. I have received your message and will review it carefully.

I will get back to you by {deadline} with my response.

Best regards,
{sender_name}`,
        placeholders: ['original_subject', 'deadline', 'sender_name'],
        tone: 'professional',
        useCount: 234,
        successRate: 88,
        averageResponseTime: 15,
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        aiGenerated: true,
        tags: ['acknowledgment', 'quick', 'professional'],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        name: 'Information Request',
        category: 'follow-up',
        subject: 'Additional Information Needed - {topic}',
        content: `Thank you for your email regarding {topic}.

To better assist you, could you please provide additional information about:

• {detail_1}
• {detail_2}
• {detail_3}

Once I have this information, I'll be able to provide you with a comprehensive response.

Best regards,
{sender_name}`,
        placeholders: ['topic', 'detail_1', 'detail_2', 'detail_3', 'sender_name'],
        tone: 'friendly',
        useCount: 89,
        successRate: 85,
        averageResponseTime: 120,
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        aiGenerated: false,
        tags: ['information', 'request', 'friendly'],
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        name: 'Polite Decline',
        category: 'work',
        subject: 'Re: {original_subject}',
        content: `Thank you for thinking of me for {opportunity}.

Unfortunately, due to my current commitments, I won't be able to take on this project at this time. However, I appreciate the opportunity and hope we can work together in the future.

If the timeline is flexible or if you have other projects that might be a better fit, please let me know.

Best regards,
{sender_name}`,
        placeholders: ['original_subject', 'opportunity', 'sender_name'],
        tone: 'professional',
        useCount: 67,
        successRate: 94,
        averageResponseTime: 90,
        lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        aiGenerated: true,
        tags: ['decline', 'polite', 'professional'],
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: '5',
        name: 'Thank You Follow-up',
        category: 'thank-you',
        subject: 'Thank you for {reason}',
        content: `I wanted to take a moment to thank you for {reason}.

{specific_details}

Your {action} was greatly appreciated and made a significant difference. I look forward to continuing our collaboration.

With gratitude,
{sender_name}`,
        placeholders: ['reason', 'specific_details', 'action', 'sender_name'],
        tone: 'friendly',
        useCount: 123,
        successRate: 96,
        averageResponseTime: 60,
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        aiGenerated: false,
        tags: ['thank you', 'gratitude', 'friendly'],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    const sampleAiSuggestions: AISuggestion[] = [
      {
        id: '1',
        emailContext: 'Meeting request for Q4 budget review next Tuesday',
        suggestedResponse: 'I can attend the Q4 budget review meeting next Tuesday. Please confirm the time and location.',
        confidence: 0.92,
        reasoning: 'Standard meeting acceptance with request for details',
        tone: 'professional',
        responseType: 'quick_reply'
      },
      {
        id: '2',
        emailContext: 'Client asking for project timeline update',
        suggestedResponse: 'Thank you for checking on the project status. We are currently on track and I will provide a detailed timeline update by end of day.',
        confidence: 0.88,
        reasoning: 'Professional status update with commitment to follow-up',
        tone: 'professional',
        responseType: 'follow_up'
      },
      {
        id: '3',
        emailContext: 'Invitation to speak at conference',
        suggestedResponse: 'Thank you for the speaking opportunity. I would be honored to present at your conference. Please send me the details about the topic and timeline.',
        confidence: 0.85,
        reasoning: 'Positive response to speaking invitation with information request',
        tone: 'professional',
        responseType: 'detailed'
      }
    ];

    setTemplates(sampleTemplates);
    setAiSuggestions(sampleAiSuggestions);
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      work: 'bg-blue-100 text-blue-800',
      personal: 'bg-green-100 text-green-800',
      sales: 'bg-purple-100 text-purple-800',
      support: 'bg-orange-100 text-orange-800',
      meeting: 'bg-indigo-100 text-indigo-800',
      'follow-up': 'bg-yellow-100 text-yellow-800',
      'thank-you': 'bg-pink-100 text-pink-800',
      apology: 'bg-red-100 text-red-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'formal': return '🎩';
      case 'casual': return '😊';
      case 'friendly': return '🤝';
      case 'professional': return '💼';
      case 'urgent': return '⚡';
      default: return '📝';
    }
  };

  const generateAiTemplate = async (context: string) => {
    // Simulate AI generation - in real app, this would call an AI API
    const newTemplate: ResponseTemplate = {
      id: Date.now().toString(),
      name: `AI Generated - ${context.substring(0, 20)}...`,
      category: 'work',
      subject: 'Re: {subject}',
      content: `Thank you for your email regarding {subject}.

[AI-generated response based on context: ${context}]

I will review this matter and get back to you shortly.

Best regards,
{sender_name}`,
      placeholders: ['subject', 'sender_name'],
      tone: 'professional',
      useCount: 0,
      successRate: 0,
      averageResponseTime: 0,
      aiGenerated: true,
      tags: ['ai-generated', 'draft'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTemplates(prev => [newTemplate, ...prev]);
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  const applyTemplate = (template: ResponseTemplate) => {
    // Simulate using the template - in real app, this would open email composer
    setTemplates(prev => prev.map(t => 
      t.id === template.id 
        ? { ...t, useCount: t.useCount + 1, lastUsed: new Date() }
        : t
    ));
    
    // Show success message or open composer
    alert(`Template "${template.name}" copied to clipboard and ready to use!`);
  };

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Response Templates
          </h1>
          <p className="text-muted-foreground">
            AI-powered email response templates and smart suggestions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiPanel(!showAiPanel)}>
            <Brain className="w-4 h-4 mr-2" />
            {showAiPanel ? 'Hide' : 'Show'} AI Panel
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Generated</p>
                <p className="text-2xl font-bold">{templates.filter(t => t.aiGenerated).length}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round(templates.reduce((acc, t) => acc + t.successRate, 0) / templates.length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Uses</p>
                <p className="text-2xl font-bold">
                  {templates.reduce((acc, t) => acc + t.useCount, 0)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Templates</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="meeting">Meeting</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="thank-you">Thank You</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="apology">Apology</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2 max-h-96 overflow-y-auto p-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors
                      ${selectedTemplate?.id === template.id ? 'bg-muted ring-2 ring-primary' : ''}
                    `}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{template.name}</h3>
                        {template.aiGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <Brain className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{getToneIcon(template.tone)}</span>
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {template.content.substring(0, 100)}...
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>Used {template.useCount} times</span>
                        <span>{template.successRate}% success</span>
                        <span>{template.averageResponseTime}s avg</span>
                      </div>
                      {template.lastUsed && (
                        <span>Last: {template.lastUsed.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Preview/Editor */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedTemplate ? (isEditing ? 'Edit Template' : 'Template Preview') : 'Select Template'}
                </CardTitle>
                {selectedTemplate && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyTemplate(selectedTemplate)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteTemplate(selectedTemplate.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-4">
                  {!isEditing ? (
                    // Preview Mode
                    <>
                      <div>
                        <h3 className="font-semibold mb-2">{selectedTemplate.name}</h3>
                        <div className="flex gap-2 mb-3">
                          <Badge className={getCategoryColor(selectedTemplate.category)}>
                            {selectedTemplate.category}
                          </Badge>
                          <Badge variant="outline">
                            {getToneIcon(selectedTemplate.tone)} {selectedTemplate.tone}
                          </Badge>
                          {selectedTemplate.aiGenerated && (
                            <Badge variant="secondary">
                              <Brain className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Subject</h4>
                        <p className="text-sm bg-muted p-2 rounded font-mono">
                          {selectedTemplate.subject}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Content</h4>
                        <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {selectedTemplate.content}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Placeholders</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplate.placeholders.map(placeholder => (
                            <Badge key={placeholder} variant="outline" className="text-xs">
                              {placeholder}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Uses:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.useCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.successRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Time:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.averageResponseTime}s</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.updatedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <Button onClick={() => applyTemplate(selectedTemplate)} className="w-full">
                        <Send className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </>
                  ) : (
                    // Edit Mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                        className="w-full p-2 border rounded"
                        placeholder="Template name"
                      />
                      
                      <input
                        type="text"
                        value={selectedTemplate.subject}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                        className="w-full p-2 border rounded"
                        placeholder="Email subject"
                      />
                      
                      <textarea
                        value={selectedTemplate.content}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, content: e.target.value})}
                        rows={8}
                        className="w-full p-2 border rounded"
                        placeholder="Template content"
                      />
                      
                      <div className="flex gap-2">
                        <Button onClick={() => setIsEditing(false)}>
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a template to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Panel */}
        {showAiPanel && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">
                      Context: {suggestion.emailContext}
                    </div>
                    <div className="text-sm mb-2">
                      {suggestion.suggestedResponse}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </Badge>
                      <Button size="sm" onClick={() => generateAiTemplate(suggestion.emailContext)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Create Template
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <Brain className="w-4 h-4 mr-2" />
                    Generate More Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}