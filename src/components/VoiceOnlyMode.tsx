'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Eye,
  EyeOff,
  Settings,
  Play,
  Pause,
  Square,
  RefreshCw,
  Zap,
  Brain,
  Activity
} from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface VoiceCommand {
  command: string;
  variations: string[];
  action: () => void | Promise<void>;
  description: string;
  category: 'navigation' | 'actions' | 'settings' | 'content';
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
    onresult: ((event: any) => void) | null;
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
interface VoiceOnlySession {
  isActive: boolean;
  currentMode: 'listening' | 'processing' | 'responding' | 'idle';
  confidence: number;
  lastCommand: string;
  commandHistory: string[];
}

export default function VoiceOnlyMode() {
  const { announceMessage, settings } = useAccessibility();
  const [session, setSession] = useState<VoiceOnlySession>({
    isActive: false,
    currentMode: 'idle',
    confidence: 0,
    lastCommand: '',
    commandHistory: []
  });
  
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'verbose' | 'minimal' | 'silent'>('verbose');
  const [voiceOnlyUI, setVoiceOnlyUI] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define voice commands for different accessibility needs
  const voiceCommands: VoiceCommand[] = [
    // Navigation Commands
    {
      command: 'go to dashboard',
      variations: ['dashboard', 'home', 'main page', 'go home'],
      action: () => navigateTo('/dashboard'),
      description: 'Navigate to the main dashboard',
      category: 'navigation'
    },
    {
      command: 'go to expenses',
      variations: ['expenses', 'expense tracker', 'money'],
      action: () => navigateTo('/expenses'),
      description: 'Navigate to expense tracking',
      category: 'navigation'
    },
    {
      command: 'go to calendar',
      variations: ['calendar', 'schedule', 'appointments'],
      action: () => navigateTo('/calendar'),
      description: 'Navigate to calendar view',
      category: 'navigation'
    },
    {
      command: 'go to photos',
      variations: ['photos', 'images', 'pictures'],
      action: () => navigateTo('/photos'),
      description: 'Navigate to photo gallery',
      category: 'navigation'
    },
    {
      command: 'go to notes',
      variations: ['notes', 'diary', 'journal'],
      action: () => navigateTo('/diary'),
      description: 'Navigate to notes and diary',
      category: 'navigation'
    },
    {
      command: 'go to voice assistant',
      variations: ['voice assistant', 'voice commands', 'speech'],
      action: () => navigateTo('/voice-assistant'),
      description: 'Navigate to voice assistant',
      category: 'navigation'
    },
    {
      command: 'go to settings',
      variations: ['settings', 'preferences', 'options'],
      action: () => navigateTo('/settings'),
      description: 'Navigate to settings',
      category: 'navigation'
    },
    {
      command: 'go to accessibility',
      variations: ['accessibility', 'accessibility settings', 'a11y'],
      action: () => navigateTo('/accessibility'),
      description: 'Navigate to accessibility settings',
      category: 'navigation'
    },
    
    // Action Commands
    {
      command: 'add expense',
      variations: ['new expense', 'record expense', 'add cost', 'log expense'],
      action: () => executeAction('add-expense'),
      description: 'Start adding a new expense',
      category: 'actions'
    },
    {
      command: 'add note',
      variations: ['new note', 'take note', 'record note', 'write note'],
      action: () => executeAction('add-note'),
      description: 'Start creating a new note',
      category: 'actions'
    },
    {
      command: 'upload photo',
      variations: ['add photo', 'new photo', 'upload image'],
      action: () => executeAction('upload-photo'),
      description: 'Start photo upload process',
      category: 'actions'
    },
    {
      command: 'schedule event',
      variations: ['new event', 'add appointment', 'schedule meeting'],
      action: () => executeAction('schedule-event'),
      description: 'Start scheduling a new event',
      category: 'actions'
    },
    
    // Content Commands
    {
      command: 'read page',
      variations: ['read this page', 'read content', 'what is on this page'],
      action: () => readPageContent(),
      description: 'Read the current page content aloud',
      category: 'content'
    },
    {
      command: 'repeat last',
      variations: ['repeat', 'say again', 'repeat that'],
      action: () => repeatLastResponse(),
      description: 'Repeat the last spoken message',
      category: 'content'
    },
    {
      command: 'skip to content',
      variations: ['main content', 'skip navigation', 'go to content'],
      action: () => skipToMainContent(),
      description: 'Skip to main page content',
      category: 'content'
    },
    
    // Settings Commands
    {
      command: 'enable high contrast',
      variations: ['high contrast on', 'turn on high contrast'],
      action: () => toggleSetting('highContrast', true),
      description: 'Enable high contrast mode',
      category: 'settings'
    },
    {
      command: 'disable high contrast',
      variations: ['high contrast off', 'turn off high contrast'],
      action: () => toggleSetting('highContrast', false),
      description: 'Disable high contrast mode',
      category: 'settings'
    },
    {
      command: 'large text',
      variations: ['bigger text', 'increase text size', 'large font'],
      action: () => toggleSetting('textSize', 'large'),
      description: 'Enable large text mode',
      category: 'settings'
    },
    {
      command: 'normal text',
      variations: ['regular text', 'normal font size', 'default text'],
      action: () => toggleSetting('textSize', 'normal'),
      description: 'Use normal text size',
      category: 'settings'
    },
    {
      command: 'voice only mode on',
      variations: ['enable voice only', 'voice only on', 'hide interface'],
      action: () => setVoiceOnlyUI(true),
      description: 'Enable voice-only interface mode',
      category: 'settings'
    },
    {
      command: 'voice only mode off',
      variations: ['disable voice only', 'voice only off', 'show interface'],
      action: () => setVoiceOnlyUI(false),
      description: 'Disable voice-only interface mode',
      category: 'settings'
    },
    {
      command: 'continuous listening on',
      variations: ['continuous mode', 'always listen', 'stay listening'],
      action: () => setContinuousMode(true),
      description: 'Enable continuous listening mode',
      category: 'settings'
    },
    {
      command: 'continuous listening off',
      variations: ['stop continuous', 'manual mode', 'stop listening'],
      action: () => setContinuousMode(false),
      description: 'Disable continuous listening mode',
      category: 'settings'
    },
    
    // System Commands
    {
      command: 'help',
      variations: ['what can you do', 'available commands', 'voice commands'],
      action: () => provideHelp(),
      description: 'List available voice commands',
      category: 'content'
    },
    {
      command: 'stop listening',
      variations: ['stop', 'pause', 'stop voice'],
      action: () => stopVoiceSession(),
      description: 'Stop voice recognition',
      category: 'settings'
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    // This code only runs in the browser (client-side)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

        recognitionRef.current.onresult = (event) => {
          let transcript = '';
          let confidence = 0;
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
              confidence = event.results[i][0].confidence;
            } else {
              transcript += event.results[i][0].transcript;
            }
          }
          
          setCurrentTranscript(transcript);
          setSession(prev => ({ ...prev, confidence }));
          
          // Process final results
          if (transcript.trim() && confidence > 0.7) {
            processVoiceCommand(transcript.trim());
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setSession(prev => ({ ...prev, currentMode: 'idle' }));
          
          if (continuousMode && session.isActive) {
            // Restart recognition in continuous mode
            setTimeout(() => {
              if (recognitionRef.current && session.isActive) {
                recognitionRef.current.start();
              }
            }, 1000);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setSession(prev => ({ ...prev, currentMode: 'idle' }));
          
          if (feedbackMode !== 'silent') {
            announceMessage('Voice recognition error. Please try again.', 'assertive');
          }
        };
      }

      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [continuousMode, session.isActive, feedbackMode]);

  const startVoiceSession = () => {
    setSession(prev => ({ ...prev, isActive: true }));
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
    
    if (feedbackMode === 'verbose') {
      announceMessage('Voice-only mode activated. Say "help" to hear available commands.', 'assertive');
    }
  };

  const stopVoiceSession = () => {
    setSession(prev => ({ ...prev, isActive: false, currentMode: 'idle' }));
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (feedbackMode !== 'silent') {
      announceMessage('Voice-only mode deactivated.', 'polite');
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    setIsProcessing(true);
    setSession(prev => ({ 
      ...prev, 
      currentMode: 'processing',
      lastCommand: transcript,
      commandHistory: [...prev.commandHistory.slice(-9), transcript]
    }));

    const lowerTranscript = transcript.toLowerCase();
    let commandFound = false;

    // Find matching command
    for (const cmd of voiceCommands) {
      const variations = [cmd.command, ...cmd.variations];
      
      if (variations.some(variation => 
        lowerTranscript.includes(variation.toLowerCase()) ||
        similarity(lowerTranscript, variation.toLowerCase()) > 0.8
      )) {
        commandFound = true;
        
        if (feedbackMode === 'verbose') {
          announceMessage(`Executing: ${cmd.description}`, 'polite');
        }
        
        try {
          await cmd.action();
          
          if (feedbackMode !== 'silent') {
            announceMessage('Command completed successfully.', 'polite');
          }
        } catch (error) {
          console.error('Command execution error:', error);
          announceMessage('Sorry, there was an error executing that command.', 'assertive');
        }
        break;
      }
    }

    if (!commandFound) {
      if (feedbackMode !== 'silent') {
        announceMessage(`I didn't understand "${transcript}". Say "help" to hear available commands.`, 'polite');
      }
    }

    setIsProcessing(false);
    setSession(prev => ({ ...prev, currentMode: 'idle' }));
  };

  // Helper functions
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const executeAction = (action: string) => {
    switch (action) {
      case 'add-expense':
        // Simulate expense addition workflow
        announceMessage('Starting expense entry. What did you spend money on?', 'polite');
        break;
      case 'add-note':
        announceMessage('Starting note creation. What would you like to remember?', 'polite');
        break;
      case 'upload-photo':
        announceMessage('Photo upload feature activated. Please use file picker to select your photo.', 'polite');
        break;
      case 'schedule-event':
        announceMessage('Event scheduling started. What would you like to schedule?', 'polite');
        break;
    }
  };

  const readPageContent = () => {
    const mainContent = document.querySelector('main, [role="main"], #main-content');
    if (mainContent) {
      const text = mainContent.textContent || 'No content found on this page.';
      announceMessage(`Page content: ${text.substring(0, 500)}`, 'polite');
    }
  };

  const repeatLastResponse = () => {
    if (session.lastCommand) {
      announceMessage(`Last command was: ${session.lastCommand}`, 'polite');
    } else {
      announceMessage('No previous command to repeat.', 'polite');
    }
  };

  const skipToMainContent = () => {
    const mainContent = document.querySelector('main, [role="main"], #main-content');
    if (mainContent && mainContent instanceof HTMLElement) {
      mainContent.focus();
      announceMessage('Focused on main content.', 'polite');
    }
  };

  const toggleSetting = (setting: string, value: any) => {
    // This would integrate with the accessibility context
    announceMessage(`${setting} ${typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : `set to ${value}`}`, 'polite');
  };

  const provideHelp = () => {
    const helpText = `Available voice commands: 
    Navigation: Say "go to dashboard", "go to expenses", "go to calendar", "go to photos", "go to notes", or "go to settings".
    Actions: Say "add expense", "add note", "upload photo", or "schedule event".
    Content: Say "read page", "repeat last", or "skip to content".
    Settings: Say "enable high contrast", "large text", "voice only mode on", or "continuous listening on".
    Say "stop listening" to end voice mode.`;
    
    announceMessage(helpText, 'polite');
  };

  const similarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (s1: string, s2: string): number => {
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[s2.length][s1.length];
  };

  if (voiceOnlyUI) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <div className="mb-8">
            {isListening ? (
              <Mic className="w-24 h-24 mx-auto mb-4 text-green-400 animate-pulse" />
            ) : (
              <MicOff className="w-24 h-24 mx-auto mb-4 text-gray-400" />
            )}
          </div>
          
          <h1 className="text-4xl font-bold mb-4">Voice-Only Mode</h1>
          <p className="text-xl mb-6">
            {session.currentMode === 'listening' && 'I am listening for your command...'}
            {session.currentMode === 'processing' && 'Processing your request...'}
            {session.currentMode === 'idle' && 'Say a command to begin'}
          </p>
          
          <div className="space-y-2">
            <Badge variant={session.isActive ? "default" : "secondary"} className="text-lg px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {session.isActive ? "Active" : "Inactive"}
            </Badge>
            
            {currentTranscript && (
              <div className="bg-white bg-opacity-10 rounded-lg p-4 mt-4">
                <p className="text-lg">"{currentTranscript}"</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 space-x-4">
            <Button
              onClick={session.isActive ? stopVoiceSession : startVoiceSession}
              size="lg"
              className="px-8 py-4 text-lg"
            >
              {session.isActive ? 'Stop Voice Mode' : 'Start Voice Mode'}
            </Button>
            
            <Button
              onClick={() => setVoiceOnlyUI(false)}
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
            >
              Show Interface
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Voice-Only Operation Mode
        </CardTitle>
        <p className="text-muted-foreground">
          Complete hands-free control for users with motor disabilities
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status and Controls */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {isListening ? (
              <Mic className="w-6 h-6 text-green-500 animate-pulse" />
            ) : (
              <MicOff className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                Voice Mode: {session.isActive ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {session.currentMode}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={session.isActive ? stopVoiceSession : startVoiceSession}
              variant={session.isActive ? "destructive" : "default"}
            >
              {session.isActive ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setVoiceOnlyUI(true)}
              variant="secondary"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Voice Only UI
            </Button>
          </div>
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Current transcript:</p>
            <p className="font-medium">"{currentTranscript}"</p>
            {session.confidence > 0 && (
              <p className="text-xs text-blue-500 mt-1">
                Confidence: {Math.round(session.confidence * 100)}%
              </p>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="font-medium">Voice Settings</h3>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Continuous Listening</label>
              <Button
                onClick={() => setContinuousMode(!continuousMode)}
                variant={continuousMode ? "default" : "outline"}
                size="sm"
              >
                {continuousMode ? "On" : "Off"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Feedback Mode</label>
              <select
                value={feedbackMode}
                onChange={(e) => setFeedbackMode(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="verbose">Verbose</option>
                <option value="minimal">Minimal</option>
                <option value="silent">Silent</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium">Command History</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {session.commandHistory.slice(-5).map((cmd, index) => (
                <div key={index} className="text-xs bg-muted p-2 rounded">
                  {cmd}
                </div>
              ))}
              {session.commandHistory.length === 0 && (
                <p className="text-xs text-muted-foreground">No commands yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Available Commands */}
        <div className="space-y-4">
          <h3 className="font-medium">Available Voice Commands</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['navigation', 'actions', 'content', 'settings'].map(category => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium capitalize">{category}</h4>
                <div className="space-y-1">
                  {voiceCommands
                    .filter(cmd => cmd.category === category)
                    .slice(0, 5)
                    .map((cmd, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <span className="font-medium">"{cmd.command}"</span>
                        <br />
                        <span className="text-muted-foreground">{cmd.description}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}