'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  Volume2, 
  Keyboard, 
  MousePointer, 
  Brain,
  Contrast,
  Type,
  Zap,
  Settings,
  TestTube,
  RefreshCw
} from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function AccessibilitySettings() {
  const { settings, updateSettings, announceMessage, isScreenReaderActive } = useAccessibility();
  const [testMessage, setTestMessage] = useState('');

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
    announceMessage(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`, 'polite');
  };

  const testScreenReader = () => {
    const message = testMessage || 'This is a test announcement for screen reader verification';
    announceMessage(message, 'assertive');
  };

  const resetSettings = () => {
    const defaultSettings = {
      screenReaderEnabled: false,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      keyboardNavigation: true,
      voiceAnnouncements: true,
      focusIndicators: true,
      skipLinks: true,
      descriptiveLabels: true,
      autoReadContent: false,
      announcePageChanges: true,
      announceFormErrors: true,
      announceUpdates: true,
      readingSpeed: 'normal' as const,
      contrastLevel: 'normal' as const,
      textSize: 'normal' as const
    };
    
    Object.entries(defaultSettings).forEach(([key, value]) => {
      updateSettings({ [key]: value });
    });
    
    announceMessage('Accessibility settings reset to defaults', 'assertive');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Accessibility Settings</h1>
          <p className="text-muted-foreground">
            Customize your experience for better accessibility
          </p>
        </div>
        <div className="flex gap-2">
          {isScreenReaderActive && (
            <Badge variant="default" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Screen Reader Detected
            </Badge>
          )}
          <Button variant="outline" onClick={resetSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      <Tabs value="visual" onValueChange={() => {}} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="motor" className="flex items-center gap-2">
            <MousePointer className="w-4 h-4" />
            Motor
          </TabsTrigger>
          <TabsTrigger value="cognitive" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Cognitive
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        {/* Visual Accessibility */}
        <TabsContent value="visual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Contrast className="w-5 h-5" />
                Visual Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">High Contrast Mode</label>
                  <p className="text-xs text-muted-foreground">Enhance contrast for better visibility</p>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
                  aria-label="Toggle high contrast mode"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contrast Level</label>
                <Select
                  value={settings.contrastLevel}
                  onValueChange={(value) => handleSettingChange('contrastLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="highest">Highest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Text Size</label>
                <Select
                  value={settings.textSize}
                  onValueChange={(value) => handleSettingChange('textSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="xlarge">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Reduced Motion</label>
                  <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
                  aria-label="Toggle reduced motion"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enhanced Focus Indicators</label>
                  <p className="text-xs text-muted-foreground">Make keyboard focus more visible</p>
                </div>
                <Switch
                  checked={settings.focusIndicators}
                  onCheckedChange={(checked) => handleSettingChange('focusIndicators', checked)}
                  aria-label="Toggle enhanced focus indicators"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio Accessibility */}
        <TabsContent value="audio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Screen Reader & Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Screen Reader Support</label>
                  <p className="text-xs text-muted-foreground">Enable comprehensive screen reader compatibility</p>
                </div>
                <Switch
                  checked={settings.screenReaderEnabled}
                  onCheckedChange={(checked) => handleSettingChange('screenReaderEnabled', checked)}
                  aria-label="Toggle screen reader support"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Voice Announcements</label>
                  <p className="text-xs text-muted-foreground">Announce interface changes and actions</p>
                </div>
                <Switch
                  checked={settings.voiceAnnouncements}
                  onCheckedChange={(checked) => handleSettingChange('voiceAnnouncements', checked)}
                  aria-label="Toggle voice announcements"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Reading Speed</label>
                <Select
                  value={settings.readingSpeed}
                  onValueChange={(value) => handleSettingChange('readingSpeed', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Read Content</label>
                  <p className="text-xs text-muted-foreground">Automatically read page content when loaded</p>
                </div>
                <Switch
                  checked={settings.autoReadContent}
                  onCheckedChange={(checked) => handleSettingChange('autoReadContent', checked)}
                  aria-label="Toggle auto-read content"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Announce Page Changes</label>
                  <p className="text-xs text-muted-foreground">Announce when navigating to new pages</p>
                </div>
                <Switch
                  checked={settings.announcePageChanges}
                  onCheckedChange={(checked) => handleSettingChange('announcePageChanges', checked)}
                  aria-label="Toggle page change announcements"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Announce Form Errors</label>
                  <p className="text-xs text-muted-foreground">Read form validation errors aloud</p>
                </div>
                <Switch
                  checked={settings.announceFormErrors}
                  onCheckedChange={(checked) => handleSettingChange('announceFormErrors', checked)}
                  aria-label="Toggle form error announcements"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Motor Accessibility */}
        <TabsContent value="motor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Motor & Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enhanced Keyboard Navigation</label>
                  <p className="text-xs text-muted-foreground">Full keyboard accessibility for all functions</p>
                </div>
                <Switch
                  checked={settings.keyboardNavigation}
                  onCheckedChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
                  aria-label="Toggle keyboard navigation"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Skip Links</label>
                  <p className="text-xs text-muted-foreground">Quick navigation shortcuts</p>
                </div>
                <Switch
                  checked={settings.skipLinks}
                  onCheckedChange={(checked) => handleSettingChange('skipLinks', checked)}
                  aria-label="Toggle skip links"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Skip to main content:</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Tab</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Open accessibility menu:</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Alt + A</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice commands:</span>
                    <kbd className="px-2 py-1 bg-background rounded border">Ctrl + Shift + V</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cognitive Accessibility */}
        <TabsContent value="cognitive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Cognitive Assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Descriptive Labels</label>
                  <p className="text-xs text-muted-foreground">Add detailed descriptions to interface elements</p>
                </div>
                <Switch
                  checked={settings.descriptiveLabels}
                  onCheckedChange={(checked) => handleSettingChange('descriptiveLabels', checked)}
                  aria-label="Toggle descriptive labels"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Announce Updates</label>
                  <p className="text-xs text-muted-foreground">Notify when content changes or updates</p>
                </div>
                <Switch
                  checked={settings.announceUpdates}
                  onCheckedChange={(checked) => handleSettingChange('announceUpdates', checked)}
                  aria-label="Toggle update announcements"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900">Cognitive Support Features</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Clear, consistent navigation</li>
                  <li>• Step-by-step guidance for complex tasks</li>
                  <li>• Progress indicators for multi-step processes</li>
                  <li>• Confirmation dialogs for important actions</li>
                  <li>• Simplified language and instructions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Accessibility Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Test Screen Reader Announcement</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message..."
                    className="flex-1 px-3 py-2 border rounded-md"
                    aria-label="Test message input"
                  />
                  <Button onClick={testScreenReader}>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Test if screen reader announcements are working correctly
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Accessibility Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isScreenReaderActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Screen Reader: {isScreenReaderActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settings.keyboardNavigation ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Keyboard Nav: {settings.keyboardNavigation ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settings.voiceAnnouncements ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Voice: {settings.voiceAnnouncements ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settings.focusIndicators ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Focus: {settings.focusIndicators ? 'Enhanced' : 'Standard'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}