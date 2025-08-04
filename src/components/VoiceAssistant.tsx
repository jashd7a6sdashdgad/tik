'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Maximize2,
  MessageCircle,
  Bot,
  User,
  Send,
  Loader2,
  Settings
} from 'lucide-react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [testMessage, setTestMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const {
    isListening,
    isSupported,
    transcript,
    error,
    audioLevel,
    hasPermission,
    startListening,
    stopListening,
    resetTranscript,
    requestPermission
  } = useVoiceInput({
    language: language === 'ar' ? 'ar-SA' : 'en-US',
    continuous: false,
    interimResults: true
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle transcript completion
  useEffect(() => {
    if (transcript && !isListening && transcript.length > 0) {
      handleUserMessage(transcript);
      resetTranscript();
    }
  }, [transcript, isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentAudio]);

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
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set language
    utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      language === 'ar' 
        ? voice.lang.startsWith('ar')
        : voice.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
        setIsSpeaking(true);
      };
      audio.onended = () => {
        console.log('✅ N8N audio finished playing');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      audio.onerror = (error) => {
        console.error('❌ N8N audio playback error:', error);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      
      setCurrentAudio(audio);
      audio.play().catch(console.error);
    } catch (error) {
      console.error('❌ Failed to play N8N audio:', error);
      setIsSpeaking(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }

    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);
    
    setCurrentAudio(audio);
    audio.play().catch(console.error);
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const startVoiceRecording = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    
    stopSpeaking(); // Stop any current speech
    await startListening();
  };

  const clearConversation = () => {
    setMessages([]);
    stopSpeaking();
  };

  const initializeAssistant = () => {
    console.log('🚀 Initializing Voice Assistant');
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
            
            {transcript && (
              <div className="mb-3 p-2 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800">
                <strong>{t('youSaid')}:</strong> {transcript}
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={isListening ? stopListening : startVoiceRecording}
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
                          className={`w-1 bg-blue-500 rounded-full transition-all duration-150 ${
                            audioLevel > i * 20 ? 'h-6' : 'h-2'
                          }`}
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