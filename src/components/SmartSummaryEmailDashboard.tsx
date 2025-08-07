'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Clock,
  Calendar,
  Settings,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Globe,
  Bell,
  Zap,
  Smartphone,
  User,
  MessageCircle
} from 'lucide-react';
import { smartSummaryEmailService, EmailSummaryData } from '@/lib/smartSummaryEmail';

interface EmailPreferences {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  timezone: string;
  email: string;
  name: string;
  language: string;
  includeUnreadMessages: boolean;
  includeExpenses: boolean;
  includeWeather: boolean;
  includeTasks: boolean;
  includeGoals: boolean;
  includeBudgetAlerts: boolean;
  emailFormat: 'html' | 'text' | 'both';
}

interface SmartSummaryEmailDashboardProps {
  onRefresh?: () => void;
}

const SmartSummaryEmailDashboard: React.FC<SmartSummaryEmailDashboardProps> = ({ onRefresh }) => {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    enabled: false,
    frequency: 'daily',
    time: '08:00',
    timezone: 'Asia/Muscat',
    email: '',
    name: '',
    language: 'en',
    includeUnreadMessages: true,
    includeExpenses: true,
    includeWeather: true,
    includeTasks: true,
    includeGoals: true,
    includeBudgetAlerts: true,
    emailFormat: 'html'
  });

  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<EmailSummaryData | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'schedule'>('settings');
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('email-summary-preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...preferences, ...parsed });
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      localStorage.setItem('email-summary-preferences', JSON.stringify(preferences));
      alert('Email preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    setLoading(true);
    try {
      const userData = {
        name: preferences.name || 'User',
        email: preferences.email || 'user@example.com',
        timezone: preferences.timezone,
        language: preferences.language
      };

      const summaryData = await smartSummaryEmailService.generateSummaryData(
        preferences.frequency,
        userData
      );

      // Filter data based on preferences
      if (!preferences.includeUnreadMessages) summaryData.unreadMessages = [];
      if (!preferences.includeWeather) summaryData.weather = {} as any;
      if (!preferences.includeTasks) summaryData.tasks = {} as any;
      if (!preferences.includeGoals) summaryData.goals = [];
      if (!preferences.includeBudgetAlerts) summaryData.budgetAlerts = [];

      setPreviewData(summaryData);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!previewData) {
      await generatePreview();
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would call an API to send the email
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLastSent(new Date().toLocaleString());
      alert('Test email sent successfully! (In a real implementation, this would send to your email)');
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const downloadPreview = () => {
    if (!previewData) return;

    const htmlContent = smartSummaryEmailService.generateEmailHTML(previewData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-summary-${preferences.frequency}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNextScheduledTime = () => {
    if (!preferences.enabled) return 'Not scheduled';
    
    const now = new Date();
    const next = new Date();
    const [hours, minutes] = preferences.time.split(':').map(Number);
    
    next.setHours(hours, minutes, 0, 0);
    
    if (preferences.frequency === 'weekly') {
      // Schedule for next Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday);
    } else if (next <= now) {
      // If time has passed today, schedule for tomorrow
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Smart Summary Email
              </CardTitle>
              <CardDescription>
                Daily or weekly email summaries with unread messages, expenses, weather, and tasks
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                preferences.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {preferences.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-blue-600">{preferences.frequency}</p>
              <p className="text-sm text-gray-600">Frequency</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-600">{preferences.time}</p>
              <p className="text-sm text-gray-600">Scheduled Time</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Bell className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-purple-600">{lastSent ? 'Sent' : 'Not sent'}</p>
              <p className="text-sm text-gray-600">Last Email</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Scheduled Email */}
      {preferences.enabled && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Next Email Scheduled</p>
                <p className="text-sm text-blue-600">{getNextScheduledTime()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'preview', label: 'Preview', icon: Eye },
              { id: 'schedule', label: 'Schedule', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Enable Smart Summary Emails</label>
                      <p className="text-sm text-gray-600">Receive automated summary emails</p>
                    </div>
                    <Switch
                      checked={preferences.enabled}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, enabled: checked })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <Input
                        type="text"
                        value={preferences.name}
                        onChange={(e) => setPreferences({ ...preferences, name: e.target.value })}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <Input
                        type="email"
                        value={preferences.email}
                        onChange={(e) => setPreferences({ ...preferences, email: e.target.value })}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <select
                        value={preferences.frequency}
                        onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value as 'daily' | 'weekly' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <Input
                        type="time"
                        value={preferences.time}
                        onChange={(e) => setPreferences({ ...preferences, time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asia/Muscat">Asia/Muscat (GMT+4)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Content Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Content Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'includeUnreadMessages', label: 'Unread Messages', icon: MessageCircle, description: 'Email, SMS, and notifications' },
                    { key: 'includeExpenses', label: 'Expenses Summary', icon: Settings, description: 'Top expenses and category breakdown' },
                    { key: 'includeWeather', label: 'Weather Forecast', icon: Globe, description: 'Current conditions and 3-day forecast' },
                    { key: 'includeTasks', label: 'Tasks Overview', icon: CheckCircle, description: 'Completed, pending, and upcoming tasks' },
                    { key: 'includeGoals', label: 'Goal Progress', icon: Settings, description: 'Savings goals and progress tracking' },
                    { key: 'includeBudgetAlerts', label: 'Budget Alerts', icon: AlertTriangle, description: 'Spending alerts and recommendations' }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-blue-600" />
                          <div>
                            <label className="font-medium">{item.label}</label>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences[item.key as keyof EmailPreferences] as boolean}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, [item.key]: checked })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Format Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Email Format</h3>
                <div className="space-y-3">
                  {[
                    { value: 'html', label: 'HTML (Rich formatting)', description: 'Full formatting with images and colors' },
                    { value: 'text', label: 'Plain Text', description: 'Simple text format for all email clients' },
                    { value: 'both', label: 'Both HTML and Text', description: 'Send both formats for best compatibility' }
                  ].map((format) => (
                    <div key={format.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id={`format-${format.value}`}
                        name="emailFormat"
                        value={format.value}
                        checked={preferences.emailFormat === format.value}
                        onChange={(e) => setPreferences({ ...preferences, emailFormat: e.target.value as any })}
                        className="text-blue-600"
                      />
                      <label htmlFor={`format-${format.value}`} className="flex-1">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-gray-600">{format.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={savePreferences} disabled={saving}>
                  <Settings className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Email Preview</h3>
                <div className="flex gap-2">
                  <Button onClick={generatePreview} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Generate Preview
                  </Button>
                  {previewData && (
                    <Button onClick={downloadPreview} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download HTML
                    </Button>
                  )}
                </div>
              </div>

              {previewData ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      {preferences.frequency} Summary for {previewData.user.name}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      Generated: {new Date().toLocaleString()} • Format: {preferences.emailFormat}
                    </p>
                  </div>

                  <div className="bg-white rounded border p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold">📊 Quick Overview</h4>
                        <ul className="mt-2 space-y-1">
                          <li>• Unread Messages: {previewData.unreadMessages.length}</li>
                          <li>• Total Spent: {previewData.expenses.totalSpent.toFixed(2)} OMR</li>
                          <li>• Pending Tasks: {previewData.tasks.pending}</li>
                          <li>• Current Temp: {previewData.weather.current?.temperature}°C</li>
                        </ul>
                      </div>

                      {previewData.unreadMessages.length > 0 && (
                        <div>
                          <h4 className="font-semibold">📧 Recent Messages</h4>
                          <div className="mt-2 space-y-1">
                            {previewData.unreadMessages.slice(0, 3).map((msg, idx) => (
                              <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                                <strong>{msg.subject}</strong> - {msg.sender}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold">🔍 Smart Insights</h4>
                        <div className="mt-2 space-y-1">
                          {previewData.insights.slice(0, 3).map((insight, idx) => (
                            <div key={idx} className="text-xs p-2 bg-blue-50 rounded">
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Click "Generate Preview" to see your email summary</p>
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Email Schedule & Testing</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={sendTestEmail} 
                    disabled={loading || !preferences.email}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                    {loading ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant={preferences.enabled ? "default" : "secondary"}>
                          {preferences.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Frequency:</span>
                        <span className="text-sm font-medium">{preferences.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time:</span>
                        <span className="text-sm font-medium">{preferences.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Next Email:</span>
                        <span className="text-sm font-medium">{getNextScheduledTime()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Email History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Sent:</span>
                        <span className="text-sm font-medium">{lastSent || 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Sent:</span>
                        <span className="text-sm font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Success Rate:</span>
                        <span className="text-sm font-medium">100%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Recipient:</span>
                        <span className="text-sm font-medium">{preferences.email || 'Not set'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!preferences.email && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Email Address Required</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please set your email address in the Settings tab to enable email summaries.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!preferences.enabled && preferences.email && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Email Summaries Disabled</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Enable email summaries in the Settings tab to start receiving automated reports.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartSummaryEmailDashboard;