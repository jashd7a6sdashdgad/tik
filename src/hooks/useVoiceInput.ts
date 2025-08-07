// src/hooks/useVoiceInput.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecognition } from '@/lib/voiceRecognition';

interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  hasPermission: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInput(config: VoiceInputConfig = {}): UseVoiceInputReturn {
  // TEMPORARILY DISABLED for stability - return safe defaults
  return {
    isListening: false,
    isSupported: false,
    transcript: '',
    error: null,
    hasPermission: false,
    startListening: () => {},
    stopListening: () => {},
    resetTranscript: () => {},
    requestPermission: async () => false
  };
  
  // Original implementation commented out for now
  /*
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const voiceRecognition = useRef<VoiceRecognition | null>(null);

  useEffect(() => {
    // Only run this code on the client side
    if (typeof window === 'undefined') {
      return;
    }

    const recognition = new VoiceRecognition({
      language: config.language || 'en-US',
      continuous: config.continuous !== false,
      interimResults: config.interimResults !== false,
      maxAlternatives: 1
    }, {
      onResult: (command) => {
        console.log('🎤 Voice input result:', command.transcript);
        setTranscript(command.transcript);
        if (config.onResult) {
          config.onResult(command.transcript);
        }
      },
      onError: (error) => {
        console.error('🎤 Voice input error:', error);
        setError(error);
        setIsListening(false);
      },
      onStart: () => {
        console.log('🎤 Voice recognition started');
        setIsListening(true);
        setError(null);
      },
      onEnd: () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
      },
      onSpeechStart: () => {
        console.log('🎤 Speech detected');
      },
      onSpeechEnd: () => {
        console.log('🎤 Speech ended');
      }
    });

    voiceRecognition.current = recognition;
    setIsSupported(recognition.isSupported);

    // Cleanup function: runs when the component unmounts
    return () => {
      // The `if` check here is important to avoid a null reference error
      if (voiceRecognition.current) {
        voiceRecognition.current.stopListening();
      }
    };
  }, [config.language, config.continuous, config.interimResults, config.onResult]);

  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Media devices not supported');
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('🎤 Microphone permission denied:', error);
      setHasPermission(false);
      setError('Microphone permission denied. Please allow microphone access.');
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!voiceRecognition.current) {
      setError('Voice recognition not initialized');
      return;
    }

    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      console.log('🎤 Already listening, ignoring start request');
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    console.log('🎤 Starting voice recognition...');
    setError(null);
    setTranscript('');
    
    try {
      voiceRecognition.current.start();
    } catch (error: any) {
      console.error('🎤 Failed to start voice recognition:', error);
      setError(error.message || 'Failed to start voice recognition');
      setIsListening(false);
    }
  }, [voiceRecognition, isSupported, isListening, hasPermission, requestPermission]);

  const stopListening = useCallback(() => {
    if (!voiceRecognition.current) return;
    
    console.log('🎤 Stopping voice recognition...');
    voiceRecognition.current.stopListening();
  }, [voiceRecognition]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    hasPermission,
    startListening,
    stopListening,
    resetTranscript,
    requestPermission
  };
  */
}