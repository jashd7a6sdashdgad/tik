'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import VoiceMessageRecorder from '@/components/VoiceMessageRecorder';
import VoiceMessageDisplay from '@/components/VoiceMessageDisplay';
import { 
  Send, 
  Mic, 
  User, 
  Bot, 
  Brain, 
  Lightbulb, 
  Settings, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface ThinkMessage {
  id: string;
  type: 'user' | 'assistant';
  messageType: 'voice' | 'text';
  content?: string; // For text messages
  audioUrl?: string;
  audioBase64?: string;
  transcription?: string;
  aiResponse?: string;
  duration?: number;
  timestamp: Date;
  isVoice?: boolean;
  isPlaying?: boolean;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

export default function ThinkToolPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [messages, setMessages] = useState<ThinkMessage[]>([
    {
      id: '1',
      type: 'assistant',
      messageType: 'text',
      content: `🧠 ${t('welcomeMessage')}`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    autoTranscribe: true,
    autoPlay: true,
    noiseReduction: true,
    echoCancellation: true,
    maxDuration: 300, // 5 minutes
    quality: 'high'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput({
    continuous: false,
    interimResults: true
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle voice input completion
  useEffect(() => {
    if (transcript && !isListening) {
      console.log('Voice input completed:', transcript);
      addMessage(transcript, 'user', 'voice');
      processThought(transcript, true);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const addMessage = (content: string, type: 'user' | 'assistant', messageType: 'voice' | 'text' = 'text', additionalData?: Partial<ThinkMessage>) => {
    const newMessage: ThinkMessage = {
      id: Date.now().toString(),
      type,
      messageType,
      content: messageType === 'text' ? content : undefined,
      transcription: messageType === 'voice' ? content : undefined,
      timestamp: new Date(),
      isVoice: messageType === 'voice',
      ...additionalData
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/n8n/webhook');
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handlePlayStateChange = (messageId: string, isPlaying: boolean) => {
    if (isPlaying) {
      if (currentPlayingId && currentPlayingId !== messageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === currentPlayingId 
            ? { ...msg, isPlaying: false }
            : msg
        ));
      }
      setCurrentPlayingId(messageId);
    } else {
      setCurrentPlayingId(null);
    }

    setMessages(prev => prev.map(msg =>
      msg.id === messageId 
        ? { ...msg, isPlaying }
        : msg
    ));
  };

  const handleVoiceMessageSent = async (response: any) => {
    console.log('Voice message response:', response);
    setIsProcessing(true);
    setError(null);

    try {
      const sentMessage: ThinkMessage = {
        id: `sent-${Date.now()}`,
        type: 'user',
        messageType: 'voice',
        transcription: response.data?.transcription || 'Processing...',
        duration: response.duration || 0,
        timestamp: new Date(),
        audioBase64: response.originalAudio,
        mimeType: response.mimeType,
        isVoice: true
      };

      setMessages(prev => [...prev, sentMessage]);

      // Process the voice message as a thought
      if (response.data?.transcription) {
        processThought(response.data.transcription, true);
      }

    } catch (error: any) {
      console.error('Error processing voice message response:', error);
      setError('Failed to process voice message');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceMessageError = (error: string) => {
    console.error('Voice message error:', error);
    setError(error);
    setIsProcessing(false);
  };

  const processThought = async (thought: string, isVoiceInput = false) => {
    setIsProcessing(true);
    let n8nResponseHandled = false;
    
    try {
      // Show thinking message
      addMessage('🤔 Processing your thought...', 'assistant');
      
      // Send to n8n webhook with thinking context
      console.log('Processing thought:', thought, 'Voice input:', isVoiceInput);
      const webhookData = isVoiceInput ? {
        type: 'voice_message',
        action: 'send',
        data: {
          transcription: thought,
          timestamp: new Date().toISOString(),
          context: 'think-tool',
          toolType: 'thinking'
        }
      } : {
        type: 'chat',
        action: 'message',
        data: {
          message: thought,
          timestamp: new Date().toISOString(),
          context: 'think-tool',
          isVoice: isVoiceInput,
          toolType: 'thinking'
        }
      };

      const response = await fetch('/api/n8n/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('N8n thinking response:', result);
      
      if (result.success) {
        console.log('N8n thinking webhook called successfully:', result);
        
        // Remove the processing message first
        setMessages(prev => prev.filter(msg => !msg.content?.includes('🤔 Processing your thought')));
        
        // Always try to get response from n8n data
        if (result.data && result.data.response) {
          addMessage(result.data.response, 'assistant');
          n8nResponseHandled = true;
        } else if (result.message && result.message !== 'Data sent to N8n successfully') {
          // Use the message if it's not the generic success message
          addMessage(result.message, 'assistant');
          n8nResponseHandled = true;
        } else {
          console.log('N8n succeeded but no response text provided in result:', result);
        }
      } else {
        console.warn('N8n thinking webhook failed:', result.message);
        // Remove the processing message
        setMessages(prev => prev.filter(msg => !msg.content?.includes('🤔 Processing your thought')));
        
        // Even if failed, check if there's a response message
        if (result.data && result.data.response) {
          addMessage(result.data.response, 'assistant');
          n8nResponseHandled = true;
        } else if (result.message) {
          addMessage(`N8n Error: ${result.message}`, 'assistant');
          n8nResponseHandled = true;
        }
      }
    } catch (error) {
      console.error('Error calling n8n thinking webhook:', error);
      // Remove the processing message
      setMessages(prev => prev.filter(msg => !msg.content?.includes('🤔 Processing your thought')));
    }
    
    // Only show a response if n8n didn't provide one
    if (!n8nResponseHandled) {
      console.log('N8n did not provide a thinking response, showing fallback');
      addMessage('🧠 Your thought has been processed and sent to the thinking workflow. Please wait for analysis...', 'assistant');
    }
    
    setIsProcessing(false);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    addMessage(inputMessage, 'user', 'text');
    processThought(inputMessage, false);
    setInputMessage('');
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('thinkToolTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('chat')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center px-3 py-2 rounded-lg space-x-2 ${
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
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Settings */}
                  <div>
                    <Label className="text-sm font-medium">
                      N8n Webhook Connection
                    </Label>
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
                      <Label className="text-sm">
                        {t('autoTranscribe')}
                      </Label>
                      <Switch
                        checked={settings.autoTranscribe}
                        onCheckedChange={(checked) => handleSettingsChange('autoTranscribe', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {t('autoPlayResponses')}
                      </Label>
                      <Switch
                        checked={settings.autoPlay}
                        onCheckedChange={(checked) => handleSettingsChange('autoPlay', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {t('noiseReduction')}
                      </Label>
                      <Switch
                        checked={settings.noiseReduction}
                        onCheckedChange={(checked) => handleSettingsChange('noiseReduction', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {t('echoCancellation')}
                      </Label>
                      <Switch
                        checked={settings.echoCancellation}
                        onCheckedChange={(checked) => handleSettingsChange('echoCancellation', checked)}
                      />
                    </div>
                  </div>

                  {/* Quality Settings */}
                  <div>
                    <Label className="text-sm font-medium">
                      {t('recordingQuality')}
                    </Label>
                    <select
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
                    <Label className="text-sm font-medium">
                      {t('maxRecordingDuration')}
                    </Label>
                    <Input
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Thinking Interface */}
          <div className={showSettings ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <Card className="card-3d h-[70vh] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-black">
                <Brain className="h-5 w-5 mr-2 text-primary" />
                {t('thinkingTitle')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setSettings(prev => ({ ...prev, autoPlay: !prev.autoPlay }))}
                  variant="outline"
                  size="sm"
                  className={settings.autoPlay ? 'bg-green-50' : ''}
                >
                  {settings.autoPlay ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={() => {
                    setMessages([{
                      id: '1',
                      type: 'assistant',
                      messageType: 'text',
                      content: `🧠 ${t('welcomeMessage')}`,
                      timestamp: new Date()
                    }]);
                    setError(null);
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {messages.length} messages • {isProcessing ? 'Processing' : 'Ready'} • Auto-play {settings.autoPlay ? 'On' : 'Off'}
            </p>
          </CardHeader>
          
          {/* Messages Area */}
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                message.messageType === 'voice' ? (
                  <VoiceMessageDisplay
                    key={message.id}
                    message={{
                      id: message.id,
                      type: message.type === 'user' ? 'sent' : 'received',
                      transcription: message.transcription || message.content,
                      aiResponse: message.aiResponse,
                      duration: message.duration || 0,
                      timestamp: message.timestamp.toISOString(),
                      audioBase64: message.audioBase64,
                      isPlaying: message.isPlaying,
                      mimeType: message.mimeType
                    }}
                    onPlayStateChange={handlePlayStateChange}
                    className="mb-3"
                  />
                ) : (
                  <div
                    key={message.id}
                    className="flex items-start space-x-3"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary text-white' 
                        : 'bg-secondary text-primary'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 max-w-[80%]">
                      <div className={`inline-block p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-black'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      <div className="flex items-center mt-1 text-xs text-black space-x-2">
                        <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {message.isVoice && (
                          <div className="flex items-center space-x-1">
                            <Mic className="h-3 w-3" />
                            <span>{t('voice')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ))}
              
              {isProcessing && (
                <div className="flex items-center space-x-2 text-black">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">{t('loading')}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Error Alert */}
            {error && (
              <div className="m-4 border border-red-200 bg-red-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-red-800 text-sm">{error}</span>
                  <Button onClick={() => setError(null)} variant="ghost" size="sm">
                    ✕
                  </Button>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                  <span className="text-sm text-blue-700">Processing your thought...</span>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-border p-4 space-y-3">
              {/* Text Input */}
              <div className="flex items-center space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('content')}
                  className="flex-1 text-black"
                  disabled={isProcessing}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={isListening ? 'voice-active bg-accent text-accent-foreground' : ''}
                  disabled={!isSupported}
                  title={!isSupported ? 'Voice input not supported' : 
                         isListening ? 'Stop listening' : 'Start voice input'}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Voice Recorder */}
              <VoiceMessageRecorder
                onVoiceMessageSent={handleVoiceMessageSent}
                onError={handleVoiceMessageError}
                webhookUrl="/api/n8n/webhook"
                className="w-full"
              />
              
              <div className="mt-2">
                {transcript && (
                  <p className="text-sm text-black italic">{t('search')}: "{transcript}"</p>
                )}
                
                <div className="text-xs text-black mt-1">
                  Press Enter to send text • Hold microphone to record voice
                </div>
              </div>

              {/* Footer Info */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Voice Features: Auto-transcribe {settings.autoTranscribe ? 'On' : 'Off'} • Auto-play {settings.autoPlay ? 'On' : 'Off'}
                  </span>
                  <span>
                    Connected to N8n Think Tool Webhook
                  </span>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use the Think Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Text Thoughts
                </h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. Type your thought in the input field</li>
                  <li>2. Press Enter to send</li>
                  <li>3. Watch as AI processes your thinking</li>
                  <li>4. Receive intelligent analysis and insights</li>
                  <li>5. Continue the thinking conversation</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Thoughts
                </h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. Click the microphone icon to record</li>
                  <li>2. Speak your thoughts clearly</li>
                  <li>3. Click stop when finished</li>
                  <li>4. Review the transcription</li>
                  <li>5. Send to AI for deep analysis</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Features
                </h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li>1. Toggle voice settings panel</li>
                  <li>2. Configure auto-transcribe mode</li>
                  <li>3. Enable noise reduction</li>
                  <li>4. Set recording quality preferences</li>
                  <li>5. Monitor connection status</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}