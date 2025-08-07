// Voice Narrator System with Text-to-Speech capabilities

interface VoiceConfig {
  voice?: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}

interface NarratorMessage {
  id: string;
  text: string;
  type: 'greeting' | 'response' | 'notification' | 'guidance' | 'system';
  timestamp: Date;
  duration?: number;
  priority: 'low' | 'medium' | 'high';
}

export class VoiceNarrator {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private voiceConfig: VoiceConfig;
  private messageQueue: NarratorMessage[] = [];
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoices: string[] = [
    'Microsoft Zira - English (United States)',
    'Google UK English Female',
    'Alex',
    'Samantha',
    'Karen',
    'Moira',
    'Tessa'
  ];

  constructor() {
    this.voiceConfig = {
      rate: 0.9,
      pitch: 1.0,
      volume: 0.8,
      language: 'en-US'
    };

    // Initialize browser-specific APIs only on the client
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.initializeVoices();
      this.loadSettings();
    }
  }

  private initializeVoices() {
    // This method now runs only on the client
    if (!this.synthesis) return;
    
    // Wait for voices to be loaded
    const loadVoices = () => {
      if (this.synthesis) {
        this.voices = this.synthesis.getVoices();
        if (this.voices.length > 0) {
          this.selectBestVoice();
        } else {
          setTimeout(loadVoices, 100);
        }
      }
    };
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  private selectBestVoice() {
    // This method now runs only on the client
    if (!this.synthesis) return;

    let selectedVoice: SpeechSynthesisVoice | null = null;
    for (const preferredName of this.preferredVoices) {
      selectedVoice = this.voices.find(voice =>
        voice.name.includes(preferredName) || voice.name === preferredName
      ) || null;
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      selectedVoice = this.voices.find(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('hazel'))
      ) || null;
    }

    if (!selectedVoice) {
      selectedVoice = this.voices.find(voice => voice.lang.startsWith('en')) || null;
    }

    if (!selectedVoice && this.voices.length > 0) {
      selectedVoice = this.voices[0];
    }

    this.voiceConfig.voice = selectedVoice;
  }

  private loadSettings() {
    // This method now runs only on the client
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('narrator_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          this.isEnabled = settings.enabled ?? true;
          this.voiceConfig = { ...this.voiceConfig, ...settings.voiceConfig };
        }
      }
    } catch (error) {
      console.error('Error loading narrator settings:', error);
    }
  }

  private saveSettings() {
    // This method now runs only on the client
    try {
      if (typeof localStorage !== 'undefined') {
        const settings = {
          enabled: this.isEnabled,
          voiceConfig: {
            rate: this.voiceConfig.rate,
            pitch: this.voiceConfig.pitch,
            volume: this.voiceConfig.volume,
            language: this.voiceConfig.language
          }
        };
        localStorage.setItem('narrator_settings', JSON.stringify(settings));
      }
    } catch (error) {
      console.error('Error saving narrator settings:', error);
    }
  }

  // Main speak function
  speak(text: string, type: NarratorMessage['type'] = 'response', priority: NarratorMessage['priority'] = 'medium'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isEnabled || !text.trim()) {
        resolve();
        return;
      }
      
      // Check for client-side environment before queuing messages
      if (typeof window === 'undefined' || !this.synthesis) {
        console.warn('VoiceNarrator not available in this environment.');
        resolve();
        return;
      }

      const message: NarratorMessage = {
        id: Date.now().toString(),
        text: text.trim(),
        type,
        timestamp: new Date(),
        priority
      };

      if (priority === 'high') {
        this.stopSpeaking();
        this.speakImmediately(message).then(resolve).catch(reject);
      } else {
        this.messageQueue.push(message);
        this.processQueue().then(resolve).catch(reject);
      }
    });
  }

  private async speakImmediately(message: NarratorMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }
      
      // Clean and prepare text
      const cleanText = this.cleanTextForSpeech(message.text);
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Configure voice settings
      if (this.voiceConfig.voice) {
        utterance.voice = this.voiceConfig.voice;
      }
      utterance.rate = this.voiceConfig.rate;
      utterance.pitch = this.voiceConfig.pitch;
      utterance.volume = this.voiceConfig.volume;
      utterance.lang = this.voiceConfig.language;

      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        this.onSpeechStart(message);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.onSpeechEnd(message);
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        console.error('Speech synthesis error:', event);
        reject(new Error(`Speech error: ${event.error}`));
      };

      // Start speaking
      this.synthesis.speak(utterance);
    });
  }

  private async processQueue(): Promise<void> {
    // Check for client-side environment
    if (typeof window === 'undefined' || !this.isSpeaking || this.messageQueue.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    const message = this.messageQueue.shift();
    if (message) {
      try {
        await this.speakImmediately(message);
        setTimeout(() => this.processQueue(), 500);
      } catch (error) {
        console.error('Error processing message queue:', error);
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/🚀/g, ' rocket ')
      .replace(/✅/g, ' checkmark ')
      .replace(/❌/g, ' error ')
      .replace(/💡/g, ' idea ')
      .replace(/🔧/g, ' tool ')
      .replace(/📊/g, ' chart ')
      .replace(/🎯/g, ' target ')
      .replace(/⚡/g, ' lightning ')
      .replace(/🌟/g, ' star ')
      .replace(/💪/g, ' strong ')
      .replace(/🎉/g, ' celebration ')
      .replace(/🤖/g, ' robot ')
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .trim();
  }

  // Event handlers for UI updates
  private onSpeechStart(message: NarratorMessage) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('narrator:speaking:start', {
        detail: { message }
      }));
    }
  }

  private onSpeechEnd(message: NarratorMessage) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('narrator:speaking:end', {
        detail: { message }
      }));
    }
  }

  // Control methods
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  pauseSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
    }
  }

  resumeSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  // Settings methods
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopSpeaking();
      this.messageQueue = [];
    }
    this.saveSettings();
  }

  isNarratorEnabled(): boolean {
    return this.isEnabled;
  }

  isSpeechActive(): boolean {
    return this.isSpeaking;
  }

  setVoiceConfig(config: Partial<VoiceConfig>): void {
    this.voiceConfig = { ...this.voiceConfig, ...config };
    this.saveSettings();
  }

  getVoiceConfig(): VoiceConfig {
    return { ...this.voiceConfig };
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  getQueueLength(): number {
    return this.messageQueue.length;
  }

  // Predefined messages for common interactions
  greet(userName?: string): Promise<void> {
    const greetings = [
      `Hello${userName ? ` ${userName}` : ''}! I'm your AI assistant. How can I help you today?`,
      `Welcome${userName ? ` ${userName}` : ''}! I'm here to assist you with anything you need.`,
      `Hi there${userName ? ` ${userName}` : ''}! Ready to get started? I'm your personal AI assistant.`
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    return this.speak(greeting, 'greeting', 'high');
  }

  acknowledge(): Promise<void> {
    const responses = [
      "Got it!",
      "I understand.",
      "Understood.",
      "Alright!",
      "Perfect!",
      "Okay, I'm on it."
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return this.speak(response, 'response', 'medium');
  }

  notifyError(message: string): Promise<void> {
    return this.speak(`I encountered an error: ${message}. Let me try to help you with that.`, 'notification', 'high');
  }

  notifySuccess(message: string): Promise<void> {
    return this.speak(`Great! ${message}`, 'notification', 'medium');
  }

  provideGuidance(instruction: string): Promise<void> {
    return this.speak(`Here's what you can do: ${instruction}`, 'guidance', 'medium');
  }

  farewell(): Promise<void> {
    const farewells = [
      "Thank you for using the AI assistant. Have a great day!",
      "It was great helping you today. See you soon!",
      "Goodbye! Feel free to come back anytime you need assistance."
    ];
    const farewell = farewells[Math.floor(Math.random() * farewells.length)];
    return this.speak(farewell, 'system', 'medium');
  }
}

// Create singleton instance
export const voiceNarrator = new VoiceNarrator();

// Utility functions for easy access
export const narratorSpeak = (text: string, type?: NarratorMessage['type'], priority?: NarratorMessage['priority']) => {
  return voiceNarrator.speak(text, type, priority);
};

export const narratorGreet = (userName?: string) => {
  return voiceNarrator.greet(userName);
};

export const narratorStop = () => {
  voiceNarrator.stopSpeaking();
};

export const narratorToggle = (enabled: boolean) => {
  voiceNarrator.setEnabled(enabled);
};