// Voice Recognition System for Two-Way Voice Communication

export interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  timestamp: Date;
  isInterim: boolean;
}

export interface VoiceRecognitionCallbacks {
  onResult: (command: VoiceCommand) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private config: VoiceRecognitionConfig;
  private callbacks: Partial<VoiceRecognitionCallbacks> = {};
  private lastTranscript: string = '';
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<VoiceRecognitionConfig>) {
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      ...config
    };

    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      this.isSupported = false;
      console.warn('Speech recognition not supported in this browser');
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    // Set up event listeners
    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
      this.dispatchEvent('voiceRecognition:start');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
      this.dispatchEvent('voiceRecognition:end');
      
      // Clear silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    };

    this.recognition.onspeechstart = () => {
      this.callbacks.onSpeechStart?.();
      this.dispatchEvent('voiceRecognition:speechStart');
    };

    this.recognition.onspeechend = () => {
      this.callbacks.onSpeechEnd?.();
      this.dispatchEvent('voiceRecognition:speechEnd');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      let confidence = 0;
      let isInterim = false;

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        confidence = Math.max(confidence, result[0].confidence);
        isInterim = !result.isFinal;
      }

      // Only process if transcript has changed or is final
      if (transcript !== this.lastTranscript || !isInterim) {
        this.lastTranscript = transcript;
        
        const command: VoiceCommand = {
          transcript: transcript.trim(),
          confidence,
          timestamp: new Date(),
          isInterim
        };

        this.callbacks.onResult?.(command);
        this.dispatchEvent('voiceRecognition:result', { command });

        // Set silence timer for continuous listening
        if (!isInterim && this.config.continuous) {
          this.resetSilenceTimer();
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error occurred';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error occurred during speech recognition.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not allowed.';
          break;
        case 'bad-grammar':
          errorMessage = 'Speech recognition grammar error.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported for speech recognition.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      this.callbacks.onError?.(errorMessage);
      this.dispatchEvent('voiceRecognition:error', { error: errorMessage });
    };
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // Stop listening after 3 seconds of silence
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stopListening();
      }
    }, 3000);
  }

  private dispatchEvent(eventName: string, detail: any = {}): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // Public methods
  startListening(): boolean {
    if (!this.isSupported || !this.recognition) {
      this.callbacks.onError?.('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      this.callbacks.onError?.('Failed to start speech recognition');
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  // Configuration methods
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  setCallbacks(callbacks: Partial<VoiceRecognitionCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  updateConfig(config: Partial<VoiceRecognitionConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }

  // Getters
  isRecognitionSupported(): boolean {
    return this.isSupported;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  getConfig(): VoiceRecognitionConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    this.stopListening();
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.recognition = null;
    this.callbacks = {};
  }
}

// Create singleton instance
export const voiceRecognition = new VoiceRecognition();

// Convenience functions
export const startListening = (): boolean => voiceRecognition.startListening();
export const stopListening = (): void => voiceRecognition.stopListening();
export const toggleListening = (): boolean => voiceRecognition.toggleListening();
export const isListening = (): boolean => voiceRecognition.isCurrentlyListening();
export const isRecognitionSupported = (): boolean => voiceRecognition.isRecognitionSupported();

// Speech Recognition types for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}