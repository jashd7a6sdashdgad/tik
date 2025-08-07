'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

// Add missing typings for SpeechRecognitionEvent to avoid errors
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onaudiostart: ((event: Event) => void) | null;
    onaudioend: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onerror: ((event: any) => void) | null;
    onnomatch: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onsoundstart: ((event: Event) => void) | null;
    onspeechend: ((event: Event) => void) | null;
    onspeechstart: ((event: Event) => void) | null;
    onstart: ((event: Event) => void) | null;
    abort(): void;
    start(): void;
    stop(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}

export default function VoiceOnlyMode() {
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'text' | 'voice'>('voice');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      console.log('Recognized:', transcript);
      // TODO: Process transcript here
    };

    recognition.onend = () => {
      if (continuousMode && isListening) {
        recognition.start(); // auto-restart in continuous mode
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  // Effect to start/stop recognition when listening state changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isListening]);

  // Restart recognition on continuousMode toggle if listening
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (continuousMode && isListening) {
      recognitionRef.current.stop();
      recognitionRef.current.start();
    }
  }, [continuousMode]);

  const toggleListening = () => {
    setIsListening(prev => !prev);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Voice Only Mode</h2>

      <button
        onClick={toggleListening}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      <div className="mt-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={() => setContinuousMode(prev => !prev)}
            className="mr-2"
          />
          Continuous Mode
        </label>
      </div>

      <div className="mt-2">
        <label>
          Feedback Mode:
          <select
            value={feedbackMode}
            onChange={e => setFeedbackMode(e.target.value as 'text' | 'voice')}
            className="ml-2 border p-1"
          >
            <option value="text">Text</option>
            <option value="voice">Voice</option>
          </select>
        </label>
      </div>
    </div>
  );
}
