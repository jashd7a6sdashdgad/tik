// Audio Recording Utility for Voice Assistant

export interface AudioRecordingResult {
  audioBase64: string;
  audioFormat: string;
  duration: number;
  transcript?: string;
}

export interface AudioRecorderConfig {
  sampleRate?: number;
  channels?: number;
  format?: 'wav' | 'webm' | 'mp3';
  maxDuration?: number; // in seconds
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private config: Required<AudioRecorderConfig>;
  private isRecording = false;
  private startTime = 0;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate || 16000,
      channels: config.channels || 1,
      format: config.format || 'webm',
      maxDuration: config.maxDuration || 30
    };
  }

  async startRecording(): Promise<void> {
    try {
      console.log('🎤 Starting audio recording...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      let mimeType = 'audio/webm;codecs=opus';
      if (this.config.format === 'wav') {
        mimeType = 'audio/wav';
      } else if (this.config.format === 'mp3') {
        mimeType = 'audio/mpeg';
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`MIME type ${mimeType} not supported, falling back to default`);
        mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('🎙️ MediaRecorder started');
        this.isRecording = true;
      };

      this.mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped');
        this.isRecording = false;
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.isRecording = false;
      };

      this.mediaRecorder.start(1000);

      setTimeout(() => {
        if (this.isRecording) {
          console.log('⏰ Max duration reached, stopping recording');
          this.stopRecording();
        }
      }, this.config.maxDuration * 1000);

      console.log('✅ Audio recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      throw new Error('Failed to access microphone or start recording');
    }
  }

  async stopRecording(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Recording not active'));
        return;
      }

      console.log('🛑 Stopping audio recording...');

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = (Date.now() - this.startTime) / 1000;
          console.log('⏱️ Recording duration:', duration, 'seconds');

          if (this.audioChunks.length === 0) {
            throw new Error('No audio data recorded');
          }

          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder!.mimeType || 'audio/webm' 
          });
          
          console.log('📦 Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type
          });

          const audioBase64 = await this.blobToBase64(audioBlob);
          
          let format = 'webm';
          if (audioBlob.type.includes('wav')) format = 'wav';
          else if (audioBlob.type.includes('mpeg') || audioBlob.type.includes('mp3')) format = 'mp3';
          else if (audioBlob.type.includes('webm')) format = 'webm';

          const result: AudioRecordingResult = {
            audioBase64,
            audioFormat: format,
            duration
          };

          console.log('✅ Audio recording completed:', {
            format: result.audioFormat,
            duration: result.duration,
            base64Length: result.audioBase64.length
          });

          this.cleanup();
          
          resolve(result);
        } catch (error) {
          console.error('❌ Failed to process audio recording:', error);
          this.cleanup();
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Audio track stopped');
      });
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getCurrentDuration(): number {
    return this.isRecording ? (Date.now() - this.startTime) / 1000 : 0;
  }

  static async checkMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone access check failed:', error);
      return false;
    }
  }

  static isRecordingSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.MediaRecorder
    );
  }

  static getSupportedMimeTypes(): string[] {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/aac'
    ];
    
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }
}

export const audioRecorder = new AudioRecorder();

export const startAudioRecording = () => audioRecorder.startRecording();
export const stopAudioRecording = () => audioRecorder.stopRecording();
export const isRecordingActive = () => audioRecorder.getIsRecording();
export const checkMicAccess = () => AudioRecorder.checkMicrophoneAccess();
export const isRecordingSupported = () => AudioRecorder.isRecordingSupported();
