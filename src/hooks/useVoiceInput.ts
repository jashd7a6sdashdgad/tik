import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceInputConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  audioLevel: number;
  hasPermission: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInput(config: VoiceInputConfig = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check browser support and permissions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const isSupported = !!SpeechRecognition && !!navigator.mediaDevices?.getUserMedia;
      
      setIsSupported(isSupported);
      
      if (!isSupported) {
        setError('Speech recognition or microphone access not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      // Check existing permission
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
          setHasPermission(result.state === 'granted');
        }).catch(() => {
          // Fallback if permissions API not available
          setHasPermission(false);
        });
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = config.language || 'en-US';
    recognition.continuous = config.continuous !== false;
    recognition.interimResults = config.interimResults !== false;
    recognition.maxAlternatives = config.maxAlternatives || 1;
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event: any) => {
      console.log('🎤 Speech recognition result:', event);
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          setConfidence(result[0].confidence || 0);
          console.log('🎤 Final transcript:', transcript);
        } else {
          interimTranscript += transcript;
          console.log('🎤 Interim transcript:', transcript);
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      
      // Ignore "aborted" errors as they're expected when stopping recognition
      if (event.error === 'aborted') {
        console.log('🎤 Recognition aborted (expected)');
        setIsListening(false);
        cleanupAudioAnalysis();
        return;
      }
      
      let errorMessage = 'Voice recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking closer to the microphone.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Please check your microphone permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
          setHasPermission(false);
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported for speech recognition.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      cleanupAudioAnalysis();
    };
    
    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      cleanupAudioAnalysis();
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      cleanupAudioAnalysis();
    };
  }, [config, isSupported]);

  // Audio level analysis
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;
      setHasPermission(true);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current || !isListening) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 128) * 100);
        
        setAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
    } catch (err: any) {
      console.error('🎤 Audio analysis setup failed:', err);
      setError('Failed to access microphone. Please check permissions.');
      setHasPermission(false);
    }
  }, [isListening]);

  const cleanupAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Immediately stop the test stream
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('🎤 Permission request failed:', err);
      setHasPermission(false);
      setError('Microphone permission denied. Please allow access and try again.');
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return;
    }

    // Prevent starting if already listening
    if (isListening) {
      console.log('🎤 Already listening, ignoring start request');
      return;
    }

    // Request permission if not granted
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      console.log('🎤 Starting voice recognition...');
      setError(null);
      setTranscript('');
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Start audio analysis for visual feedback
      await startAudioAnalysis();
      
      // Add small delay to prevent conflicts
      setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start();
            
            // Auto-stop after 30 seconds (like WhatsApp)
            timeoutRef.current = setTimeout(() => {
              console.log('🎤 Auto-stopping due to timeout');
              stopListening();
            }, 30000);
          } catch (startError) {
            console.error('🎤 Error starting recognition:', startError);
            setError('Failed to start voice recognition. Please try again.');
            cleanupAudioAnalysis();
          }
        }
      }, 100);
      
    } catch (err: any) {
      console.error('🎤 Failed to start listening:', err);
      setError('Failed to start voice recognition. Please try again.');
      cleanupAudioAnalysis();
    }
  }, [isSupported, hasPermission, requestPermission, startAudioAnalysis, isListening]);

  const stopListening = useCallback(() => {
    console.log('🎤 Stopping voice recognition...');
    
    // Clear timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop recognition if it's running
    if (recognitionRef.current) {
      try {
        if (isListening) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        console.log('🎤 Recognition already stopped');
      }
    }
    
    // Clean up audio analysis
    cleanupAudioAnalysis();
  }, [isListening, cleanupAudioAnalysis]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cleanupAudioAnalysis();
    };
  }, [cleanupAudioAnalysis]);

  return {
    isListening,
    isSupported,
    transcript,
    confidence,
    error,
    audioLevel,
    hasPermission,
    startListening,
    stopListening,
    resetTranscript,
    requestPermission
  };
}

// Old voice commands functionality removed - replaced with new VoiceAssistant component

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}