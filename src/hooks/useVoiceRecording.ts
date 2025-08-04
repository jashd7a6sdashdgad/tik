import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playRecording: () => void;
  sendToN8N: () => Promise<void>;
  clearRecording: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Check if browser supports audio recording
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        setError('Audio recording not supported in this browser');
        return;
      }

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        setAudioBlob(audioBlob);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError(null);

    } catch (err: any) {
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioBlob]);

  const sendToN8N = useCallback(async () => {
    if (!audioBlob) {
      setError('No audio recording to send');
      return;
    }

    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      
      // Get n8n webhook URL from environment
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '/api/n8n/webhook';
      
      // Send to n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'voice_message',
          audio: base64Audio,
          mimeType: audioBlob.type,
          size: audioBlob.size,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Voice message sent to n8n:', result);
      
    } catch (err: any) {
      setError(`Failed to send audio to n8n: ${err.message}`);
    }
  }, [audioBlob]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isSupported,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    playRecording,
    sendToN8N,
    clearRecording
  };
}

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;codecs=opus;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}