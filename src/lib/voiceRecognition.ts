// src/lib/voiceRecognition.ts
// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

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

// Export the class directly without creating a singleton instance.
// This allows the consuming hook (useVoiceInput) to instantiate it only on the client.
export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private config: VoiceRecognitionConfig;
  private callbacks: Partial<VoiceRecognitionCallbacks> = {};
  private lastTranscript: string = '';
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<VoiceRecognitionConfig>, callbacks?: Partial<VoiceRecognitionCallbacks>) {
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      ...config
    };
    this.callbacks = { ...callbacks };

    // Defer initialization to when the class is created on the client.
    // This is the key fix for Next.js SSR issues.
    if (typeof window !== 'undefined') {
      this.initializeRecognition();
    }
  }

  private initializeRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
      
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    };

    this.recognition.onspeechstart = () => {
      this.callbacks.onSpeechStart?.();
    };

    this.recognition.onspeechend = () => {
      this.callbacks.onSpeechEnd?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      let confidence = 0;
      let isInterim = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        confidence = Math.max(confidence, result[0].confidence);
        isInterim = !result.isFinal;
      }

      if (transcript.trim() !== this.lastTranscript || !isInterim) {
        this.lastTranscript = transcript.trim();
        
        const command: VoiceCommand = {
          transcript: this.lastTranscript,
          confidence,
          timestamp: new Date(),
          isInterim
        };

        this.callbacks.onResult?.(command);

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
      this.isListening = false;
    };
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stopListening();
      }
    }, 3000);
  }

  // Public methods
  startListening(): boolean {
    if (!this.isSupported || !this.recognition || this.isListening) {
      if (!this.isSupported) {
        this.callbacks.onError?.('Speech recognition not supported');
      }
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (_error) {
      this.callbacks.onError?.('Failed to start speech recognition');
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
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
  get isRecognitionSupported(): boolean {
    return this.isSupported;
  }

  get isCurrentlyListening(): boolean {
    return this.isListening;
  }

  get configData(): VoiceRecognitionConfig {
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

// Export a singleton instance for backward compatibility
export const voiceRecognition = new VoiceRecognition();