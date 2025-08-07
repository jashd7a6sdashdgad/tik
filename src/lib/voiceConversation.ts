// Voice Conversation Manager - Integrates Speech Recognition and TTS

import { VoiceRecognition, VoiceCommand } from './voiceRecognition';
import { voiceCommandProcessor, VoiceCommandResult } from './voiceCommandProcessor';
import { voiceNarrator, narratorSpeak } from './voiceNarrator';
import { n8nVoiceAssistant, N8NVoiceResponse } from './n8nVoiceAssistant';
import { AudioRecorder, AudioRecordingResult } from './audioRecorder';

// Create singleton instance
const voiceRecognition = new VoiceRecognition();

export interface ConversationState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  lastCommand: string;
  lastResponse: string;
  conversationHistory: ConversationEntry[];
  awaitingResponse: boolean;
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
  private audioRecorder: AudioRecorder | null = null;

  constructor() {
    this.state = {
      isActive: false,
      isListening: false,
      isSpeaking: false,
      lastCommand: '',
      lastResponse: '',
      conversationHistory: [],
      awaitingResponse: false
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Set up voice recognition callbacks with safety check
    if (voiceRecognition && voiceRecognition.setCallbacks) {
      voiceRecognition.setCallbacks({
        onResult: (command) => this.handleVoiceCommand(command),
        onError: (error) => this.handleRecognitionError(error),
        onStart: () => this.updateState({ isListening: true }),
        onEnd: () => this.updateState({ isListening: false }),
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd()
      });
    }

    // Set up narrator event listeners
    this.setupNarratorListeners();

    this.isInitialized = true;
  }

  private setupNarratorListeners(): void {
    // Listen for narrator speech events
    // FIX: Rename unused 'event' parameter to '_event'
    window.addEventListener('narrator:speaking:start', (_event: any) => {
      this.updateState({ isSpeaking: true });
      
      // Pause listening while speaking to avoid feedback
      if (this.state.isListening && this.interruptionEnabled) {
        voiceRecognition?.stopListening();
      }
    });

    // FIX: Rename unused 'event' parameter to '_event'
    window.addEventListener('narrator:speaking:end', (_event: any) => {
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

    // Use N8N voice assistant for enhanced AI responses
    this.handleN8NVoiceCommand(command);
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

  private async handleN8NVoiceCommand(command: VoiceCommand): Promise<void> {
    if (!this.state.isActive) return;

    console.log('🚀 Sending to N8N webhook:', command.transcript);

    this.callbacks.onCommand?.(command);

    // Add user message to history
    this.addToHistory({
      timestamp: command.timestamp,
      type: 'user',
      content: command.transcript,
      confidence: command.confidence
    });

    this.updateState({ 
      lastCommand: command.transcript,
      awaitingResponse: true 
    });

    try {
      // Send to N8N voice assistant webhook
      console.log('📡 Calling N8N webhook...');
      const response: N8NVoiceResponse = await n8nVoiceAssistant.sendMessage(
        command.transcript,
        'en'
      );

      if (response.success && response.response) {
        // Add assistant response to history
        this.addToHistory({
          timestamp: new Date(),
          type: 'assistant',
          content: response.response
        });

        // Handle audio response - prioritize binary, then base64, then URL, finally TTS
        if (response.audioBinary && response.audioMimeType) {
          console.log('🎵 Playing binary audio from N8N');
          await this.playBinaryAudio(response.audioBinary, response.audioMimeType);
        } else if (response.audioBase64) {
          console.log('🎵 Playing base64 audio from N8N');
          this.playAudioFromBase64(response.audioBase64);
        } else if (response.audioUrl) {
          console.log('🎵 Playing URL audio from N8N');
          this.playAudioFromUrl(response.audioUrl);
        } else {
          console.log('🔊 Using text-to-speech for N8N response');
          // Speak the text response
          narratorSpeak(response.response, 'response', 'high');
        }

        // Handle navigation actions
        if (response.action === 'navigate' && response.data?.destination) {
          window.dispatchEvent(new CustomEvent('voice:navigate', { 
            detail: { destination: response.data.destination } 
          }));
        }

        this.updateState({ 
          lastResponse: response.response,
          awaitingResponse: false 
        });
      } else {
        throw new Error(response.error || 'N8N response failed');
      }
    } catch (error) {
      console.error('N8N Voice Assistant error:', error);
      this.handleError('Sorry, I encountered an error while processing your request with the AI assistant.');
    }
  }

  private playAudioFromBase64(audioBase64: string): void {
    try {
      console.log('🎵 Playing audio from N8N base64');
      
      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.onplay = () => {
        console.log('🔊 N8N audio started playing');
        this.updateState({ isSpeaking: true });
      };
      audio.onended = () => {
        console.log('✅ N8N audio finished playing');
        this.updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      // FIX: Rename unused 'error' parameter to '_error'
      audio.onerror = (_error) => {
        console.error('❌ N8N audio playback error:', _error);
        this.updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      
      audio.play().catch(console.error);
    } catch (error) {
      console.error('❌ Failed to play N8N audio:', error);
      this.updateState({ isSpeaking: false });
    }
  }

  private playAudioFromUrl(audioUrl: string): void {
    try {
      console.log('🎵 Playing audio from N8N URL:', audioUrl);
      
      const audio = new Audio(audioUrl);
      audio.onplay = () => {
        console.log('🔊 N8N audio started playing');
        this.updateState({ isSpeaking: true });
      };
      audio.onended = () => {
        console.log('✅ N8N audio finished playing');
        this.updateState({ isSpeaking: false });
      };
      // FIX: Rename unused 'error' parameter to '_error'
      audio.onerror = (_error) => {
        console.error('❌ N8N audio playback error:', _error);
        this.updateState({ isSpeaking: false });
      };
      
      audio.play().catch(console.error);
    } catch (error) {
      console.error('❌ Failed to play N8N audio:', error);
      this.updateState({ isSpeaking: false });
    }
  }

  private async playBinaryAudio(audioBinary: ArrayBuffer, mimeType: string): Promise<void> {
    try {
      console.log('🎵 Playing binary audio from N8N:', {
        size: audioBinary.byteLength,
        mimeType
      });

      // Create blob from binary data
      const audioBlob = new Blob([audioBinary], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      
      // FIX: Rename unused 'error' parameter to '_error'
      audio.onloadeddata = (_event) => {
        console.log('📊 Binary audio loaded:', {
          duration: audio.duration,
          readyState: audio.readyState
        });
      };
      
      audio.onplay = () => {
        console.log('🔊 Binary audio started playing');
        this.updateState({ isSpeaking: true });
      };
      
      audio.onended = () => {
        console.log('✅ Binary audio finished playing');
        this.updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };
      
      audio.onerror = (error) => {
        console.error('❌ Binary audio playback error:', error);
        this.updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
      };

      // Start playback
      await audio.play();
      
    } catch (error) {
      console.error('❌ Failed to play binary audio:', error);
      this.updateState({ isSpeaking: false });
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
    narratorSpeak(message, 'system', 'high');
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

  // Audio recording based conversation
  async startAudioRecording(): Promise<void> {
    if (!this.state.isActive) return;
    
    try {
      console.log('🎤 Starting audio recording for N8N...');
      
      if (!this.audioRecorder) {
        this.audioRecorder = new AudioRecorder({
          format: 'webm',
          sampleRate: 16000,
          channels: 1,
          maxDuration: 10 // 10 seconds max
        });
      }

      this.updateState({ isListening: true });
      await this.audioRecorder.startRecording();
      
      console.log('✅ Audio recording started');
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      this.handleError('Failed to start audio recording. Please check microphone permissions.');
      this.updateState({ isListening: false });
    }
  }

  async stopAudioRecording(): Promise<void> {
    if (!this.audioRecorder || !this.state.isListening) return;

    try {
      console.log('🛑 Stopping audio recording...');
      
      const audioResult: AudioRecordingResult = await this.audioRecorder.stopRecording();
      this.updateState({ isListening: false, awaitingResponse: true });

      console.log('📦 Audio recording completed:', {
        duration: audioResult.duration,
        format: audioResult.audioFormat,
        size: audioResult.audioBase64.length
      });

      // Send audio to N8N with fallback text
      await this.sendAudioToN8N(audioResult);
      
    } catch (error) {
      console.error('❌ Failed to stop audio recording:', error);
      this.handleError('Failed to process audio recording.');
      this.updateState({ isListening: false, awaitingResponse: false });
    }
  }

  private async sendAudioToN8N(audioResult: AudioRecordingResult): Promise<void> {
    try {
      console.log('🚀 Sending audio to N8N webhook...');

      // Add user audio to history
      this.addToHistory({
        timestamp: new Date(),
        type: 'user',
        content: '[Audio Message]',
        confidence: 1.0
      });

      // Send both audio and fallback text to N8N
      const response: N8NVoiceResponse = await n8nVoiceAssistant.sendMessage(
        'User sent an audio message', // Fallback text
        'en',
        audioResult.audioBase64,
        audioResult.audioFormat
      );

      if (response.success && response.response) {
        console.log('✅ N8N audio response received');

        // Add assistant response to history
        this.addToHistory({
          timestamp: new Date(),
          type: 'assistant',
          content: response.response
        });

        // Handle audio response - prioritize binary, then base64, then URL, finally TTS
        if (response.audioBinary && response.audioMimeType) {
          console.log('🎵 Playing binary audio from N8N');
          await this.playBinaryAudio(response.audioBinary, response.audioMimeType);
        } else if (response.audioBase64) {
          console.log('🎵 Playing base64 audio from N8N');
          this.playAudioFromBase64(response.audioBase64);
        } else if (response.audioUrl) {
          console.log('🎵 Playing URL audio from N8N');
          this.playAudioFromUrl(response.audioUrl);
        } else {
          console.log('🔊 Using text-to-speech for N8N response');
          // Speak the text response
          narratorSpeak(response.response, 'response', 'high');
        }

        // Handle navigation actions
        if (response.action === 'navigate' && response.data?.destination) {
          window.dispatchEvent(new CustomEvent('voice:navigate', { 
            detail: { destination: response.data.destination } 
          }));
        }

        this.updateState({ 
          lastResponse: response.response,
          awaitingResponse: false 
        });
      } else {
        throw new Error(response.error || 'N8N audio response failed');
      }
    } catch (error) {
      console.error('❌ N8N audio processing error:', error);
      this.handleError('Sorry, I encountered an error processing your audio message.');
    }
  }

  // Public methods
  startConversation(): boolean {
    if (!voiceRecognition?.isRecognitionSupported) {
      console.error('Voice recognition not supported');
      return false;
    }

    this.updateState({ isActive: true });
    console.log('🎤 N8N Voice conversation activated - ready for commands');
    
    // Start listening immediately without annoying welcome message
    setTimeout(() => {
      if (this.state.isActive) {
        this.startListening();
      }
    }, 500);

    return true;
  }

  stopConversation(): void {
    this.updateState({ isActive: false });
    voiceRecognition?.stopListening();
    voiceNarrator.stopSpeaking();
    console.log('🛑 N8N Voice conversation ended');
  }

  pauseConversation(): void {
    if (this.state.isActive) {
      voiceRecognition?.stopListening();
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
    return voiceRecognition?.startListening() ?? false;
  }

  stopListening(): void {
    voiceRecognition?.stopListening();
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
    voiceRecognition?.setLanguage(language);
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
    voiceRecognition?.destroy();
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

// Audio recording functions
export const startAudioRecording = (): Promise<void> => voiceConversation.startAudioRecording();
export const stopAudioRecording = (): Promise<void> => voiceConversation.stopAudioRecording();