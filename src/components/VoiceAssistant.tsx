'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { useSpeechSynthesis, useSpeechRecognition } from 'react-speech-kit';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  MessageCircle,
  Bot,
  User,
  Loader2
} from 'lucide-react';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceMessage {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  audioUrl?: string;
}

export function VoiceAssistant() {
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true); // react-speech-kit handles this internally
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); // For N8N audio playback
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // React Speech Kit hooks
  const { speak, cancel, speaking, supported: speechSupported, voices } = useSpeechSynthesis();
  
  // Force voices to load (sometimes they're empty initially)
  useEffect(() => {
    if (speechSupported && voices.length === 0) {
      // Try to trigger voices loading
      window.speechSynthesis.getVoices();
      // Set up event listener for when voices are loaded
      const handleVoicesChanged = () => {
        console.log('🎤 Voices loaded:', window.speechSynthesis.getVoices().length);
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [speechSupported, voices.length]);
  const {
    listen,
    listening,
    stop,
    supported: recognitionSupported
  } = useSpeechRecognition({
    onResult: (result: string) => {
      console.log('🎤 Speech recognition result:', result);
      if (result.trim()) {
        handleUserMessage(result);
      }
    },
    onError: (error: any) => {
      console.error('🎤 Speech recognition error:', error);
      setError(error.message || 'Voice recognition error occurred');
    }
  });
  
  // More flexible support detection - use manual check as fallback
  const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const isSupported = (speechSupported || hasSpeechSynthesis) && (recognitionSupported || hasSpeechRecognition);
  const isListening = listening;
  const isSpeaking = speaking || isPlayingAudio; // Either TTS or N8N audio

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for browser support with detailed debugging
  useEffect(() => {
    console.log('🔍 Browser support check:');
    console.log('  - Speech synthesis supported:', speechSupported);
    console.log('  - Speech recognition supported:', recognitionSupported);
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Browser language:', navigator.language);
    
    // Manual browser support check as fallback
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    
    console.log('  - Manual synthesis check:', hasSpeechSynthesis);
    console.log('  - Manual recognition check:', hasSpeechRecognition);
    
    if (!speechSupported && !hasSpeechSynthesis) {
      setError('Speech synthesis not supported in this browser. Please use Chrome, Edge, or Safari.');
    } else if (!recognitionSupported && !hasSpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    } else if (!speechSupported || !recognitionSupported) {
      console.warn('⚠️ react-speech-kit reports unsupported, but manual check suggests support exists');
      // Don't show error if manual check passes
    }
  }, [speechSupported, recognitionSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      cancel(); // Cancel speech synthesis
      stop(); // Stop speech recognition
    };
  }, [currentAudio, cancel, stop]);

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    
    console.log('🎤 Processing user message:', text);

    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send to AI processing endpoint
      const response = await fetch('/api/ai/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text.trim(),
          language,
          context: messages.slice(-5) // Send last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: VoiceMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          type: 'assistant',
          timestamp: new Date(),
          audioUrl: data.audioUrl
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Handle audio response from N8N
        if (data.audioBase64) {
          playAudioFromBase64(data.audioBase64);
        } else if (data.audioUrl) {
          playAudioResponse(data.audioUrl);
        } else {
          speakText(data.response);
        }
      } else {
        throw new Error(data.error || 'Failed to process message');
      }
    } catch (error) {
      console.error('Voice assistant error:', error);
      
      const errorMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        text: language === 'ar' 
          ? 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.'
          : 'Sorry, I encountered an error processing your message. Please try again.',
        type: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      speakText(errorMessage.text);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    console.log('🔊 Speaking text:', text);
    console.log('🔊 Speech synthesis details:');
    console.log('  - speechSupported:', speechSupported);
    console.log('  - speak function available:', !!speak);
    console.log('  - hasSpeechSynthesis:', hasSpeechSynthesis);
    console.log('  - Available voices:', voices.length);
    
    if (speechSupported && speak) {
      // Use react-speech-kit if available
      console.log('✅ Using react-speech-kit for speech');
      const preferredVoice = voices.find(voice => 
        language === 'ar' 
          ? voice.lang.startsWith('ar')
          : voice.lang.startsWith('en')
      );
      
      console.log('🎤 Selected voice:', preferredVoice?.name || 'default');
      
      speak({ 
        text,
        voice: preferredVoice,
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0
      });
    } else if (hasSpeechSynthesis) {
      // Fallback to native API
      console.log('📢 Using native speech synthesis as fallback');
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      
      const availableVoices = window.speechSynthesis.getVoices();
      console.log('🎤 Available native voices:', availableVoices.length);
      
      const preferredVoice = availableVoices.find(voice => 
        language === 'ar' 
          ? voice.lang.startsWith('ar')
          : voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎤 Selected native voice:', preferredVoice.name);
      } else {
        console.log('🎤 Using default native voice');
      }
      
      utterance.onstart = () => console.log('🔊 Native speech started');
      utterance.onend = () => console.log('✅ Native speech ended');
      utterance.onerror = (e) => console.error('❌ Native speech error:', e);
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('❌ Speech synthesis not supported');
    }
  };

  const playAudioFromBase64 = (audioBase64: string) => {
    try {
      console.log('🎵 Playing audio from N8N base64');
      
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.onplay = () => {
        console.log('🔊 N8N audio started playing');
        setIsPlayingAudio(true);
      };
      audio.onended = () => {
        console.log('✅ N8N audio finished playing');
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      audio.onerror = (error) => {
        console.error('❌ N8N audio playback error:', error);
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      
      setCurrentAudio(audio);
      audio.play().catch(console.error);
    } catch (error) {
      console.error('❌ Failed to play N8N audio:', error);
      setIsPlayingAudio(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }

    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    
    setCurrentAudio(audio);
    audio.play().catch(console.error);
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
    
    // Stop react-speech-kit
    if (cancel) {
      cancel();
    }
    
    // Stop native speech synthesis as fallback
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const startVoiceRecording = () => {
    stopSpeaking(); // Stop any current speech
    setError(null);
    console.log('🎤 Starting voice recognition...');
    
    if (recognitionSupported && listen) {
      // Use react-speech-kit if available
      listen({ 
        lang: language === 'ar' ? 'ar-SA' : 'en-US',
        interimResults: false,
        continuous: false
      });
    } else if (hasSpeechRecognition) {
      // Fallback to native API
      console.log('🎙️ Using native speech recognition as fallback');
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        console.log('🎤 Native recognition result:', result);
        if (result.trim()) {
          handleUserMessage(result);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🎤 Native recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}`);
      };
      
      recognition.start();
    } else {
      setError('Speech recognition not supported in this browser');
    }
  };

  const clearConversation = () => {
    setMessages([]);
    stopSpeaking();
  };

  const initializeAssistant = () => {
    console.log('🚀 Initializing Voice Assistant');
    console.log('🔍 Browser support status:');
    console.log('  - Speech synthesis supported:', speechSupported);
    console.log('  - Speech recognition supported:', recognitionSupported);
    console.log('  - Manual synthesis check:', hasSpeechSynthesis);
    console.log('  - Manual recognition check:', hasSpeechRecognition);
    console.log('  - Overall supported:', isSupported);
    
    setIsOpen(true);
    
    const welcomeMessage: VoiceMessage = {
      id: Date.now().toString(),
      text: language === 'ar' 
        ? 'مرحباً! أنا مساعدك الصوتي الذكي. يمكنك التحدث معي عن أي شيء تريده. اضغط على الميكروفون وابدأ الحديث.'
        : 'Hello! I\'m your intelligent voice assistant. You can talk to me about anything. Press the microphone and start speaking.',
      type: 'assistant',
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    // Test speaking immediately
    console.log('🔊 Attempting to speak welcome message...');
    speakText(welcomeMessage.text);
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="shadow-lg border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">
              {t('voiceNotSupported')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={initializeAssistant}
          className="rounded-full w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
          title={t('activateVoiceAssistant')}
          aria-label={t('activateVoiceAssistant')}
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className={`rounded-full w-14 h-14 shadow-xl transition-all duration-300 text-white ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : isSpeaking 
              ? 'bg-green-500 hover:bg-green-600 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-110'
          }`}
          title={t('expandVoiceAssistant')}
        >
          {isListening ? <Mic className="h-6 w-6" /> : 
           isSpeaking ? <Volume2 className="h-6 w-6" /> : 
           <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh]">
      <Card className="shadow-2xl border-2 border-primary/20 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bot className="h-6 w-6 text-primary" />
                {(isListening || isSpeaking) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{t('voiceAssistant')}</h3>
                <p className="text-xs text-gray-600">
                  {isListening ? t('listening') : 
                   isSpeaking ? t('speaking') : 
                   isProcessing ? t('processing') : t('ready')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopSpeaking}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  title={t('stopSpeaking')}
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
                title={t('minimize')}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                title={t('close')}
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800 border'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && (
                      <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.type === 'user' && (
                      <User className="h-4 w-4 mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2 border">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">{t('thinking')}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Input */}
          <div className="p-4 border-t bg-gray-50">
            {error && (
              <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}
            

            {/* Test Text Input */}
            <div className="mb-3 flex items-center space-x-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && testMessage.trim() && !isProcessing) {
                    handleUserMessage(testMessage);
                    setTestMessage('');
                  }
                }}
                placeholder={language === 'ar' ? 'اكتب رسالة للاختبار...' : 'Type a test message...'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <Button
                onClick={() => {
                  if (testMessage.trim() && !isProcessing) {
                    handleUserMessage(testMessage);
                    setTestMessage('');
                  }
                }}
                disabled={!testMessage.trim() || isProcessing}
                size="sm"
                className="px-3"
              >
                {t('send') || 'Send'}
              </Button>
            </div>

            {/* Debug Test Buttons */}
            <div className="mb-3 flex items-center space-x-2">
              <Button
                onClick={() => {
                  console.log('🔊 Test Speech button clicked');
                  try {
                    speakText('Test speech synthesis');
                  } catch (error) {
                    console.error('❌ Test speech error:', error);
                    alert('Speech test failed: ' + (error as Error).message);
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                🔊 Test Speech
              </Button>
              <Button
                onClick={() => {
                  console.log('🎤 Test Voice button clicked');
                  const testText = language === 'ar' ? 'اختبار الصوت العربي' : 'Hello, this is a test';
                  console.log('🎤 Testing with text:', testText);
                  try {
                    speakText(testText);
                  } catch (error) {
                    console.error('❌ Test voice error:', error);
                    alert('Voice test failed: ' + (error as Error).message);
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                🎤 Test Voice
              </Button>
              <Button
                onClick={() => {
                  console.log('🔍 Debug button clicked');
                  const debugInfo = { 
                    speechSupported, 
                    recognitionSupported, 
                    hasSpeechSynthesis, 
                    hasSpeechRecognition, 
                    isSupported,
                    voicesCount: voices.length,
                    speakFunction: !!speak,
                    cancelFunction: !!cancel,
                    userAgent: navigator.userAgent,
                    language
                  };
                  console.log('🔍 Voice debug info:', debugInfo);
                  alert('Debug info logged to console. Check browser console for details.');
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                🔍 Debug
              </Button>
              <Button
                onClick={() => {
                  console.log('📢 Testing native speech synthesis directly');
                  try {
                    if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                      const utterance = new SpeechSynthesisUtterance('Native speech test');
                      utterance.rate = 1;
                      utterance.pitch = 1;
                      utterance.volume = 1;
                      utterance.onstart = () => console.log('✅ Native speech started');
                      utterance.onend = () => console.log('✅ Native speech ended');
                      utterance.onerror = (e) => console.error('❌ Native speech error:', e);
                      window.speechSynthesis.speak(utterance);
                      console.log('📢 Native speech command sent');
                    } else {
                      alert('Native speech synthesis not available');
                    }
                  } catch (error) {
                    console.error('❌ Native speech test error:', error);
                    alert('Native speech test failed: ' + (error as Error).message);
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                📢 Native Test
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={isListening ? stop : startVoiceRecording}
                  disabled={isProcessing}
                  className={`w-12 h-12 rounded-full transition-all duration-200 ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
                  }`}
                  title={isListening ? t('stopListening') : t('startListening')}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                {isListening && (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-blue-500 rounded-full h-4 animate-pulse"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">{t('listening')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {messages.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearConversation}
                    className="text-xs"
                  >
                    {t('clear')}
                  </Button>
                )}
                
                <div 
                  className={`w-2 h-2 rounded-full ${
                    isListening ? 'bg-red-500' : 
                    isSpeaking ? 'bg-green-500' : 
                    'bg-blue-500'
                  }`} 
                  title={
                    isListening ? t('listening') : 
                    isSpeaking ? t('speaking') : 
                    t('ready')
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}