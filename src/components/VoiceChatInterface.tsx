'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Volume2, VolumeX, Settings, Send, MessageSquare } from 'lucide-react';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import VoiceMessageDisplay from './VoiceMessageDisplay';
import TextMessageDisplay from './TextMessageDisplay';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface ChatMessage {
  id: string;
  type: 'sent' | 'received';
  messageType: 'voice' | 'text';
  content?: string; // For text messages
  audioUrl?: string;
  audioBase64?: string;
  transcription?: string;
  aiResponse?: string;
  duration?: number;
  timestamp: string;
  isPlaying?: boolean;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

interface VoiceChatInterfaceProps {
  className?: string;
  webhookUrl?: string;
  maxMessages?: number;
}

export default function VoiceChatInterface({
  className = '',
  webhookUrl = '/api/voice-messages',
  maxMessages = 50
}: VoiceChatInterfaceProps) {
  // Translation and settings
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Handle voice message sent successfully
   */
  const handleVoiceMessageSent = useCallback(async (response: any) => {
    console.log('Voice message response:', response);
    setIsProcessing(true);
    setError(null);

    try {
      // Add sent message to conversation
      const sentMessage: ChatMessage = {
        id: `sent-${Date.now()}`,
        type: 'sent',
        messageType: 'voice',
        transcription: response.data?.transcription || 'Processing...',
        duration: response.duration || 0,
        timestamp: new Date().toISOString(),
        audioBase64: response.originalAudio, // If returned
        mimeType: response.mimeType
      };

      setMessages(prev => [...prev, sentMessage]);

      // If we have an AI response, add it as a received message
      if (response.data?.aiResponse) {
        const receivedMessage: ChatMessage = {
          id: `received-${Date.now()}`,
          type: 'received',
          messageType: 'voice',
          transcription: response.data.transcription,
          aiResponse: response.data.aiResponse,
          audioBase64: response.data.audioResponse, // AI generated voice
          duration: response.data.responseDuration || 3,
          timestamp: new Date().toISOString(),
          mimeType: 'audio/mp3' // Assuming AI returns MP3
        };

        // Add received message after a short delay
        setTimeout(() => {
          setMessages(prev => [...prev, receivedMessage]);
          
          // Auto-play AI response if enabled
          if (isAutoPlayEnabled && response.data.audioResponse) {
            setTimeout(() => {
              // Auto-play logic would go here
              console.log('Auto-playing AI response...');
            }, 500);
          }
        }, 1000);
      }

      // Scroll to bottom
      setTimeout(scrollToBottom, 100);

    } catch (error: any) {
      console.error('Error processing voice message response:', error);
      setError(t('failedToProcessVoice'));
    } finally {
      setIsProcessing(false);
    }
  }, [isAutoPlayEnabled, scrollToBottom]);

  /**
   * Handle voice message errors
   */
  const handleVoiceMessageError = useCallback((error: string) => {
    console.error('Voice message error:', error);
    setError(error);
    setIsProcessing(false);
  }, []);

  /**
   * Handle play state changes
   */
  const handlePlayStateChange = useCallback((messageId: string, isPlaying: boolean) => {
    if (isPlaying) {
      // Stop any other playing messages
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

    // Update message playing state
    setMessages(prev => prev.map(msg =>
      msg.id === messageId 
        ? { ...msg, isPlaying }
        : msg
    ));
  }, [currentPlayingId]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentPlayingId(null);
  }, []);

  /**
   * Toggle auto-play for AI responses
   */
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlayEnabled(prev => !prev);
  }, []);

  /**
   * Dismiss error message
   */
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Send text message
   */
  const sendTextMessage = useCallback(async () => {
    if (!textInput.trim() || isProcessing) return;

    const messageText = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    setError(null);

    try {
      // Add sent text message to conversation
      const sentMessage: ChatMessage = {
        id: `sent-${Date.now()}`,
        type: 'sent',
        messageType: 'text',
        content: messageText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, sentMessage]);

      // Send to backend/n8n
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text_message',
          action: 'send',
          content: messageText,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Try to get detailed error message from response
        let errorMessage = `Failed to send text message: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Use default error message if can't parse response
        }
        
        if (response.status === 503) {
          errorMessage = 'Text processing service is currently unavailable. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Handle successful response
      if (result.data?.aiResponse) {
        const receivedMessage: ChatMessage = {
          id: `received-${Date.now()}`,
          type: 'received',
          messageType: 'text',
          content: result.data.aiResponse,
          timestamp: new Date().toISOString()
        };

        // Add received message after a short delay
        setTimeout(() => {
          setMessages(prev => [...prev, receivedMessage]);
        }, 1000);
      }

      // Scroll to bottom
      setTimeout(scrollToBottom, 100);

    } catch (error: any) {
      console.error('Failed to send text message:', error);
      setError(error.message || t('failedToSendText'));
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, isProcessing, webhookUrl, scrollToBottom]);

  /**
   * Handle text input key press
   */
  const handleTextInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  }, [sendTextMessage]);

  /**
   * Generate sample messages for testing
   */
  const addSampleMessages = useCallback(() => {
    const sampleMessages: ChatMessage[] = [
      {
        id: 'sample-1',
        type: 'sent',
        messageType: 'text',
        content: 'Hello, how are you doing today?',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'sample-2',
        type: 'received',
        messageType: 'text',
        content: 'Hello! I\'m doing great, thank you for asking. How can I help you today?',
        timestamp: new Date(Date.now() - 240000).toISOString()
      },
      {
        id: 'sample-3',
        type: 'sent',
        messageType: 'voice',
        transcription: 'Can you help me check my calendar for tomorrow?',
        duration: 4,
        timestamp: new Date(Date.now() - 180000).toISOString()
      },
      {
        id: 'sample-4',
        type: 'received',
        messageType: 'voice',
        transcription: 'Can you help me check my calendar for tomorrow?',
        aiResponse: 'Of course! Let me check your calendar for tomorrow. I can see you have a meeting at 2 PM and a doctor\'s appointment at 4 PM.',
        duration: 6,
        timestamp: new Date(Date.now() - 120000).toISOString()
      }
    ];

    setMessages(prev => [...prev, ...sampleMessages]);
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any playing audio
      if (currentPlayingId) {
        setCurrentPlayingId(null);
      }
    };
  }, [currentPlayingId]);

  return (
    <div className={`voice-chat-interface flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{t('chatAssistant')}</h2>
          <p className="text-sm text-gray-500">
            {messages.length} {t('messages')} • {isProcessing ? t('processing') : t('ready')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={toggleAutoPlay}
            variant="outline"
            size="sm"
            className={isAutoPlayEnabled ? 'bg-green-50' : ''}
          >
            {isAutoPlayEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button onClick={clearMessages} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button onClick={addSampleMessages} variant="outline" size="sm">
              {t('addSamples')}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="m-4 border border-red-200 bg-red-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-red-800 text-sm">{error}</span>
            <Button onClick={dismissError} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Volume2 className="h-12 w-12 mx-auto mb-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-500 mb-2">{t('noMessagesYet')}</h3>
              <p className="text-sm text-gray-400">
                {t('typeMessageOrTap')}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              message.messageType === 'voice' ? (
                <VoiceMessageDisplay
                  key={message.id}
                  message={{ ...message, duration: message.duration || 0 }}
                  onPlayStateChange={handlePlayStateChange}
                  className="mb-3"
                />
              ) : (
                <TextMessageDisplay
                  key={message.id}
                  message={message}
                  className="mb-3"
                />
              )
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-blue-700">Processing your voice message...</span>
          </div>
        </div>
      )}

      {/* Message Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        {/* Text Input */}
        <div className="flex items-center space-x-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleTextInputKeyPress}
            placeholder={t('typeMessage')}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={sendTextMessage}
            disabled={!textInput.trim() || isProcessing}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Voice Recorder */}
        <VoiceMessageRecorder
          onVoiceMessageSent={handleVoiceMessageSent}
          onError={handleVoiceMessageError}
          webhookUrl={webhookUrl}
          className="w-full"
        />
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('textVoiceAutoPlay')} {isAutoPlayEnabled ? t('on') : t('off')}
          </span>
          <span>
            {t('webhookUrl')} {webhookUrl}
          </span>
        </div>
      </div>
    </div>
  );
}