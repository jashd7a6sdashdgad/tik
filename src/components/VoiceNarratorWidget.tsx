'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { voiceNarrator, narratorSpeak, narratorStop, narratorToggle } from '@/lib/voiceNarrator';
import { voiceConversation, startVoiceConversation, stopVoiceConversation, toggleVoiceConversation, isVoiceConversationActive, startAudioRecording, stopAudioRecording } from '@/lib/voiceConversation';
import { isRecognitionSupported } from '@/lib/voiceRecognition';
import { useRouter } from 'next/navigation';
import { testN8NConnection } from '@/lib/n8nVoiceAssistant';
import { 
  Volume2, 
  VolumeX, 
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Settings,
  MessageCircle,
  Minimize2,
  Maximize2,
  RotateCcw,
  Headphones,
  Bot,
  Zap,
  Heart
} from 'lucide-react';

interface VoiceNarratorWidgetProps {
  className?: string;
}

interface NarratorState {
  isEnabled: boolean;
  isSpeaking: boolean;
  isMinimized: boolean;
  currentMessage: string;
  queueLength: number;
  voiceConfig: {
    rate: number;
    pitch: number;
    volume: number;
    voice?: string;
  };
  // Voice conversation state
  isConversationActive: boolean;
  isListening: boolean;
  lastUserCommand: string;
  conversationSupported: boolean;
}

