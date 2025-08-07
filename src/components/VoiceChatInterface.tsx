'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Volume2, VolumeX, Settings, Send, Mic } from 'lucide-react';
import VoiceMessageDisplay from './VoiceMessageDisplay';
import TextMessageDisplay from './TextMessageDisplay';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface ChatMessage {
  id: string;
  type: 'sent' | 'received';
  messageType: 'voice' | 'text';
  content?: string;
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
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  // Voice recorder state & refs
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationRef = useRef<number>(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const handleSendRecordedAudio = useCallback(async (audioBlob: Blob, duration: number) => {
    setIsProcessing(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const payload = {
        type: 'voice_message',
        action: 'send',
        audio: audioBase64,
        fileName: `voiceMessage_${Date.now()}.webm`,
        mimeType: audioBlob.type,
        duration: duration,
        timestamp: new Date().toISOString(),
        size: audioBlob.size,
      };

      // Logging for debugging
      console.log('Sending voice payload:', payload);

      const sentMessage: ChatMessage = {
        id: `sent-${Date.now()}`,
        type: 'sent',
        messageType: 'voice',
        transcription: 'Processing...',
        duration: duration,
        timestamp: new Date().toISOString(),
        audioBase64,
        mimeType: audioBlob.type
      };
      setMessages(prev => [...prev, sentMessage]);
      scrollToBottom();

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to send voice message: ${response.statusText}`);
      }

      const result = await response.json();
      
      setMessages(prev => prev.map(msg => 
        msg.id === sentMessage.id
          ? { ...msg, transcription: result.data?.transcription || msg.transcription }
          : msg
      ));

      if (result.data?.aiResponse) {
        const receivedMessage: ChatMessage = {
          id: `received-${Date.now()}`,
          type: 'received',
          messageType: 'voice',
          transcription: result.data.transcription,
          aiResponse: result.data.aiResponse,
          audioBase64: result.data.audioResponse,
          duration: result.data.responseDuration || 3,
          timestamp: new Date().toISOString(),
          mimeType: 'audio/mp3'
        };

        setTimeout(() => {
          setMessages(prev => [...prev, receivedMessage]);
          if (isAutoPlayEnabled && receivedMessage.audioBase64) {
             // Logic to auto-play would go here
          }
          scrollToBottom();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error sending voice message:', err);
      setError(err.message || t('failedToProcessVoice'));
      setMessages(prev => prev.filter(msg => msg.transcription !== 'Processing...'));
    } finally {
      setIsProcessing(false);
    }
  }, [blobToBase64, scrollToBottom, webhookUrl, isAutoPlayEnabled, t]);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        if (audioBlob.size > 0) {
          handleSendRecordedAudio(audioBlob, durationRef.current);
        } else {
          console.warn('Recorded audio blob is empty. Not sending.');
          setIsProcessing(false);
        }
        setIsRecording(false);
        durationRef.current = 0;
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      durationRef.current = 0;
      durationTimerRef.current = setInterval(() => {
        durationRef.current++;
      }, 1000);
      console.log('Manual recording started.');

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || t('failedToAccessMicrophone'));
      setIsRecording(false);
    }
  }, [isProcessing, handleSendRecordedAudio, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentPlayingId(null);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlayEnabled(prev => !prev);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const sendTextMessage = useCallback(async () => {
    if (!textInput.trim() || isProcessing) return;

    const messageText = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    setError(null);

    try {
      const sentMessage: ChatMessage = {
        id: `sent-${Date.now()}`,
        type: 'sent',
        messageType: 'text',
        content: messageText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, sentMessage]);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text_message',
          action: 'send',
          content: messageText,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to send text message: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data?.aiResponse) {
        const receivedMessage: ChatMessage = {
          id: `received-${Date.now()}`,
          type: 'received',
          messageType: 'text',
          content: result.data.aiResponse,
          timestamp: new Date().toISOString()
        };

        setTimeout(() => {
          setMessages(prev => [...prev, receivedMessage]);
        }, 1000);
      }

      setTimeout(scrollToBottom, 100);

    } catch (err: any) {
      console.error('Failed to send text message:', err);
      setError(err.message || t('failedToSendText'));
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, isProcessing, webhookUrl, scrollToBottom, t]);

  const handleTextInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  }, [sendTextMessage]);

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

  const handlePlayStateChange = useCallback((messageId: string, isPlaying: boolean) => {
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
  }, [currentPlayingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (currentPlayingId) {
        setCurrentPlayingId(null);
      }
    };
  }, [currentPlayingId]);

  return (
    <div className={`voice-chat-interface flex flex-col h-full ${className}`}>
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

      {isProcessing && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-blue-700">Processing your voice message...</span>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        <div className="flex items-center space-x-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleTextInputKeyPress}
            placeholder={t('typeMessage')}
            disabled={isRecording || isProcessing}
            className="flex-1"
          />
          <Button
            onClick={sendTextMessage}
            disabled={!textInput.trim() || isProcessing || isRecording}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center p-3">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            size="sm"
            className={`relative h-12 w-12 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {isRecording && (
              <div className="absolute inset-0 bg-red-400 opacity-50 rounded-full animate-ping" />
            )}
            <Mic className={`h-6 w-6 text-white ${isRecording ? 'animate-pulse' : ''}`} />
          </Button>
          <span className="ml-4 text-sm text-gray-500">
            {isRecording ? 'Recording...' : 'Tap to speak'}
          </span>
        </div>
      </div>

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