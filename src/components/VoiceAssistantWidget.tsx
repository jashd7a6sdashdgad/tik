'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Loader2,
  MessageCircle
} from 'lucide-react';

interface VoiceAssistantWidgetProps {
  page?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'fixed' | 'relative';
}

export default function VoiceAssistantWidget({ 
  page = 'general', 
  className = '', 
  size = 'md',
  position = 'fixed'
}: VoiceAssistantWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        setError('Voice recognition error occurred');
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleVoiceCommand = async (command: string) => {
    setLastCommand(command);
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ai/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: command,
          language: 'en',
          context: [],
          page,
          currentPage: page,
          timestamp: new Date().toISOString()
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Speak the response
        speakText(data.response);
        
        // Execute any actions
        if (data.action?.navigate) {
          setTimeout(() => {
            window.location.href = data.action.navigate;
          }, 2000);
        }
      } else {
        setError(data.message || 'Failed to process command');
        speakText('Sorry, I encountered an error processing your request.');
      }
    } catch (error) {
      setError('Voice processing service is currently unavailable. Please try again later.');
      speakText('Sorry, the voice processing service is currently unavailable.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current && text) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      synthRef.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        setError('Could not start voice recognition');
      }
    } else {
      setError('Voice recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm': return 'h-10 w-10';
      case 'lg': return 'h-16 w-16';
      default: return 'h-12 w-12';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'lg': return 'h-8 w-8';
      default: return 'h-6 w-6';
    }
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed bottom-6 right-6 z-50' 
    : 'relative';

  return (
    <div className={`${positionClasses} ${className}`}>
      {/* Main Voice Button */}
      <div className="relative">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`${getSize()} rounded-full transition-all duration-300 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50' 
              : isProcessing
                ? 'bg-blue-500 hover:bg-blue-600 animate-spin'
                : 'bg-green-500 hover:bg-green-600 shadow-lg'
          }`}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {isProcessing ? (
            <Loader2 className={`${getIconSize()} text-white animate-spin`} />
          ) : isListening ? (
            <Mic className={`${getIconSize()} text-white`} />
          ) : (
            <MicOff className={`${getIconSize()} text-white`} />
          )}
        </Button>

        {/* Speaking Indicator */}
        {isSpeaking && (
          <Button
            onClick={stopSpeaking}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 animate-pulse"
          >
            <Volume2 className="h-5 w-5 text-white" />
          </Button>
        )}
      </div>

      {/* Expanded Status Card */}
      {(isExpanded || error || lastCommand) && (
        <Card className="absolute bottom-16 right-0 w-72 bg-white shadow-xl border animate-in slide-in-from-bottom-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Voice Assistant</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {page}
              </span>
            </div>
            
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-2">
                {error}
              </div>
            )}
            
            {lastCommand && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Last Command:</p>
                <p className="text-sm bg-gray-50 p-2 rounded">{lastCommand}</p>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {isListening ? 'Listening...' : 
               isProcessing ? 'Processing...' :
               isSpeaking ? 'Speaking...' :
               'Click microphone to start'}
            </div>

            {/* Quick Commands */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Quick Commands:</p>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">"Navigate to..."</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">"Add new..."</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">"Show me..."</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}