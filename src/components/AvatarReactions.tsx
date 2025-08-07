'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  X,
  Volume2,
  VolumeX,
  Settings,
  History,
  Sparkles,
  Heart,
  MessageCircle
} from 'lucide-react';
import { avatarReactions, AvatarReaction, AvatarEmotionState } from '@/lib/avatarReactions';

interface AvatarReactionsProps {
  size?: 'sm' | 'md' | 'lg';
  showMessages?: boolean;
  showControls?: boolean;
  position?: 'fixed' | 'relative';
  className?: string;
}

const AvatarReactions: React.FC<AvatarReactionsProps> = ({
  size = 'md',
  showMessages = true,
  showControls = false,
  position = 'relative',
  className = ''
}) => {
  const [currentReaction, setCurrentReaction] = useState<AvatarReaction | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [reactionHistory, setReactionHistory] = useState<AvatarReaction[]>([]);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const messageSizeClasses = {
    sm: 'text-xs p-2 max-w-32',
    md: 'text-sm p-3 max-w-48',
    lg: 'text-base p-4 max-w-64'
  };

  // Subscribe to avatar reaction system
  useEffect(() => {
    const unsubscribe = avatarReactions.subscribe((reaction) => {
      setCurrentReaction(reaction);
      if (reaction) {
        setIsAnimating(true);
        // Reset animation after duration
        setTimeout(() => setIsAnimating(false), reaction.emotionState.duration);
        
        // Play sound if enabled
        if (soundEnabled) {
          playReactionSound(reaction.emotionState);
        }
      }
    });

    return unsubscribe;
  }, [soundEnabled]);

  // Load reaction history periodically
  useEffect(() => {
    const loadHistory = () => {
      setReactionHistory(avatarReactions.getReactionHistory());
    };

    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const playReactionSound = (emotionState: AvatarEmotionState) => {
    // Simple sound feedback using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different emotions
      const soundMap: Record<string, number> = {
        happy: 523.25, // C5
        excited: 659.25, // E5
        concerned: 293.66, // D4
        focused: 440, // A4
        proud: 587.33, // D5
        alert: 369.99, // F#4
        neutral: 392, // G4
        celebrating: 783.99 // G5
      };

      oscillator.frequency.setValueAtTime(soundMap[emotionState.id] || 440, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  const getAnimationClass = (animationType: string): string => {
    const animations = {
      bounce: 'animate-bounce',
      shake: 'animate-pulse', // Using pulse as shake approximation
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      wobble: 'animate-bounce', // Using bounce as wobble approximation
      flash: 'animate-ping',
      tada: 'animate-bounce',
      jello: 'animate-pulse'
    };
    return animations[animationType as keyof typeof animations] || 'animate-pulse';
  };

  const dismissReaction = useCallback(() => {
    avatarReactions.hideCurrentReaction();
  }, []);

  const testReaction = useCallback((emotionId: string) => {
    avatarReactions.forceReaction(emotionId, `Testing ${emotionId} emotion!`);
  }, []);

  const formatTimestamp = (date: Date): string => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  return (
    <div className={`${position === 'fixed' ? 'fixed bottom-4 right-4 z-50' : 'relative'} ${className}`} data-testid="avatar-reactions">
      <div className="flex flex-col items-end space-y-2">
        {/* Reaction Message */}
        {showMessages && currentReaction && (
          <Card className="animate-in slide-in-from-right duration-300">
            <CardContent className={`${messageSizeClasses[size]} relative`}>
              <div 
                className="absolute inset-0 rounded-lg opacity-10"
                style={{ backgroundColor: currentReaction.emotionState.color }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-lg">{currentReaction.emotionState.emoji}</span>
                    <span className="font-medium text-xs text-gray-600">
                      {currentReaction.emotionState.name}
                    </span>
                  </div>
                  <p className="text-gray-800">{currentReaction.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={dismissReaction}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avatar Container */}
        <div className="relative">
          {/* Emotion Glow Effect */}
          {currentReaction && isAnimating && (
            <div
              className={`absolute inset-0 rounded-full blur-md ${getAnimationClass(currentReaction.emotionState.animation)}`}
              style={{
                backgroundColor: currentReaction.emotionState.color,
                opacity: 0.3,
                transform: 'scale(1.2)'
              }}
            />
          )}

          {/* Avatar Image */}
          <div
            className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 shadow-lg transition-all duration-300 ${
              isAnimating ? getAnimationClass(currentReaction?.emotionState.animation || 'pulse') : ''
            }`}
            style={{
              borderColor: currentReaction ? currentReaction.emotionState.color : '#e5e7eb',
              boxShadow: currentReaction && isAnimating
                ? `0 0 20px ${currentReaction.emotionState.color}40`
                : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          >
            <Image
              src="/avatar.png"
              alt="Personal Assistant Avatar"
              fill
              className="object-cover"
              sizes={size === 'sm' ? '48px' : size === 'md' ? '64px' : '96px'}
              onError={(e) => {
                // Fallback to a colored div with emoji if image fails
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            
            {/* Fallback Avatar - shown if image fails */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className={`${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-4xl'} text-white`}>
                🤖
              </span>
            </div>
            
            {/* Emotion Overlay */}
            {currentReaction && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span
                  className={`${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-4xl'} filter drop-shadow-lg`}
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  {currentReaction.emotionState.emoji}
                </span>
              </div>
            )}
          </div>

          {/* Reaction Indicator */}
          {currentReaction && (
            <div 
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs animate-pulse"
              style={{ backgroundColor: currentReaction.emotionState.color }}
            >
              <Sparkles className="h-2 w-2 text-white" />
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowHistory(!showHistory)}
              title="Show reaction history"
            >
              <History className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => testReaction('happy')}
              title="Test happy reaction"
            >
              <Heart className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Reaction History Panel */}
        {showHistory && (
          <Card className="animate-in slide-in-from-right duration-300 w-64">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Recent Reactions</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowHistory(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reactionHistory.slice(0, 10).map((reaction) => (
                  <div key={reaction.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm">{reaction.emotionState.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 truncate">{reaction.message}</p>
                      <p className="text-xs text-gray-500">{formatTimestamp(reaction.timestamp)}</p>
                    </div>
                  </div>
                ))}
                
                {reactionHistory.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-xs">
                    No reactions yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Test Reaction Panel (Development) */}
      {process.env.NODE_ENV === 'development' && showControls && (
        <Card className="absolute top-0 left-0 transform -translate-x-full -translate-y-1/2 w-48">
          <CardContent className="p-3">
            <h4 className="font-medium text-xs mb-2">Test Emotions</h4>
            <div className="grid grid-cols-2 gap-1">
              {avatarReactions.getAllEmotionStates().map((emotion) => (
                <Button
                  key={emotion.id}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs p-1"
                  onClick={() => testReaction(emotion.id)}
                >
                  {emotion.emoji} {emotion.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AvatarReactions;