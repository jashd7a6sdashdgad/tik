'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emailIntelligence, EmailTemplate, EmailMessage } from '@/lib/emailIntelligence';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Copy,
  Send,
  FileText,
  Zap,
  MessageSquare,
  Sparkles,
  CheckCircle,
  X,
  Save,
  Eye,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  Heart,
  Settings
} from 'lucide-react';

interface Props {
  onTemplateSelect: (template: EmailTemplate) => void;
  selectedEmail?: EmailMessage;
  onSendReply?: (content: string) => void;
}

interface SmartReply {
  type: 'accept' | 'decline' | 'acknowledge' | 'request_info';
  label: string;
  content: string;
  icon: React.ComponentType<any>;
}

export default function EmailTemplatesPanel({ onTemplateSelect, selectedEmail, onSendReply }: Props) {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EmailTemplate>>({});
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'smart_replies'>('templates');

  useEffect(() => {
    loadTemplates();
    if (selectedEmail) {
      generateSmartReplies();
    }
  }, [selectedEmail]);

  const loadTemplates = () => {
    const availableTemplates = emailIntelligence.getTemplates();
    setTemplates(availableTemplates);
  };

  const generateSmartReplies = () => {
    if (!selectedEmail) return;

    const replies: SmartReply[] = [
      {
        type: 'accept',
        label: 'Accept',
        content: emailIntelligence.generateSmartReply(selectedEmail, 'accept'),
        icon: CheckCircle
      },
      {
        type: 'decline',
        label: 'Decline',
        content: emailIntelligence.generateSmartReply(selectedEmail, 'decline'),
        icon: X
      },
      {
        type: 'acknowledge',
        label: 'Acknowledge',
        content: emailIntelligence.generateSmartReply(selectedEmail, 'acknowledge'),
        icon: Eye
      },
      {
        type: 'request_info',
        label: 'Request Info',
        content: emailIntelligence.generateSmartReply(selectedEmail, 'request_info'),
        icon: MessageSquare
      }
    ];

    setSmartReplies(replies);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'work': return Briefcase;
      case 'personal': return User;
      case 'financial': return DollarSign;
      case 'medical': return Heart;
      case 'travel': return Calendar;
      default: return Mail;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'work': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'personal': return 'bg-green-50 text-green-700 border-green-200';
      case 'financial': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'medical': return 'bg-red-50 text-red-700 border-red-200';
      case 'travel': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleCreateTemplate = () => {
    setIsCreating(true);
    setEditForm({
      name: '',
      subject: '',
      body: '',
      category: 'Work',
      variables: []
    });
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm(template);
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (!editForm.name || !editForm.subject || !editForm.body) {
      alert('Please fill in all required fields');
      return;
    }

    const newTemplate: EmailTemplate = {
      id: editForm.id || `template_${Date.now()}`,
      name: editForm.name!,
      subject: editForm.subject!,
      body: editForm.body!,
      category: editForm.category || 'Work',
      variables: extractVariables(editForm.body!)
    };

    // In a real implementation, save to backend
    console.log('Saving template:', newTemplate);
    
    setIsEditing(false);
    setIsCreating(false);
    setEditForm({});
    loadTemplates();
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{(\w+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      // In a real implementation, delete from backend
      console.log('Deleting template:', templateId);
      loadTemplates();
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    onTemplateSelect(template);
  };

  const handleSendSmartReply = (reply: SmartReply) => {
    if (onSendReply) {
      onSendReply(reply.content);
    }
  };

  const populateTemplate = (template: EmailTemplate, variables: Record<string, string>) => {
    let populatedSubject = template.subject;
    let populatedBody = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      populatedSubject = populatedSubject.replace(new RegExp(placeholder, 'g'), value);
      populatedBody = populatedBody.replace(new RegExp(placeholder, 'g'), value);
    }

    return {
      ...template,
      subject: populatedSubject,
      body: populatedBody
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Email Assistant</h3>
          <p className="text-gray-600">Templates and smart replies powered by AI</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'templates' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('templates')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Templates
          </Button>
          {selectedEmail && (
            <Button
              variant={activeTab === 'smart_replies' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('smart_replies')}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Smart Replies
            </Button>
          )}
        </div>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Email Templates</h4>
            <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const IconComponent = getCategoryIcon(template.category);
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                      {template.variables.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {template.variables.length} variables
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Subject:</p>
                        <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Preview:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {template.body.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          className="flex-1"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Use Template
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(template.body)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Replies Tab */}
      {activeTab === 'smart_replies' && selectedEmail && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-blue-600" />
            <h4 className="text-lg font-semibold">AI-Generated Smart Replies</h4>
          </div>

          {/* Email Context */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Replying to: {emailIntelligence['getHeaderValue'](selectedEmail.payload.headers, 'Subject')}
                  </p>
                  <p className="text-sm text-blue-700">
                    From: {emailIntelligence['getHeaderValue'](selectedEmail.payload.headers, 'From')}
                  </p>
                  <p className="text-sm text-blue-700 mt-1 line-clamp-2">
                    {selectedEmail.snippet}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Reply Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {smartReplies.map((reply, index) => {
              const IconComponent = reply.icon;
              return (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {reply.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {reply.content}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSendSmartReply(reply)}
                          className="flex-1"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Send Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(reply.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {(isEditing || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {isCreating ? 'Create New Template' : 'Edit Template'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={editForm.category || 'Work'}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Financial">Financial</option>
                  <option value="Medical">Medical</option>
                  <option value="Travel">Travel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject Line</label>
                <Input
                  value={editForm.subject || ''}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  placeholder="Enter email subject (use {variable} for placeholders)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Body</label>
                <textarea
                  value={editForm.body || ''}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  rows={12}
                  className="w-full p-3 border border-gray-300 rounded-md resize-none font-mono text-sm"
                  placeholder="Enter email body (use {variable} for placeholders like {recipient}, {sender}, {date})"
                />
              </div>

              {editForm.body && extractVariables(editForm.body).length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Detected Variables</label>
                  <div className="flex flex-wrap gap-2">
                    {extractVariables(editForm.body).map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTemplate} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setEditForm({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}