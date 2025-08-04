'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, MessageSquare, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface VoiceMessage {
  id: string;
  type: 'sent' | 'received';
  audioUrl?: string;
  audioBase64?: string;
  transcription?: string;
  aiResponse?: string;
  duration: number;
  timestamp: string;
  isPlaying?: boolean;
  mimeType?: string;
}

interface VoiceMessageDisplayProps {
  message: VoiceMessage;
  onPlayStateChange?: (id: string, isPlaying: boolean) => void;
  className?: string;
}

export default function VoiceMessageDisplay({
  message,
  onPlayStateChange,
  className = ''
}: VoiceMessageDisplayProps) {
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  /**
   * Initialize audio element
   */
  const initializeAudio = useCallback(() => {
    if (!audioRef.current && (message.audioUrl || message.audioBase64)) {
      const audioSrc = message.audioUrl || `data:${message.mimeType || 'audio/webm'};base64,${message.audioBase64}`;
      
      audioRef.current = new Audio(audioSrc);
      
      // Audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        console.log(`Audio loaded: ${message.id}, duration: ${audioRef.current?.duration}s`);
      });
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onPlayStateChange?.(message.id, false);
      });
      
      audioRef.current.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        setIsPlaying(false);
        onPlayStateChange?.(message.id, false);
      });
    }
  }, [message.audioUrl, message.audioBase64, message.mimeType, message.id, onPlayStateChange]);

  /**
   * Toggle audio playback
   */
  const togglePlayback = useCallback(async () => {
    initializeAudio();
    
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPlayStateChange?.(message.id, false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlayStateChange?.(message.id, true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
      onPlayStateChange?.(message.id, false);
    }
  }, [isPlaying, initializeAudio, message.id, onPlayStateChange]);

  /**
   * Format duration for display
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Calculate progress percentage
   */
  const getProgressPercentage = useCallback((): number => {
    if (!audioRef.current || !audioRef.current.duration) return 0;
    return (currentTime / audioRef.current.duration) * 100;
  }, [currentTime]);

  /**
   * Handle progress bar click
   */
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    const newTime = percentage * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Clean up audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`voice-message-display ${className}`}>
      <div
        className={`max-w-xs p-3 rounded-lg ${
          message.type === 'sent'
            ? 'bg-blue-500 text-white ml-auto'
            : 'bg-gray-200 text-gray-800 mr-auto'
        }`}
      >
        {/* Voice message header */}
        <div className="flex items-center mb-2 space-x-2">
          <div className={`p-2 rounded-full ${
            message.type === 'sent' ? 'bg-blue-400' : 'bg-gray-300'
          }`}>
            <Mic className="h-3 w-3" />
          </div>
          <span className="text-xs opacity-75">
            {t('voiceMessage')}
          </span>
        </div>

        {/* Audio controls */}
        <div className="flex items-center mb-2 space-x-2">
          {/* Play/Pause button */}
          <Button
            onClick={togglePlayback}
            className={`p-2 rounded-full ${
              message.type === 'sent'
                ? 'bg-blue-400 hover:bg-blue-300'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            size="sm"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Waveform/Progress bar */}
          <div className="flex-1">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className={`h-6 rounded-full cursor-pointer relative ${
                message.type === 'sent' ? 'bg-blue-400' : 'bg-gray-300'
              }`}
            >
              {/* Progress indicator */}
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  message.type === 'sent' ? 'bg-blue-200' : 'bg-gray-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
              
              {/* Waveform visualization */}
              <div className="absolute inset-0 flex items-center justify-center space-x-0.5">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-all duration-150 ${
                      message.type === 'sent' ? 'bg-blue-200' : 'bg-gray-400'
                    }`}
                    style={{
                      height: `${Math.random() * 12 + 4}px`,
                      opacity: i / 20 <= getProgressPercentage() / 100 ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Duration */}
          <span className="text-xs opacity-75 min-w-[35px]">
            {isPlaying ? formatTime(currentTime) : formatTime(message.duration)}
          </span>
        </div>

        {/* Transcription toggle */}
        {message.transcription && (
          <Button
            onClick={() => setShowTranscription(!showTranscription)}
            className={`w-full text-xs p-1 rounded ${
              message.type === 'sent'
                ? 'bg-blue-400 hover:bg-blue-300'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            size="sm"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {showTranscription ? 'Hide Text' : 'Show Text'}
          </Button>
        )}

        {/* Transcription text */}
        {showTranscription && message.transcription && (
          <div className={`mt-2 p-2 rounded text-xs ${
            message.type === 'sent'
              ? 'bg-blue-400 bg-opacity-50'
              : 'bg-gray-100'
          }`}>
            <p className="italic">"{message.transcription}"</p>
          </div>
        )}

        {/* AI Response (for received messages) */}
        {message.type === 'received' && message.aiResponse && (
          <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
            <p>{message.aiResponse}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs opacity-50 text-right mt-1">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}