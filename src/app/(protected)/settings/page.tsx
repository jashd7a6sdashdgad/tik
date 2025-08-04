'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation, timezones, languages } from '@/lib/translations';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Volume2,
  Globe,
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';

interface UserSettings {
  profile: {
    username: string;
    email: string;
    timezone: string;
    language: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    reminderNotifications: boolean;
    weeklyDigest: boolean;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
    profileVisibility: string;
  };
  appearance: {
    theme: string;
    colorScheme: string;
    fontSize: string;
  };
  voice: {
    enabled: boolean;
    language: string;
    rate: number;
    pitch: number;
  };
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { language, timezone, setLanguage, setTimezone } = useSettings();
  const { t } = useTranslation(language);
  
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      username: user?.username || 'mahboob',
      email: 'mahboob@example.com',
      timezone: timezone,
      language: language
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      reminderNotifications: true,
      weeklyDigest: false
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      profileVisibility: 'private'
    },
    appearance: {
      theme: 'light',
      colorScheme: 'default',
      fontSize: 'medium'
    },
    voice: {
      enabled: true,
      language: 'en-US',
      rate: 1.0,
      pitch: 1.0
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsed,
          profile: {
            ...prevSettings.profile,
            ...parsed.profile,
            language: language, // Keep current language from context
            timezone: timezone  // Keep current timezone from context
          }
        }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, [language, timezone]);

  // Apply appearance changes immediately
  useEffect(() => {
    // Apply theme
    if (settings.appearance.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply color scheme
    document.documentElement.setAttribute('data-color-scheme', settings.appearance.colorScheme);

    // Apply font size
    const fontSize = settings.appearance.fontSize === 'small' ? '14px' : 
                    settings.appearance.fontSize === 'large' ? '18px' : '16px';
    document.documentElement.style.setProperty('--base-font-size', fontSize);
    document.body.style.fontSize = fontSize;

    // Save appearance settings to localStorage
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save language and timezone to context
      setLanguage(settings.profile.language);
      setTimezone(settings.profile.timezone);
      
      // In a real app, this would save to a backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(t('settingsSaved'));
    } catch (error) {
      alert(t('settingsError'));
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'personal-assistant-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'privacy', label: t('privacy'), icon: Shield },
    { id: 'appearance', label: t('appearance'), icon: Palette },
    { id: 'voice', label: t('voice'), icon: Volume2 },
    { id: 'data', label: t('data'), icon: Database }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-black">{t('settingsTitle')}</h1>
            <p className="text-black mt-2">{t('settingsDescription')}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="palette-card">
              <CardHeader>
                <CardTitle className="text-black">Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary text-white'
                            : 'text-black hover:bg-secondary'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Profile Information</CardTitle>
                  <CardDescription className="text-black">Update your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Username</label>
                      <Input
                        value={settings.profile.username}
                        onChange={(e) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, username: e.target.value }
                        })}
                        className="text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Email</label>
                      <Input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, email: e.target.value }
                        })}
                        className="text-black"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">{t('timezone')}</label>
                      <select
                        value={settings.profile.timezone}
                        onChange={(e) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, timezone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-background"
                      >
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">{t('language')}</label>
                      <select
                        value={settings.profile.language}
                        onChange={(e) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, language: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-background"
                      >
                        {languages.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.nativeLabel} ({lang.label})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Notification Preferences</CardTitle>
                  <CardDescription className="text-black">Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {Object.entries(settings.notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-black">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h4>
                          <p className="text-sm text-black">
                            {key === 'emailNotifications' && 'Receive notifications via email'}
                            {key === 'pushNotifications' && 'Browser push notifications'}
                            {key === 'reminderNotifications' && 'Event and task reminders'}
                            {key === 'weeklyDigest' && 'Weekly summary of your activity'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, [key]: !value }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Privacy & Security</CardTitle>
                  <CardDescription className="text-black">Control your data and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-black">Data Sharing</h4>
                        <p className="text-sm text-black">Allow anonymous usage data collection</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, dataSharing: !settings.privacy.dataSharing }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.privacy.dataSharing ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.privacy.dataSharing ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-black">Analytics</h4>
                        <p className="text-sm text-black">Help improve the app with usage analytics</p>
                      </div>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, analytics: !settings.privacy.analytics }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.privacy.analytics ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.privacy.analytics ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Appearance</CardTitle>
                  <CardDescription className="text-black">Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Theme</label>
                      <select
                        value={settings.appearance.theme}
                        onChange={(e) => setSettings({
                          ...settings,
                          appearance: { ...settings.appearance, theme: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-background"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Font Size</label>
                      <select
                        value={settings.appearance.fontSize}
                        onChange={(e) => setSettings({
                          ...settings,
                          appearance: { ...settings.appearance, fontSize: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-background"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-3">Color Scheme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'default', name: 'Default', primary: '#3D74B6', secondary: '#EAC8A6', accent: '#DC3C22' },
                        { id: 'blue', name: 'Ocean Blue', primary: '#2563eb', secondary: '#dbeafe', accent: '#dc2626' },
                        { id: 'green', name: 'Nature Green', primary: '#16a34a', secondary: '#dcfce7', accent: '#dc2626' }
                      ].map((scheme) => (
                        <button
                          key={scheme.id}
                          onClick={() => setSettings({
                            ...settings,
                            appearance: { ...settings.appearance, colorScheme: scheme.id }
                          })}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            settings.appearance.colorScheme === scheme.id
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                              : 'border-gray-300 hover:border-primary/50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex space-x-1 mb-3">
                            <div 
                              className="w-6 h-6 rounded-full border border-white shadow-sm" 
                              style={{ backgroundColor: scheme.primary }}
                            ></div>
                            <div 
                              className="w-6 h-6 rounded-full border border-white shadow-sm" 
                              style={{ backgroundColor: scheme.secondary }}
                            ></div>
                            <div 
                              className="w-6 h-6 rounded-full border border-white shadow-sm" 
                              style={{ backgroundColor: scheme.accent }}
                            ></div>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-medium text-black block">{scheme.name}</span>
                            {settings.appearance.colorScheme === scheme.id && (
                              <span className="text-xs text-primary font-medium">Active</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voice Settings */}
            {activeTab === 'voice' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Voice Assistant</CardTitle>
                  <CardDescription className="text-black">Configure voice input and output settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-black">Voice Input</h4>
                      <p className="text-sm text-black">Enable voice commands and dictation</p>
                    </div>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        voice: { ...settings.voice, enabled: !settings.voice.enabled }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.voice.enabled ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.voice.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Voice Language</label>
                    <select
                      value={settings.voice.language}
                      onChange={(e) => setSettings({
                        ...settings,
                        voice: { ...settings.voice, language: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-background"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                    </select>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Speech Rate: {settings.voice.rate}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.voice.rate}
                        onChange={(e) => setSettings({
                          ...settings,
                          voice: { ...settings.voice, rate: parseFloat(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Speech Pitch: {settings.voice.pitch}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.voice.pitch}
                        onChange={(e) => setSettings({
                          ...settings,
                          voice: { ...settings.voice, pitch: parseFloat(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <Card className="palette-card">
                <CardHeader>
                  <CardTitle className="text-black">Data Management</CardTitle>
                  <CardDescription className="text-black">Import, export, and manage your data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={handleExportData} variant="outline" className="text-black">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="text-black">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                  
                  <div className="border-t border-secondary pt-6">
                    <h4 className="font-medium text-black mb-2">Danger Zone</h4>
                    <p className="text-sm text-black mb-4">These actions cannot be undone</p>
                    
                    <div className="space-y-3">
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Data
                      </Button>
                      <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}