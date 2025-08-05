import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from 'react-speech-kit';

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
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true); // react-speech-kit handles permissions internally
  
  const {
    listen,
    listening,
    stop,
    supported
  } = useSpeechRecognition({
    onResult: (result: string) => {
      console.log('🎤 Voice input result:', result);
      setTranscript(result);
      if (config.onResult) {
        config.onResult(result);
      }
    },
    onError: (error: any) => {
      console.error('🎤 Voice input error:', error);
      setError(error.message || 'Voice recognition error occurred');
    }
  });

  // Check browser support
  useEffect(() => {
    if (!supported) {
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, [supported]);



  const requestPermission = useCallback(async (): Promise<boolean> => {
    // react-speech-kit handles permissions internally
    // This is kept for compatibility with existing code
    return true;
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (listening) {
      console.log('🎤 Already listening, ignoring start request');
      return;
    }

    console.log('🎤 Starting voice recognition...');
    setError(null);
    setTranscript('');
    
    listen({
      lang: config.language || 'en-US',
      interimResults: config.interimResults !== false,
      continuous: config.continuous !== false
    });
  }, [supported, listening, listen, config]);

  const stopListening = useCallback(() => {
    console.log('🎤 Stopping voice recognition...');
    stop();
  }, [stop]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isListening: listening,
    isSupported: supported,
    transcript,
    error,
    hasPermission,
    startListening,
    stopListening,
    resetTranscript,
    requestPermission
  };
}

// Updated to use react-speech-kit for better reliability and compatibility