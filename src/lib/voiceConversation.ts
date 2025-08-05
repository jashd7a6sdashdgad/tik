// Voice Conversation Manager - Integrates Speech Recognition and TTS

import { VoiceRecognition, VoiceCommand, voiceRecognition } from './voiceRecognition';
import { voiceCommandProcessor, VoiceCommandResult } from './voiceCommandProcessor';
import { voiceNarrator, narratorSpeak } from './voiceNarrator';

export interface ConversationState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  lastCommand: string;
  lastResponse: string;
  conversationHistory: ConversationEntry[];
}

export interface ConversationEntry {
  timestamp: Date;
  type: 'user' | 'assistant';
  content: string;
  confidence?: number;
  action?: string;
}

export interface ConversationCallbacks {
  onStateChange: (state: ConversationState) => void;
  onCommand: (command: VoiceCommand) => void;
  onResponse: (response: VoiceCommandResult) => void;
  onError: (error: string) => void;
}

export class VoiceConversation {
  private state: ConversationState;
  private callbacks: Partial<ConversationCallbacks> = {};
  private maxHistoryLength = 50;
  private isInitialized = false;
  private interruptionEnabled = true;
  private awaitingResponse = false;

  constructor() {
    this.state = {
      isActive: false,
      isListening: false,
      isSpeaking: false,
      lastCommand: '',
      lastResponse: '',
      conversationHistory: []
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Set up voice recognition callbacks
    voiceRecognition.setCallbacks({
      onResult: (command: VoiceCommand) => this.handleVoiceCommand(command),
      onError: (error: string) => this.handleRecognitionError(error),
      onStart: () => this.updateState({ isListening: true }),
      onEnd: () => this.updateState({ isListening: false }),
      onSpeechStart: () => this.handleSpeechStart(),
      onSpeechEnd: () => this.handleSpeechEnd()
    });

    // Set up narrator event listeners
    this.setupNarratorListeners();

    this.isInitialized = true;
  }

  private setupNarratorListeners(): void {
    // Listen for narrator speech events
    window.addEventListener('narrator:speaking:start', (event: any) => {
      this.updateState({ isSpeaking: true });
      
      // Pause listening while speaking to avoid feedback
      if (this.state.isListening && this.interruptionEnabled) {
        voiceRecognition.stopListening();
      }
    });

    window.addEventListener('narrator:speaking:end', (event: any) => {
      this.updateState({ isSpeaking: false });
      
      // Resume listening after speaking if conversation is active
      if (this.state.isActive && !this.state.isListening) {
        setTimeout(() => {
          if (this.state.isActive && !this.state.isSpeaking) {
            this.startListening();
          }
        }, 500); // Small delay to avoid picking up speech echo
      }
    });

    // Listen for voice control events
    window.addEventListener('voice:disable_narrator', () => {
      this.pauseConversation();
    });

    window.addEventListener('voice:enable_narrator', () => {
      this.resumeConversation();
    });
  }

  private updateState(updates: Partial<ConversationState>): void {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
    this.dispatchStateEvent();
  }

  private dispatchStateEvent(): void {
    window.dispatchEvent(new CustomEvent('voiceConversation:stateChange', {
      detail: { state: this.state }
    }));
  }

  private handleVoiceCommand(command: VoiceCommand): void {
    if (!this.state.isActive) return;

    // Only process final results or high-confidence interim results
    if (command.isInterim && command.confidence < 0.8) {
      return;
    }

    // Ignore very short or low-confidence commands
    if (command.transcript.length < 2 || command.confidence < 0.5) {
      return;
    }

    this.callbacks.onCommand?.(command);

    // Add to conversation history
    this.addToHistory({
      timestamp: command.timestamp,
      type: 'user',
      content: command.transcript,
      confidence: command.confidence
    });

    // Process the command
    const result = voiceCommandProcessor.processCommand(command.transcript, command.confidence);
    
    if (result) {
      this.handleCommandResult(result);
    }

    this.updateState({ 
      lastCommand: command.transcript,
      awaitingResponse: true 
    });
  }

  private async handleCommandResult(result: VoiceCommandResult): Promise<void> {
    this.callbacks.onResponse?.(result);

    // Add response to history
    this.addToHistory({
      timestamp: new Date(),
      type: 'assistant',
      content: result.response,
      action: result.action
    });

    // Execute the command action
    try {
      await voiceCommandProcessor.executeCommandAction(result);
      this.updateState({ 
        lastResponse: result.response,
        awaitingResponse: false 
      });
    } catch (error) {
      console.error('Error executing voice command:', error);
      this.handleError('Sorry, I encountered an error while processing your request.');
    }
  }

  private handleRecognitionError(error: string): void {
    this.callbacks.onError?.(error);
    
    // Provide helpful error responses
    if (error.includes('not-allowed')) {
      this.handleError('I need microphone permission to hear you. Please allow microphone access and try again.');
    } else if (error.includes('no-speech')) {
      this.handleError('I didn\'t hear anything. Please try speaking again.');
    } else {
      this.handleError('I had trouble hearing you. Could you please try again?');
    }
  }

  private handleError(message: string): void {
    narratorSpeak(message, 'error', 'high');
    this.updateState({ awaitingResponse: false });
  }

  private handleSpeechStart(): void {
    // User started speaking - interrupt assistant if needed
    if (this.state.isSpeaking && this.interruptionEnabled) {
      voiceNarrator.stopSpeaking();
    }
  }

  private handleSpeechEnd(): void {
    // User finished speaking
    // The onResult callback will handle the processing
  }

  private addToHistory(entry: ConversationEntry): void {
    this.state.conversationHistory.push(entry);
    
    // Limit history length
    if (this.state.conversationHistory.length > this.maxHistoryLength) {
      this.state.conversationHistory.shift();
    }

    this.updateState({ conversationHistory: this.state.conversationHistory });
  }

  // Public methods
  startConversation(): boolean {
    if (!voiceRecognition.isRecognitionSupported()) {
      this.handleError('Voice recognition is not supported in your browser.');
      return false;
    }

    this.updateState({ isActive: true });
    
    // Welcome message
    narratorSpeak('Voice conversation mode activated! I\'m listening for your commands.', 'system', 'high');
    
    // Start listening after welcome message
    setTimeout(() => {
      if (this.state.isActive) {
        this.startListening();
      }
    }, 2000);

    return true;
  }

  stopConversation(): void {
    this.updateState({ isActive: false });
    voiceRecognition.stopListening();
    voiceNarrator.stopSpeaking();
    narratorSpeak('Voice conversation ended. I\'m still here if you need me!', 'system', 'medium');
  }

  pauseConversation(): void {
    if (this.state.isActive) {
      voiceRecognition.stopListening();
      this.updateState({ isListening: false });
    }
  }

  resumeConversation(): void {
    if (this.state.isActive) {
      this.startListening();
    }
  }

  startListening(): boolean {
    if (!this.state.isActive) return false;
    return voiceRecognition.startListening();
  }

  stopListening(): void {
    voiceRecognition.stopListening();
  }

  toggleConversation(): boolean {
    if (this.state.isActive) {
      this.stopConversation();
      return false;
    } else {
      return this.startConversation();
    }
  }

  // Configuration methods
  setCallbacks(callbacks: Partial<ConversationCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setInterruptionEnabled(enabled: boolean): void {
    this.interruptionEnabled = enabled;
  }

  setLanguage(language: string): void {
    voiceRecognition.setLanguage(language);
  }

  // Getters
  getState(): ConversationState {
    return { ...this.state };
  }

  getHistory(): ConversationEntry[] {
    return [...this.state.conversationHistory];
  }

  isConversationActive(): boolean {
    return this.state.isActive;
  }

  isCurrentlyListening(): boolean {
    return this.state.isListening;
  }

  isCurrentlySpeaking(): boolean {
    return this.state.isSpeaking;
  }

  // History management
  clearHistory(): void {
    this.updateState({ conversationHistory: [] });
  }

  exportHistory(): string {
    return JSON.stringify(this.state.conversationHistory, null, 2);
  }

  // Cleanup
  destroy(): void {
    this.stopConversation();
    voiceRecognition.destroy();
    this.callbacks = {};
    this.isInitialized = false;
  }
}

// Create singleton instance
export const voiceConversation = new VoiceConversation();

// Convenience functions
export const startVoiceConversation = (): boolean => voiceConversation.startConversation();
export const stopVoiceConversation = (): void => voiceConversation.stopConversation();
export const toggleVoiceConversation = (): boolean => voiceConversation.toggleConversation();
export const isVoiceConversationActive = (): boolean => voiceConversation.isConversationActive();