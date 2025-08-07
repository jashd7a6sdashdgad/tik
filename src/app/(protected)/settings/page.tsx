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
  RefreshCw,
  Fingerprint,
  UserCheck
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
  
  // Biometric authentication states
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasStoredCredential, setHasStoredCredential] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [biometricError, setBiometricError] = useState('');
  
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

  // Mobile-specific biometric authentication using WebAuthn optimized for phones
  const checkMobileBiometricSupport = async () => {
    try {
      // Check if we're on a mobile device first
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      console.log('Device detection:', { isMobile, isIOS, isAndroid });

      if (!isMobile) {
        console.log('Not a mobile device - biometric authentication disabled');
        return false;
      }

      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        console.log('WebAuthn not supported on this mobile device');
        return false;
      }

      // Check for platform authenticator (Touch ID, Face ID, Android fingerprint)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Mobile biometric authenticator available:', available);

      // Additional mobile-specific checks
      if (isIOS) {
        // Check if the device likely has biometrics (iOS 8+)
        const hasModernIOS = parseFloat(navigator.userAgent.match(/OS (\d+)_/)?.[1] || '0') >= 8;
        console.log('iOS biometric support detected:', hasModernIOS && available);
        return hasModernIOS && available;
      } else if (isAndroid) {
        // Check for Android 6+ (fingerprint support)
        const androidMatch = navigator.userAgent.match(/Android (\d+)/);
        const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 0;
        const hasModernAndroid = androidVersion >= 6;
        console.log('Android biometric support detected:', hasModernAndroid && available);
        return hasModernAndroid && available;
      }

      return available;
    } catch (error) {
      console.error('Error checking mobile biometric support:', error);
      return false;
    }
  };

  const registerMobileBiometric = async () => {
    try {
      setBiometricLoading(true);
      setBiometricError('');

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      console.log('Starting mobile biometric registration...', { isIOS, isAndroid });

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode('mahboob_mobile');

      // Mobile-optimized WebAuthn configuration
      const credentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Mahboob Personal Assistant',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: 'mahboob',
            displayName: 'Mahboob User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 - preferred by mobile devices
            { alg: -257, type: 'public-key' }, // RS256 - fallback
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Must use platform authenticator (Touch ID, Face ID, fingerprint)
            userVerification: 'required', // Force biometric verification
            residentKey: 'required', // Better for mobile UX
          },
          timeout: isIOS ? 120000 : 60000, // Longer timeout for iOS Face ID
          attestation: 'none', // Better compatibility
          extensions: {
            // Mobile-friendly extensions
            credProps: true,
          },
        },
      };

      console.log('Creating mobile biometric credential...');
      
      const credential = await navigator.credentials.create(credentialOptions) as PublicKeyCredential;

      if (credential && credential.id) {
        // Store credential info optimized for mobile
        const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem('mobile_biometric_credential_id', credential.id);
        localStorage.setItem('mobile_biometric_raw_id', rawIdBase64);
        localStorage.setItem('mobile_biometric_device_type', isIOS ? 'ios' : 'android');
        
        console.log('Mobile biometric credential registered successfully:', credential.id);
        
        setHasStoredCredential(true);
        const deviceName = isIOS ? 'Face ID/Touch ID' : 'Fingerprint/Face Unlock';
        alert(`${deviceName} setup successful! You can now use biometric authentication on the login page.`);
        
        return { success: true, credential, deviceType: isIOS ? 'ios' : 'android' };
      }

      throw new Error('Failed to create mobile biometric credential');
    } catch (error: any) {
      console.error('Mobile biometric registration error:', error);
      
      // Mobile-specific error handling
      if (error.name === 'NotAllowedError') {
        setBiometricError('Please enable biometric authentication in your phone settings and try again');
      } else if (error.name === 'NotSupportedError') {
        setBiometricError('Your phone does not support biometric authentication');
      } else if (error.name === 'SecurityError') {
        setBiometricError('Security error - please ensure you are using HTTPS');
      } else {
        setBiometricError(error.message || 'Mobile biometric registration failed');
      }
      
      return { success: false, error: error.message || 'Mobile biometric registration failed' };
    } finally {
      setBiometricLoading(false);
    }
  };

  const clearMobileBiometric = () => {
    localStorage.removeItem('mobile_biometric_credential_id');
    localStorage.removeItem('mobile_biometric_raw_id');
    localStorage.removeItem('mobile_biometric_device_type');
    setHasStoredCredential(false);
    setBiometricError('');
    alert('Mobile biometric credentials cleared. You will need to set up fingerprint/Face ID authentication again.');
  };

  // Check biometric support on component mount
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const available = await checkMobileBiometricSupport();
        setBiometricSupported(available);

        if (available) {
          // Set mobile-specific biometric type
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isAndroid = /Android/.test(navigator.userAgent);
          
          if (isIOS) {
            setBiometricType('Face ID / Touch ID');
          } else if (isAndroid) {
            setBiometricType('Fingerprint / Face Unlock');
          } else {
            setBiometricType('Mobile Biometric');
          }

          // Check if there's a stored mobile credential
          const storedCredentialId = localStorage.getItem('mobile_biometric_credential_id');
          setHasStoredCredential(!!storedCredentialId);
          
          console.log('Mobile biometric support available:', available);
          console.log('Has stored mobile credential:', !!storedCredentialId);
        }
      } catch (error) {
        console.error('Error checking mobile biometric support:', error);
      }
    };

    checkBiometricSupport();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                <SettingsIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('settingsTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('settingsDescription')}</p>
              </div>
            </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Modern Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-6 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
              <div className="mb-4">
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Settings Menu</h3>
              </div>
              <nav className="space-y-3">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all duration-300 transform hover:scale-105 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20'
                          : 'text-gray-700 hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:shadow-primary/10'
                      }`}
                    >
                      <Icon className={`h-5 w-5 transition-all duration-300 ${
                        activeTab === tab.id ? 'text-white scale-110' : 'group-hover:scale-110'
                      }`} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Profile Information
                    </h2>
                    <p className="text-gray-600 font-medium">Update your personal information and preferences</p>
                  </div>
                </div>
                <div className="space-y-6">
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
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Notification Preferences
                    </h2>
                    <p className="text-gray-600 font-medium">Choose how you want to be notified</p>
                  </div>
                </div>
                <div className="space-y-6">
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
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Privacy & Security
                    </h2>
                    <p className="text-gray-600 font-medium">Control your data and privacy settings</p>
                  </div>
                </div>
                <div className="space-y-6">
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
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Appearance
                    </h2>
                    <p className="text-gray-600 font-medium">Customize the look and feel</p>
                  </div>
                </div>
                <div className="space-y-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-4">Modern Color Palettes</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { id: 'default', name: 'Classic Blue', primary: '#3D74B6', secondary: '#EAC8A6', accent: '#DC3C22', gradient: 'from-blue-500 to-blue-600' },
                        { id: 'ocean', name: 'Ocean Breeze', primary: '#0ea5e9', secondary: '#e0f2fe', accent: '#0284c7', gradient: 'from-sky-400 to-blue-500' },
                        { id: 'forest', name: 'Forest Green', primary: '#059669', secondary: '#d1fae5', accent: '#047857', gradient: 'from-emerald-400 to-green-500' },
                        { id: 'sunset', name: 'Sunset Orange', primary: '#ea580c', secondary: '#fed7aa', accent: '#dc2626', gradient: 'from-orange-400 to-red-500' },
                        { id: 'royal', name: 'Royal Purple', primary: '#7c3aed', secondary: '#e9d5ff', accent: '#a855f7', gradient: 'from-purple-500 to-violet-600' },
                        { id: 'rose', name: 'Rose Pink', primary: '#e11d48', secondary: '#fecdd3', accent: '#f43f5e', gradient: 'from-pink-400 to-rose-500' },
                        { id: 'cyber', name: 'Cyber Mint', primary: '#06b6d4', secondary: '#cffafe', accent: '#0891b2', gradient: 'from-cyan-400 to-teal-500' },
                        { id: 'gold', name: 'Golden Hour', primary: '#f59e0b', secondary: '#fef3c7', accent: '#d97706', gradient: 'from-yellow-400 to-orange-500' }
                      ].map((scheme) => (
                        <button
                          key={scheme.id}
                          onClick={() => {
                            setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, colorScheme: scheme.id }
                            });
                            // Apply colors immediately to CSS variables
                            document.documentElement.style.setProperty('--color-primary', scheme.primary);
                            document.documentElement.style.setProperty('--color-secondary', scheme.secondary);
                            document.documentElement.style.setProperty('--color-accent', scheme.accent);
                          }}
                          className={`group p-4 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                            settings.appearance.colorScheme === scheme.id
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/30 shadow-lg'
                              : 'border-gray-200 hover:border-primary/50 hover:shadow-xl hover:bg-white/80'
                          }`}
                        >
                          <div className={`w-full h-16 rounded-xl mb-3 bg-gradient-to-r ${scheme.gradient} shadow-lg relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                            <div className="absolute bottom-2 left-2 flex space-x-1">
                              <div 
                                className="w-3 h-3 rounded-full border border-white/50 shadow-sm" 
                                style={{ backgroundColor: scheme.primary }}
                              ></div>
                              <div 
                                className="w-3 h-3 rounded-full border border-white/50 shadow-sm" 
                                style={{ backgroundColor: scheme.secondary }}
                              ></div>
                              <div 
                                className="w-3 h-3 rounded-full border border-white/50 shadow-sm" 
                                style={{ backgroundColor: scheme.accent }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold text-gray-700 block group-hover:text-gray-900 transition-colors">{scheme.name}</span>
                            {settings.appearance.colorScheme === scheme.id && (
                              <span className="text-xs text-primary font-medium mt-1 block">✓ Active</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Settings */}
            {activeTab === 'voice' && (
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                    <Volume2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Voice Assistant
                    </h2>
                    <p className="text-gray-600 font-medium">Configure voice input and output settings</p>
                  </div>
                </div>
                <div className="space-y-6">
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
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-600 rounded-2xl shadow-lg">
                      <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        Data Management
                      </h2>
                      <p className="text-gray-600 font-medium">Import, export, and manage your data</p>
                    </div>
                  </div>
                  <div className="space-y-6">
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
                  </div>
                </div>

                {/* Biometric Authentication Settings */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
                      <Fingerprint className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        Mobile Biometric Authentication
                      </h2>
                      <p className="text-gray-600 font-medium">
                        Configure Face ID, Touch ID, or fingerprint authentication for secure login
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {!biometricSupported ? (
                      <div className="text-center py-8">
                        <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="font-medium text-black mb-2">Biometric Authentication Not Available</h3>
                        <p className="text-black text-sm">
                          This feature requires a mobile device with Face ID, Touch ID, or fingerprint sensor.
                          Please access this page from your phone to set up biometric authentication.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            {biometricType.includes('Face') ? (
                              <UserCheck className="h-8 w-8 text-green-600" />
                            ) : (
                              <Fingerprint className="h-8 w-8 text-green-600" />
                            )}
                            <div>
                              <h4 className="font-medium text-black">
                                {biometricType} Available
                              </h4>
                              <p className="text-sm text-black">
                                Your device supports biometric authentication
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasStoredCredential ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <UserCheck className="h-4 w-4" />
                                <span className="text-sm font-medium">Enabled</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Fingerprint className="h-4 w-4" />
                                <span className="text-sm">Not Set Up</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {biometricError && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{biometricError}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {!hasStoredCredential ? (
                            <Button
                              onClick={registerMobileBiometric}
                              disabled={biometricLoading}
                              className="w-full flex items-center gap-3 relative overflow-hidden group"
                            >
                              <div className="flex items-center gap-3 z-10">
                                <Fingerprint className="h-5 w-5" />
                                <div className="text-left">
                                  <div className="font-medium">
                                    Set Up {biometricType}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    {biometricLoading 
                                      ? 'Follow the prompts on your device...' 
                                      : 'Enable secure biometric login'
                                    }
                                  </div>
                                </div>
                              </div>
                              {biometricLoading && (
                                <div className="absolute right-3 animate-pulse">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              )}
                            </Button>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {biometricType.includes('Face') ? (
                                    <UserCheck className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <Fingerprint className="h-5 w-5 text-green-600" />
                                  )}
                                  <div>
                                    <h4 className="font-medium text-black">{biometricType}</h4>
                                    <p className="text-sm text-gray-600">Ready for authentication</p>
                                  </div>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                              
                              <Button
                                onClick={clearMobileBiometric}
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Biometric Authentication
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-black mb-3">How to use biometric authentication:</h4>
                          <ul className="space-y-2 text-sm text-black">
                            <li className="flex items-start gap-2">
                              <span className="font-medium text-primary">1.</span>
                              Set up biometric authentication using the button above
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-medium text-primary">2.</span>
                              Go to the login page and use the &quot;{biometricType}&quot; button
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-medium text-primary">3.</span>
                              Follow your device's biometric prompts to sign in securely
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
