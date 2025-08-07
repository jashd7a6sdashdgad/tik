'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Shield, 
  Clock, 
  Star,
  Plus,
  Trash2,  
  Settings,
  Volume2,
  Moon,
  Car,
  Cloud,
  Users,
  Mail,
  Calendar
} from 'lucide-react';
import { smartNotificationEngine, NotificationPreferences, VIPContact } from '@/lib/smartNotifications';

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    (smartNotificationEngine as any).getDefaultPreferences()
  );
  const [vipContacts, setVipContacts] = useState<VIPContact[]>([]);
  const [newVipContact, setNewVipContact] = useState({
    name: '',
    email: '',
    relationship: 'colleague' as const,
    priority: 'important' as const
  });
  const [showAddVip, setShowAddVip] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = () => {
    try {
      const stored = localStorage.getItem('smart_notification_preferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
      
      setVipContacts(smartNotificationEngine.getVIPContacts());
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    smartNotificationEngine.updatePreferences(updated);
  };

  const handleChannelPreferenceChange = (priority: string, channels: string[]) => {
    const updated = {
      ...preferences,
      channelPreferences: {
        ...preferences.channelPreferences,
        [priority]: channels
      }
    };
    setPreferences(updated);
    smartNotificationEngine.updatePreferences(updated);
  };

  const addVIPContact = () => {
    if (!newVipContact.name || !newVipContact.email) return;

    const contact = smartNotificationEngine.addVIPContact({
      ...newVipContact,
      alwaysAllow: newVipContact.priority === 'important'
    });

    setVipContacts(prev => [...prev, contact]);
    setNewVipContact({
      name: '',
      email: '',
      relationship: 'colleague',
      priority: 'important'
    });
    setShowAddVip(false);
  };

  const removeVIPContact = (contactId: string) => {
    smartNotificationEngine.removeVIPContact(contactId);
    setVipContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const testNotification = (priority: 'critical' | 'high' | 'medium' | 'low') => {
    smartNotificationEngine.createNotification({
      type: 'system',
      priority,
      title: `Test ${priority} notification`,
      message: `This is a test notification with ${priority} priority to preview your settings.`,
      context: {
        source: 'settings_test',
        category: 'test',
        urgency: priority === 'critical' ? 10 : priority === 'high' ? 8 : priority === 'medium' ? 5 : 2,
        isTimesensitive: false
      }
    });
  };

  const getRelationshipIcon = (relationship: string) => {
    const icons: Record<string, React.ReactNode> = {
      family: '👨‍👩‍👧‍👦',
      boss: '👔',
      client: '🤝',
      emergency: '🚨',
      colleague: '👥'
    };
    return icons[relationship] || '👤';
  };

  const getChannelIcon = (channel: string) => {
    const icons: Record<string, React.ReactNode> = {
      push: <Bell className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
      sms: '📱',
      in_app: <Settings className="h-4 w-4" />,
      voice: <Volume2 className="h-4 w-4" />
    };
    return icons[channel] || <Bell className="h-4 w-4" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Smart Notification Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure intelligent notifications with priority filtering and meeting awareness
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => testNotification('high')} variant="outline" size="sm">
            Test Notification
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Basic notification preferences and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow notifications during meetings</Label>
                  <p className="text-sm text-gray-500">Critical and VIP notifications only</p>
                </div>
                <Switch
                  checked={preferences.allowDuringMeetings}
                  onCheckedChange={(checked) => handlePreferenceChange('allowDuringMeetings', checked)}
                />
              </div>

              <div className="flex items-center justify-between">  
                <div>
                  <Label>VIP contacts always get through</Label>
                  <p className="text-sm text-gray-500">Override Do Not Disturb for VIPs</p>
                </div>
                <Switch
                  checked={preferences.vipAlwaysThrough}
                  onCheckedChange={(checked) => handlePreferenceChange('vipAlwaysThrough', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Contextual alerts</Label>
                  <p className="text-sm text-gray-500">Traffic, weather, meeting prep</p>
                </div>
                <Switch
                  checked={preferences.contextualAlertsEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange('contextualAlertsEnabled', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Traffic alerts
                  </Label>
                  <p className="text-sm text-gray-500">Heavy traffic and departure reminders</p>
                </div>
                <Switch
                  checked={preferences.trafficAlertsEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange('trafficAlertsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Weather alerts
                  </Label>
                  <p className="text-sm text-gray-500">Severe weather warnings</p>
                </div>
                <Switch
                  checked={preferences.weatherAlertsEnabled}
                  onCheckedChange={(checked) => handlePreferenceChange('weatherAlertsEnabled', checked)}
                />
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Quiet Hours
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start" className="text-sm">Start</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    start: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-sm">End</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    end: e.target.value
                  })}
                />
              </div>
            </div>
          </div>

          {/* Priority Threshold */}
          <div className="space-y-3">
            <Label>Minimum Priority Level</Label>
            <div className="flex gap-2">
              {['low', 'medium', 'high', 'critical'].map((priority) => (
                <Button
                  key={priority}
                  variant={preferences.priorityThreshold === priority ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('priorityThreshold', priority)}
                  className="capitalize"
                >
                  {priority}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Only show notifications at or above this priority level
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications for each priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['critical', 'high', 'medium', 'low'].map((priority) => (
              <div key={priority} className="space-y-2">
                <Label className="capitalize font-medium">{priority} Priority</Label>
                <div className="flex flex-wrap gap-2">
                  {['push', 'email', 'sms', 'in_app', 'voice'].map((channel) => {
                    const isSelected = preferences.channelPreferences[priority]?.includes(channel);
                    return (
                      <Button
                        key={channel}
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const current = preferences.channelPreferences[priority] || [];
                          const updated = isSelected
                            ? current.filter(c => c !== channel)
                            : [...current, channel];
                          handleChannelPreferenceChange(priority, updated);
                        }}
                        className="flex items-center gap-2"
                      >
                        {getChannelIcon(channel)}
                        {channel.replace('_', ' ')}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex gap-1">
                  <Button 
                    onClick={() => testNotification(priority as any)} 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                  >
                    Test {priority}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VIP Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            VIP Contacts
          </CardTitle>
          <CardDescription>
            Priority contacts who can bypass Do Not Disturb and quiet hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add VIP Contact Form */}
          {showAddVip && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vip-name">Name</Label>
                    <Input
                      id="vip-name"
                      value={newVipContact.name}
                      onChange={(e) => setNewVipContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vip-email">Email</Label>
                    <Input
                      id="vip-email"
                      type="email"
                      value={newVipContact.email}
                      onChange={(e) => setNewVipContact(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <div className="flex gap-2 mt-1">
                      {['family', 'boss', 'client', 'emergency', 'colleague'].map((rel) => (
                        <Button
                          key={rel}
                          variant={newVipContact.relationship === rel ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setNewVipContact(prev => ({ ...prev, relationship: rel as any }))}
                          className="capitalize"
                        >
                          {getRelationshipIcon(rel)} {rel}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Priority Level</Label>
                    <div className="flex gap-2 mt-1">
                      {['important', 'vip'].map((priority) => (
                        <Button
                          key={priority}
                          variant={newVipContact.priority === priority ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setNewVipContact(prev => ({ ...prev, priority: priority as any }))}
                          className="capitalize"
                        >
                          {priority === 'vip' ? <Star className="h-3 w-3 mr-1" /> : null}
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={addVIPContact} size="sm">
                    Add VIP Contact
                  </Button>
                  <Button onClick={() => setShowAddVip(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* VIP Contacts List */}
          <div className="space-y-2">
            {vipContacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getRelationshipIcon(contact.relationship)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      <Badge variant={contact.priority === 'vip' ? 'default' : 'secondary'}>
                        {contact.priority === 'vip' && <Star className="h-3 w-3 mr-1" />}
                        {contact.priority}  
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{contact.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => removeVIPContact(contact.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {vipContacts.length === 0 && !showAddVip && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No VIP contacts configured</p>
              <p className="text-sm">Add important contacts to ensure their notifications get through</p>
            </div>
          )}

          {!showAddVip && (
            <Button onClick={() => setShowAddVip(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add VIP Contact
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>
            Test different notification types and priorities to verify your settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={() => testNotification('critical')} variant="destructive" size="sm">
              🚨 Critical
            </Button>
            <Button onClick={() => testNotification('high')} className="bg-orange-600 hover:bg-orange-700" size="sm">
              ⚡ High
            </Button>
            <Button onClick={() => testNotification('medium')} variant="default" size="sm">
              📢 Medium  
            </Button>
            <Button onClick={() => testNotification('low')} variant="outline" size="sm">
              💬 Low
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}