'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { voiceNarrator, narratorSpeak, narratorStop, narratorToggle } from '@/lib/voiceNarrator';
import {
  voiceConversation,
  startVoiceConversation,
  stopVoiceConversation,
  isVoiceConversationActive,
  startAudioRecording,
  stopAudioRecording,
} from '@/lib/voiceConversation';
import { isRecognitionSupported } from '@/lib/voiceRecognition';
import { useRouter } from 'next/navigation';
import { testN8NConnection } from '@/lib/n8nVoiceAssistant';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  Square,
  Settings,
  MessageCircle,
  Minimize2,
  Maximize2,
  Headphones,
  Bot,
  Zap,
  Heart,
} from 'lucide-react';

interface VoiceNarratorWidgetProps {
  className?: string;
}

// Separate state for better readability and targeted updates
interface NarratorState {
  isEnabled: boolean;
  isSpeaking: boolean;
  queueLength: number;
}

interface ConversationState {
  isActive: boolean;
  isListening: boolean;
  lastUserCommand: string;
}

export default function VoiceNarratorWidget({ className = '' }: VoiceNarratorWidgetProps) {
  const { language } = useSettings();
  const t = useTranslation(language);
  const router = useRouter();

  // Use separate state hooks for more granular control
  const [narratorState, setNarratorState] = useState<NarratorState>({
    isEnabled: true,
    isSpeaking: false,
    queueLength: 0,
  });

  const [conversationState, setConversationState] = useState<ConversationState>({
    isActive: false,
    isListening: false,
    lastUserCommand: '',
  });

  const [voiceConfig, setVoiceConfig] = useState(voiceNarrator.getVoiceConfig());
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testMessage, setTestMessage] = useState('Hello! I am your AI narrator assistant. How can I help you today?');
  const conversationSupported = isRecognitionSupported();

  const audioVisualizerRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Use useCallback to memoize event handlers and prevent re-creation on every render
  const handleSpeechStart = useCallback(() => {
    setNarratorState(prev => ({
      ...prev,
      isSpeaking: true,
    }));
    startAudioVisualization();
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setNarratorState(prev => ({
      ...prev,
      isSpeaking: false,
    }));
    stopAudioVisualization();
  }, []);

  const handleConversationStateChange = useCallback((event: CustomEvent) => {
    const { state } = event.detail;
    setConversationState(state);
  }, []);

  const handleVoiceCommand = useCallback((event: CustomEvent) => {
    const { command } = event.detail;
    setConversationState(prev => ({
      ...prev,
      lastUserCommand: command.transcript,
    }));
  }, []);

  const handleVoiceNavigation = useCallback((event: CustomEvent) => {
    const { destination } = event.detail;
    console.log('🧭 Voice navigation request:', destination);

    if (destination) {
      const path = `/${destination}`;
      console.log('🚀 Navigating to:', path);
      router.push(path);
      narratorSpeak(`Navigating to ${destination.replace('-', ' ')}. Taking you there now!`, 'system', 'medium');
    }
  }, [router]);

  useEffect(() => {
    const updateState = () => {
      setNarratorState(prev => ({
        ...prev,
        isEnabled: voiceNarrator.isNarratorEnabled(),
        isSpeaking: voiceNarrator.isSpeechActive(),
        queueLength: voiceNarrator.getQueueLength(),
      }));
      setConversationState(prev => ({
        ...prev,
        isActive: isVoiceConversationActive(),
        isListening: voiceConversation.isCurrentlyListening(),
      }));
      setVoiceConfig(voiceNarrator.getVoiceConfig());
    };

    const loadVoices = () => {
      setAvailableVoices(voiceNarrator.getAvailableVoices());
    };

    // Correctly type the event listeners
    window.addEventListener('narrator:speaking:start', handleSpeechStart as EventListener);
    window.addEventListener('narrator:speaking:end', handleSpeechEnd as EventListener);
    window.addEventListener('voiceConversation:stateChange', handleConversationStateChange as EventListener);
    window.addEventListener('voiceRecognition:result', handleVoiceCommand as EventListener);
    window.addEventListener('voice:navigate', handleVoiceNavigation as EventListener);

    updateState();
    loadVoices();

    const interval = setInterval(updateState, 1000);

    return () => {
      window.removeEventListener('narrator:speaking:start', handleSpeechStart as EventListener);
      window.removeEventListener('narrator:speaking:end', handleSpeechEnd as EventListener);
      window.removeEventListener('voiceConversation:stateChange', handleConversationStateChange as EventListener);
      window.removeEventListener('voiceRecognition:result', handleVoiceCommand as EventListener);
      window.removeEventListener('voice:navigate', handleVoiceNavigation as EventListener);
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleSpeechStart, handleSpeechEnd, handleConversationStateChange, handleVoiceCommand, handleVoiceNavigation]);

  const startAudioVisualization = () => {
    const canvas = audioVisualizerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 5;
      const barWidth = canvas.width / barCount;
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1D4ED8');

      for (let i = 0; i < barCount; i++) {
        const height = Math.random() * canvas.height * 0.8 + 10;
        const x = i * barWidth + barWidth * 0.2;
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
  };

  const handleStopSpeaking = () => {
    narratorStop();
    setNarratorState(prev => ({ ...prev, isSpeaking: false }));
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

  const handleVoiceConfigChange = (key: keyof typeof voiceConfig, value: number | string) => {
    const newConfig = { ...voiceConfig, [key]: value };
    voiceNarrator.setVoiceConfig(newConfig);
    setVoiceConfig(newConfig);
  };

  const handleToggleConversation = () => {
    if (!conversationSupported) {
      console.warn('Voice conversation not supported');
      return;
    }
    const wasActive = conversationState.isActive;
    if (wasActive) {
      stopVoiceConversation();
      console.log('N8N AI conversation stopped');
    } else {
      startVoiceConversation();
      console.log('N8N AI conversation started - ready for voice commands');
    }
  };

  const handleStartListening = async () => {
    if (conversationState.isActive) {
      console.log('🎤 Starting N8N audio recording...');
      try {
        await startAudioRecording();
        setConversationState(prev => ({ ...prev, isListening: true }));
      } catch (error) {
        console.error('Failed to start audio recording:', error);
        narratorSpeak('Failed to start audio recording. Please check your microphone permissions.', 'error', 'high');
      }
    } else {
      startVoiceConversation();
    }
  };

  const handleStopListening = async () => {
    if (conversationState.isActive) {
      console.log('🛑 Stopping N8N audio recording...');
      try {
        await stopAudioRecording();
        setConversationState(prev => ({ ...prev, isListening: false }));
      } catch (error) {
        console.error('Failed to stop audio recording:', error);
        narratorSpeak('Failed to process audio recording.', 'error', 'high');
      }
    }
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
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
        {narratorState.isSpeaking && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        )}
        {conversationState.isListening && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <Mic className="h-3 w-3 text-white" />
          </div>
        )}
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
            : conversationState.isListening
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse'
              : conversationState.isActive
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
                {narratorState.isSpeaking
                  ? '🔊 AI Speaking...'
                  : conversationState.isListening
                    ? '🎤 Listening for your voice...'
                    : conversationState.isActive
                      ? '🤖 N8N AI Connected'
                      : narratorState.isEnabled
                        ? '✅ Ready for voice'
                        : '❌ Voice Disabled'}
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
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Audio Visualizer & Voice Activity */}
          {(narratorState.isSpeaking || conversationState.isListening) && (
            <div className={`rounded-lg p-3 ${
              conversationState.isListening ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              <canvas
                ref={audioVisualizerRef}
                width={200}
                height={40}
                className="w-full h-10 rounded"
              />
              <p className="text-xs text-center mt-2 text-black">
                {conversationState.isListening ? (
                  conversationState.lastUserCommand
                    ? `You said: "${conversationState.lastUserCommand}"`
                    : 'I\'m listening...'
                ) : (
                  // Display a generic "AI Speaking" message for simplicity
                  'AI Speaking...'
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
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
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
                  aria-label="Stop speaking"
                >
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Voice Conversation Controls */}
            {conversationSupported && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleToggleConversation}
                  className={`flex-1 ${
                    conversationState.isActive
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-purple-500 hover:bg-purple-600'
                  } text-white font-medium transition-all duration-200`}
                  size="default"
                >
                  {conversationState.isActive ? (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      End AI Chat
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Start AI Chat
                    </>
                  )}
                </Button>

                {conversationState.isActive && (
                  <Button
                    onMouseDown={handleStartListening}
                    onMouseUp={handleStopListening}
                    onMouseLeave={handleStopListening}
                    onTouchStart={handleStartListening}
                    onTouchEnd={handleStopListening}
                    variant="outline"
                    className={`${
                      conversationState.isListening
                        ? 'border-red-500 text-red-600 hover:bg-red-50'
                        : 'border-green-500 text-green-600 hover:bg-green-50'
                    }`}
                    aria-label={conversationState.isListening ? 'Stop recording' : 'Hold to record'}
                  >
                    {conversationState.isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            )}

            {!conversationSupported && (
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

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-black">Voice Settings</h4>
              {/* Voice Selection */}
              <div>
                <label className="text-sm text-black mb-1 block">Voice:</label>
                <select
                  value={voiceConfig.voice || ''}
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
                  Speed: {voiceConfig.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceConfig.rate}
                  onChange={(e) => handleVoiceConfigChange('rate', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              {/* Pitch Control */}
              <div>
                <label className="text-sm text-black mb-1 block">
                  Pitch: {voiceConfig.pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceConfig.pitch}
                  onChange={(e) => handleVoiceConfigChange('pitch', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              {/* Volume Control */}
              <div>
                <label className="text-sm text-black mb-1 block">
                  Volume: {Math.round(voiceConfig.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voiceConfig.volume}
                  onChange={(e) => handleVoiceConfigChange('volume', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

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