export default function VoiceNarratorWidget({ className = '' }: VoiceNarratorWidgetProps) {
  const { language } = useSettings();
  const t = useTranslation(language);
  const router = useRouter();
  const [narratorState, setNarratorState] = useState<NarratorState>({
    isEnabled: true,
    isSpeaking: false,
    isMinimized: false,
    currentMessage: '',
    queueLength: 0,
    voiceConfig: {
      rate: 0.9,
      pitch: 1.0,
      volume: 0.8
    },
    isConversationActive: false,
    isListening: false,
    lastUserCommand: '',
    conversationSupported: isRecognitionSupported()
  });
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testMessage, setTestMessage] = useState('Hello! I am your AI narrator assistant. How can I help you today?');
  const audioVisualizerRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize narrator state
    const updateState = () => {
      setNarratorState(prev => ({
        ...prev,
        isEnabled: voiceNarrator.isNarratorEnabled(),
        isSpeaking: voiceNarrator.isSpeechActive(),
        queueLength: voiceNarrator.getQueueLength(),
        voiceConfig: voiceNarrator.getVoiceConfig(),
        isConversationActive: isVoiceConversationActive(),
        isListening: voiceConversation.isCurrentlyListening()
      }));
    };

    // Load available voices
    const loadVoices = () => {
      setAvailableVoices(voiceNarrator.getAvailableVoices());
    };

    // Event listeners for narrator events
    const handleSpeechStart = (event: any) => {
      setNarratorState(prev => ({
        ...prev,
        isSpeaking: true,
        currentMessage: event.detail.message.text
      }));
      startAudioVisualization();
    };

    const handleSpeechEnd = (event: any) => {
      setNarratorState(prev => ({
        ...prev,
        isSpeaking: false,
        currentMessage: ''
      }));
      stopAudioVisualization();
    };

    // Voice conversation event listeners
    const handleConversationStateChange = (event: any) => {
      const { state } = event.detail;
      setNarratorState(prev => ({
        ...prev,
        isConversationActive: state.isActive,
        isListening: state.isListening,
        lastUserCommand: state.lastCommand
      }));
    };

    const handleVoiceCommand = (event: any) => {
      const { command } = event.detail;
      setNarratorState(prev => ({
        ...prev,
        lastUserCommand: command.transcript
      }));
    };

    // Voice navigation handler
    const handleVoiceNavigation = (event: any) => {
      const { destination } = event.detail;
      console.log('🧭 Voice navigation request:', destination);
      
      if (destination) {
        const path = `/${destination}`;
        console.log('🚀 Navigating to:', path);
        router.push(path);
        
        // Provide audio feedback
        narratorSpeak(`Navigating to ${destination.replace('-', ' ')}. Taking you there now!`, 'system', 'medium');
      }
    };

    // Set up event listeners
    window.addEventListener('narrator:speaking:start', handleSpeechStart);
    window.addEventListener('narrator:speaking:end', handleSpeechEnd);
    window.addEventListener('voiceConversation:stateChange', handleConversationStateChange);
    window.addEventListener('voiceRecognition:result', handleVoiceCommand);
    window.addEventListener('voice:navigate', handleVoiceNavigation);

    // Initial state update
    updateState();
    loadVoices();

    // Update state periodically
    const interval = setInterval(updateState, 1000);

    return () => {
      window.removeEventListener('narrator:speaking:start', handleSpeechStart);
      window.removeEventListener('narrator:speaking:end', handleSpeechEnd);
      window.removeEventListener('voiceConversation:stateChange', handleConversationStateChange);
      window.removeEventListener('voiceRecognition:result', handleVoiceCommand);
      window.removeEventListener('voice:navigate', handleVoiceNavigation);
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startAudioVisualization = () => {
    const canvas = audioVisualizerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create audio visualization bars
      const barCount = 5;
      const barWidth = canvas.width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const height = Math.random() * canvas.height * 0.8 + 10;
        const x = i * barWidth + barWidth * 0.2;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1D4ED8');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - height, barWidth * 0.6, height);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const canvas = audioVisualizerRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleToggleNarrator = () => {
    const newState = !narratorState.isEnabled;
    narratorToggle(newState);
    setNarratorState(prev => ({ ...prev, isEnabled: newState }));
    
    // Remove auto-speaking - user can test manually if they want
  };

  const handleStopSpeaking = () => {
    narratorStop();
    setNarratorState(prev => ({ ...prev, isSpeaking: false, currentMessage: '' }));
  };

  const handleTestVoice = () => {
    narratorSpeak(testMessage, 'system', 'high');
  };

  const handleTestN8N = async () => {
    narratorSpeak('Testing connection to N8N AI assistant. Please wait...', 'system', 'high');
    
    try {
      const connectionTest = await testN8NConnection();
      if (connectionTest) {
        narratorSpeak('N8N AI assistant connection successful! I am ready to help you navigate the website and answer questions.', 'system', 'high');
      } else {
        narratorSpeak('N8N AI assistant connection failed. Please check the webhook URL and try again.', 'error', 'high');
      }
    } catch (error) {
      console.error('N8N connection test error:', error);
      narratorSpeak('N8N AI assistant connection test encountered an error.', 'error', 'high');
    }
  };

  const handleVoiceConfigChange = (key: string, value: number | string) => {
    const newConfig = { [key]: value };
    voiceNarrator.setVoiceConfig(newConfig);
    setNarratorState(prev => ({
      ...prev,
      voiceConfig: { ...prev.voiceConfig, [key]: value }
    }));
  };

  const handleToggleConversation = () => {
    if (!narratorState.conversationSupported) {
      console.warn('Voice conversation not supported');
      return;
    }

    const wasActive = narratorState.isConversationActive;
    
    if (wasActive) {
      // Stop conversation
      stopVoiceConversation();
      console.log('N8N AI conversation stopped');
    } else {
      // Start conversation - now connects to N8N
      startVoiceConversation();
      console.log('N8N AI conversation started - ready for voice commands');
    }
    
    // State will be updated via event listener
  };

  const handleStartListening = async () => {
    if (narratorState.isConversationActive) {
      // Start audio recording for N8N
      console.log('🎤 Starting N8N audio recording...');
      try {
        await startAudioRecording();
      } catch (error) {
        console.error('Failed to start audio recording:', error);
        narratorSpeak('Failed to start audio recording. Please check your microphone permissions.', 'error', 'high');
      }
    } else {
      startVoiceConversation();
    }
  };

  const handleStopListening = async () => {
    if (narratorState.isConversationActive) {
      // Stop audio recording and send to N8N
      console.log('🛑 Stopping N8N audio recording...');
      try {
        await stopAudioRecording();
      } catch (error) {
        console.error('Failed to stop audio recording:', error);
        narratorSpeak('Failed to process audio recording.', 'error', 'high');
      }
    }
  };

  const quickMessages = [
    { text: 'Welcome to your AI assistant!', icon: Bot },
    { text: 'How can I help you today?', icon: MessageCircle },
    { text: 'I am ready to assist you with anything you need.', icon: Zap },
    { text: 'Thank you for using our AI services!', icon: Heart }
  ];

  if (narratorState.isMinimized) {
    return (
      <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
        <Button
          onClick={() => setNarratorState(prev => ({ ...prev, isMinimized: false }))}
          className={`rounded-full w-14 h-14 shadow-lg transition-all duration-300 ${
            narratorState.isSpeaking 
              ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' 
              : narratorState.isEnabled
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
          } text-white`}
        >
          {narratorState.isSpeaking ? (
            <Volume2 className="h-6 w-6" />
          ) : narratorState.isEnabled ? (
            <Headphones className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6" />
          )}
        </Button>
        
        {/* Speaking indicator */}
        {narratorState.isSpeaking && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        )}
        
        {/* Listening indicator */}
        {narratorState.isListening && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <Mic className="h-3 w-3 text-white" />
          </div>
        )}
        
        {/* Queue indicator */}
        {narratorState.queueLength > 0 && (
          <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {narratorState.queueLength}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <Card className="w-80 shadow-xl border-2 border-blue-200 bg-white">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 rounded-t-lg transition-all duration-300 ${
          narratorState.isSpeaking 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white animate-pulse' 
            : narratorState.isListening
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse'
            : narratorState.isConversationActive
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
            : narratorState.isEnabled
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Headphones className="h-5 w-5" />
              {narratorState.isSpeaking && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-sm">AI Voice Assistant</h3>
              <p className="text-xs opacity-90">
                {narratorState.isSpeaking ? '🔊 AI Speaking - will stop when you talk!' : 
                 narratorState.isListening ? '🎤 Listening for your voice...' :
                 narratorState.isConversationActive ? '🤖 N8N AI Connected - Listening!' :
                 narratorState.isEnabled ? '✅ Ready for voice' : '❌ Voice Disabled'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              onClick={() => setNarratorState(prev => ({ ...prev, isMinimized: true }))}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Audio Visualizer & Voice Activity */}
          {(narratorState.isSpeaking || narratorState.isListening) && (
            <div className={`rounded-lg p-3 ${
              narratorState.isListening ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              <canvas
                ref={audioVisualizerRef}
                width={200}
                height={40}
                className="w-full h-10 rounded"
              />
              <p className="text-xs text-center mt-2 text-black">
                {narratorState.isListening ? (
                  narratorState.lastUserCommand ? 
                    `You said: "${narratorState.lastUserCommand}"` :
                    'I\'m listening... Please speak now'
                ) : (
                  narratorState.currentMessage.length > 50 
                    ? `${narratorState.currentMessage.substring(0, 50)}...`
                    : narratorState.currentMessage
                )}
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="space-y-2">
            {/* Speech Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleNarrator}
                className={`flex-1 ${
                  narratorState.isEnabled 
                    ? 'bg-green-500 hover:bg-green-600 border-green-600' 
                    : 'bg-red-500 hover:bg-red-600 border-red-600'
                } text-white font-medium transition-all duration-200`}
                size="default"
              >
                {narratorState.isEnabled ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Speech On
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Speech Off
                  </>
                )}
              </Button>
              
              {narratorState.isSpeaking && (
                <Button
                  onClick={handleStopSpeaking}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Voice Conversation Controls */}
            {narratorState.conversationSupported && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleToggleConversation}
                  className={`flex-1 ${
                    narratorState.isConversationActive 
                      ? 'bg-blue-500 hover:bg-blue-600 border-blue-600' 
                      : 'bg-purple-500 hover:bg-purple-600 border-purple-600'
                  } text-white font-medium transition-all duration-200`}
                  size="default"
                >
                  {narratorState.isConversationActive ? (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      End N8N AI Chat
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Start N8N AI Chat
                    </>
                  )}
                </Button>
                
                {narratorState.isConversationActive && (
                  <Button
                    onClick={narratorState.isListening ? handleStopListening : handleStartListening}
                    variant="outline"
                    className={`${
                      narratorState.isListening 
                        ? 'border-red-500 text-red-600 hover:bg-red-50' 
                        : 'border-green-500 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {narratorState.isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Not supported message */}
            {!narratorState.conversationSupported && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <p className="text-xs text-yellow-800">
                  Voice conversation requires microphone support in your browser.
                </p>
              </div>
            )}
          </div>

          {/* Queue Status */}
          {narratorState.queueLength > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-sm text-orange-800">
                {narratorState.queueLength} message{narratorState.queueLength > 1 ? 's' : ''} in queue
              </p>
            </div>
          )}

          {/* N8N Voice Conversation Status */}
          {narratorState.isConversationActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">N8N AI Assistant Connected</span>
              </div>
              <p className="text-xs text-blue-700">
                {narratorState.isSpeaking ? (
                  '🔊 Playing N8N AI response (binary audio)...'
                ) : narratorState.isListening ? (
                  '🎤 Recording audio for N8N AI - speak now!'
                ) : (
                  '🤖 N8N AI ready - sends/receives binary audio files'
                )}
              </p>
              {narratorState.lastUserCommand && (
                <p className="text-xs text-blue-600 mt-1 italic">
                  You said: "{narratorState.lastUserCommand}"
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                🎙️ Click mic → Speak → Release to send audio to N8N
              </p>
              <div className="mt-2 flex justify-center">
                <Button
                  onMouseDown={handleStartListening}
                  onMouseUp={handleStopListening}
                  onTouchStart={handleStartListening}
                  onTouchEnd={handleStopListening}
                  className={`px-4 py-2 rounded-full transition-all duration-200 ${
                    narratorState.isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  size="sm"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {narratorState.isListening ? 'Recording...' : 'Hold to Record'}
                </Button>
              </div>
            </div>
          )}

          {/* Quick Messages */}
          {narratorState.isEnabled && !narratorState.isSpeaking && !narratorState.isConversationActive && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-black">Quick Test Messages:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickMessages.map((msg, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-xs p-2 h-auto"
                    onClick={() => narratorSpeak(msg.text, 'system', 'medium')}
                  >
                    <msg.icon className="h-3 w-3" />
                    {msg.text.length > 15 ? `${msg.text.substring(0, 15)}...` : msg.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-black">Voice Settings</h4>
              
              {/* Voice Selection */}
              <div>
                <label className="text-sm text-black mb-1 block">Voice:</label>
                <select
                  value={narratorState.voiceConfig.voice || ''}
                  onChange={(e) => handleVoiceConfigChange('voice', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm text-black"
                >
                  <option value="">Default Voice</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Control */}
              <div>
                <label className="text-sm text-black mb-1 block">
                  Speed: {narratorState.voiceConfig.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={narratorState.voiceConfig.rate}
                  onChange={(e) => handleVoiceConfigChange('rate', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Pitch Control */}
              <div>
                <label className="text-sm text-black mb-1 block">
                  Pitch: {narratorState.voiceConfig.pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={narratorState.voiceConfig.pitch}
                  onChange={(e) => handleVoiceConfigChange('pitch', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Volume Control */}
              <div>
                <label className="text-sm text-black mb-1 block">
                  Volume: {Math.round(narratorState.voiceConfig.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={narratorState.voiceConfig.volume}
                  onChange={(e) => handleVoiceConfigChange('volume', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Voice Recognition Settings */}
              {narratorState.conversationSupported && (
                <div>
                  <label className="text-sm text-black mb-1 block">Voice Conversation:</label>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">
                      Voice conversation allows you to speak with the AI naturally.
                    </div>
                    <Button
                      onClick={handleToggleConversation}
                      variant="outline"
                      size="sm"
                      className={`w-full ${
                        narratorState.isConversationActive ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      {narratorState.isConversationActive ? (
                        <>
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Stop Conversation
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 mr-1" />
                          Start Conversation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Test Message */}
              <div>
                <label className="text-sm text-black mb-1 block">Test Message:</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm text-black resize-none"
                  rows={2}
                />
                <div className="mt-2 space-y-2">
                  <Button
                    onClick={handleTestVoice}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!narratorState.isEnabled}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Test Voice
                  </Button>
                  <Button
                    onClick={handleTestN8N}
                    variant="outline"
                    size="sm"
                    className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Test N8N AI Connection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}