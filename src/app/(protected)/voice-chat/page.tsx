'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Mic, 
  MessageSquare, 
  Settings, 
  Volume2, 
  Wifi, 
  WifiOff,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import VoiceChatInterface from '@/components/VoiceChatInterface';

export default function VoiceChatPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [webhookUrl, setWebhookUrl] = useState('/api/voice-messages');
  const [isConnected, setIsConnected] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoTranscribe: true,
    autoPlay: true,
    noiseReduction: true,
    echoCancellation: true,
    maxDuration: 300, // 5 minutes
    quality: 'high'
  });

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testConnection = async () => {
    try {
      const response = await fetch(webhookUrl);
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('voiceAssistantChat')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('whatsappStyleVoice')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {isConnected ? t('connected') : t('disconnected')}
                </span>
              </div>
              
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('settings')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    {t('settings')}
                  </CardTitle>
                  <CardDescription>
                    {t('configureVoicePreferences')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Settings */}
                  <div>
                    <Label htmlFor="webhook-url" className="text-sm font-medium">
                      {t('webhookUrl')}
                    </Label>
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="mt-1"
                    />
                    <Button
                      onClick={testConnection}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                    >
                      {t('testConnection')}
                    </Button>
                  </div>

                  {/* Audio Settings */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">{t('audioSettings')}</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-transcribe" className="text-sm">
                        {t('autoTranscribe')}
                      </Label>
                      <Switch
                        id="auto-transcribe"
                        checked={settings.autoTranscribe}
                        onCheckedChange={(checked) => handleSettingsChange('autoTranscribe', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-play" className="text-sm">
                        {t('autoPlayResponses')}
                      </Label>
                      <Switch
                        id="auto-play"
                        checked={settings.autoPlay}
                        onCheckedChange={(checked) => handleSettingsChange('autoPlay', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="noise-reduction" className="text-sm">
                        {t('noiseReduction')}
                      </Label>
                      <Switch
                        id="noise-reduction"
                        checked={settings.noiseReduction}
                        onCheckedChange={(checked) => handleSettingsChange('noiseReduction', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="echo-cancellation" className="text-sm">
                        {t('echoCancellation')}
                      </Label>
                      <Switch
                        id="echo-cancellation"
                        checked={settings.echoCancellation}
                        onCheckedChange={(checked) => handleSettingsChange('echoCancellation', checked)}
                      />
                    </div>
                  </div>

                  {/* Quality Settings */}
                  <div>
                    <Label htmlFor="quality" className="text-sm font-medium">
                      {t('recordingQuality')}
                    </Label>
                    <select
                      id="quality"
                      value={settings.quality}
                      onChange={(e) => handleSettingsChange('quality', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="low">{t('lowQuality')}</option>
                      <option value="medium">{t('mediumQuality')}</option>
                      <option value="high">{t('highQuality')}</option>
                    </select>
                  </div>

                  {/* Max Duration */}
                  <div>
                    <Label htmlFor="max-duration" className="text-sm font-medium">
                      {t('maxRecordingDuration')}
                    </Label>
                    <Input
                      id="max-duration"
                      type="number"
                      min="10"
                      max="600"
                      value={settings.maxDuration}
                      onChange={(e) => handleSettingsChange('maxDuration', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">{t('systemStatus')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{t('mediaRecorderApi')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{t('n8nWebhook')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{t('audioPlayback')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{t('base64Encoding')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Chat Interface */}
          <div className={showSettings ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <Card className="h-[600px]">
              <VoiceChatInterface 
                webhookUrl={webhookUrl}
                className="h-full"
              />
            </Card>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Mic className="h-5 w-5 mr-2 text-blue-500" />
                {t('voiceRecording')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('webmOggFormats')}</li>
                <li>• {t('noiseCancellation')}</li>
                <li>• {t('realTimeDuration')}</li>
                <li>• {t('waveformVisualization')}</li>
                <li>• {t('base64EncodingN8n')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                {t('aiProcessing')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('automaticTranscription')}</li>
                <li>• {t('aiResponseGeneration')}</li>
                <li>• {t('voiceSynthesis')}</li>
                <li>• {t('contextAwareness')}</li>
                <li>• {t('multiLanguageSupport')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Volume2 className="h-5 w-5 mr-2 text-purple-500" />
                {t('playbackFeatures')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('instantAudioPlayback')}</li>
                <li>• {t('progressVisualization')}</li>
                <li>• {t('autoPlayAiResponses')}</li>
                <li>• {t('seekScrubControls')}</li>
                <li>• {t('whatsappStyleUi')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('howToUse')}</CardTitle>
            <CardDescription>
              {t('completeVoiceFlow')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">{t('frontendFlow')}</h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. {t('pressMicrophone')}</li>
                  <li>2. {t('speakMessage', { maxDuration: settings.maxDuration.toString() })}</li>
                  <li>3. {t('pressStopToFinish')}</li>
                  <li>4. {t('previewPlayback')}</li>
                  <li>5. {t('pressSendSubmit')}</li>
                  <li>6. {t('receiveAiResponse')}</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-3">{t('n8nIntegration')}</h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. {t('receivesJsonAudio')}</li>
                  <li>2. {t('convertsBase64')}</li>
                  <li>3. {t('transcribesAudio')}</li>
                  <li>4. {t('generatesAiResponse')}</li>
                  <li>5. {t('convertsResponseToSpeech')}</li>
                  <li>6. {t('returnsTranscription')}</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JSON Schema */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('n8nWebhookPayload')}</CardTitle>
            <CardDescription>
              {t('expectedJsonStructure')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "voice_message",
  "action": "send",
  "audioBase64": "<base64-encoded-audio-data>",
  "fileName": "voiceMessage_1234567890.webm",
  "mimeType": "audio/webm;codecs=opus",
  "duration": 15,
  "size": 45678,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "user-123",
  "userName": "John Doe"
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}