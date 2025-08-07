import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Send, Trash2, Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceMessageRecorderProps {
  onVoiceMessageSent?: (response: any) => void;
  onError?: (error: string) => void;
  webhookUrl?: string;
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export default function VoiceMessageRecorder({
  onVoiceMessageSent,
  onError,
  webhookUrl = '/api/voice-messages',
  className = ''
}: VoiceMessageRecorderProps) {
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const [isSending, setIsSending] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request microphone permission and initialize MediaRecorder.
   */
  const initializeRecorder = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      setPermissionStatus('granted');

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        setRecordingState((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false,
        }));
        audioChunksRef.current = [];
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      return true;
    } catch (error: any) {
      console.error('Failed to initialize recorder:', error);
      setPermissionStatus('denied');
      onError?.(error.message || 'Failed to access microphone');
      return false;
    }
  }, [onError]);

  /**
   * Start recording audio.
   */
  const startRecording = useCallback(async () => {
    if (recordingState.audioUrl) {
      deleteRecording();
    }
    
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      const success = await initializeRecorder();
      if (!success) return;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    } else {
      mediaRecorderRef.current?.start(100);
    }
    
    setRecordingState((prev) => ({
      ...prev,
      isRecording: true,
      isPaused: false,
      duration: 0,
    }));

    timerRef.current = setInterval(() => {
      setRecordingState((prev) => ({
        ...prev,
        duration: prev.duration + 1,
      }));
    }, 1000);
  }, [initializeRecorder, recordingState.audioUrl]);

  /**
   * Pause recording audio.
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState((prev) => ({
        ...prev,
        isPaused: true,
        isRecording: false,
      }));
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  /**
   * Stop recording audio. This function has a bug.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      const currentState = mediaRecorderRef.current.state;
      if (currentState === 'recording') {
        mediaRecorderRef.current.stop();
      } else if (currentState === 'paused') {
        // This is the bugged part of the code. The MediaRecorder API
        // does not reliably support calling stop() from a paused state.
        mediaRecorderRef.current.resume();
        setTimeout(() => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
          }
        }, 100);
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Play recorded audio.
   */
  const playAudio = useCallback(() => {
    if (!recordingState.audioUrl) return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(recordingState.audioUrl);
      audioElementRef.current.onended = () => {
        setRecordingState((prev) => ({ ...prev, isPlaying: false }));
      };
      audioElementRef.current.onerror = (error) => {
        console.error('Audio playback error:', error);
        onError?.('Failed to play audio');
        setRecordingState((prev) => ({ ...prev, isPlaying: false }));
      };
    }

    if (recordingState.isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
    setRecordingState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [recordingState.audioUrl, recordingState.isPlaying, onError]);

  /**
   * Delete recorded audio and reset state.
   */
  const deleteRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    setRecordingState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
    mediaRecorderRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recordingState.audioUrl]);

  /**
   * Convert Blob to base64 string.
   */
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  /**
   * Send voice message to backend/n8n.
   */
  const sendVoiceMessage = useCallback(async () => {
    if (!recordingState.audioBlob) {
      onError?.('No audio to send');
      return;
    }

    setIsSending(true);

    try {
      const audioBase64 = await blobToBase64(recordingState.audioBlob);

      const mimeType = recordingState.audioBlob.type;
      let fileExtension = 'webm';
      if (mimeType.includes('ogg')) fileExtension = 'ogg';
      else if (mimeType.includes('wav')) fileExtension = 'wav';

      const payload = {
        type: 'voice_message',
        action: 'send',
        audio: audioBase64,
        fileName: `voiceMessage_${Date.now()}.${fileExtension}`,
        mimeType,
        duration: recordingState.duration,
        timestamp: new Date().toISOString(),
        size: recordingState.audioBlob.size,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Failed to send voice message: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Use default error message if JSON parsing fails.
        }
        if (response.status === 503) {
          errorMessage = 'Voice processing service is currently unavailable. Please try again later.';
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      onVoiceMessageSent?.(result);
      deleteRecording();
    } catch (error: any) {
      console.error('Failed to send voice message:', error);
      onError?.(error.message || 'Failed to send voice message');
    } finally {
      setIsSending(false);
    }
  }, [recordingState.audioBlob, recordingState.duration, blobToBase64, webhookUrl, onVoiceMessageSent, onError, deleteRecording]);

  /**
   * Format duration for display.
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Clean up on component unmount.
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }
    };
  }, [recordingState.audioUrl]);

  return (
    <div className={`voice-message-recorder ${className}`}>
      {/* Permission denied state */}
      {permissionStatus === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">
            <strong>Microphone access denied.</strong> Please enable microphone permissions to record voice messages.
          </p>
        </div>
      )}

      {/* Recording interface */}
      <div className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Recording button */}
        {!recordingState.audioBlob && (
          <Button
            onClick={recordingState.isRecording ? stopRecording : (recordingState.isPaused ? startRecording : startRecording)}
            disabled={permissionStatus === 'denied'}
            className={`${
              recordingState.isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-full p-3`}
          >
            {recordingState.isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}

        {/* Playback controls for recorded audio */}
        {recordingState.audioBlob && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={playAudio}
              className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3"
            >
              {recordingState.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button
              onClick={deleteRecording}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Duration display */}
        <div className="flex-1">
          <div className="text-sm font-medium">
            {recordingState.isRecording && (
              <span className="text-red-600 animate-pulse">● Recording...</span>
            )}
            {recordingState.audioBlob && !recordingState.isRecording && (
              <span className="text-green-600">● Ready to send</span>
            )}
            {!recordingState.isRecording && !recordingState.audioBlob && (
              <span className="text-gray-500">Tap to record</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {formatDuration(recordingState.duration)}
          </div>
        </div>

        {/* Send button */}
        {recordingState.audioBlob && (
          <Button
            onClick={sendVoiceMessage}
            disabled={isSending}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Recording visualization */}
      {recordingState.isRecording && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-red-500 rounded-full animate-pulse transition-all duration-150`}
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Status messages */}
      {isSending && (
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600">Sending voice message...</p>
        </div>
      )}
    </div>
  );
}