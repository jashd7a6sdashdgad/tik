'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square,
  Settings,
  MessageCircle,
  Brain,
  Zap,
  Clock,
  Activity
} from 'lucide-react';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  duration?: number;
  isPlaying?: boolean;
}

interface VoiceSettings {
  language: string;
  voice: string;
  speechRate: number;
  speechPitch: number;
  autoListen: boolean;
  voiceActivation: boolean;
  noiseReduction: boolean;
}

export default function VoiceAssistantPage() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'en-US',
    voice: 'default',
    speechRate: 1.0,
    speechPitch: 1.0,
    autoListen: true,
    voiceActivation: true,
    noiseReduction: true
  });

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = settings.language;

        recognitionRef.current.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setCurrentTranscript(transcript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (currentTranscript.trim()) {
            handleUserMessage(currentTranscript);
            setCurrentTranscript('');
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }

      // Initialize Speech Synthesis
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
  }, [settings.language]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setCurrentTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleUserMessage = async (transcript: string) => {
    const userMessage: VoiceMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: transcript,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Simulate AI processing (replace with actual AI integration)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await processVoiceCommand(transcript);
      
      const assistantMessage: VoiceMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      if (synthesisRef.current) {
        speakText(response);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorMessage: VoiceMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoiceCommand = async (command: string): Promise<string> => {
    const lowerCommand = command.toLowerCase();
    
    // Voice-first command processing
    if (lowerCommand.includes('add expense') || lowerCommand.includes('record expense')) {
      return "I'll help you add an expense. What did you spend money on?";
    } else if (lowerCommand.includes('schedule') || lowerCommand.includes('calendar')) {
      return "I can help you schedule something. What would you like to schedule?";
    } else if (lowerCommand.includes('note') || lowerCommand.includes('remember')) {
      return "I'll make a note for you. What should I remember?";
    } else if (lowerCommand.includes('weather')) {
      return "Let me check the weather for you. The current weather is sunny with a temperature of 72°F.";
    } else if (lowerCommand.includes('time')) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()}.`;
    } else if (lowerCommand.includes('date')) {
      const now = new Date();
      return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    } else {
      return "I heard you say: " + command + ". How can I help you with that?";
    }
  };

  const speakText = (text: string) => {
    if (synthesisRef.current) {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.speechRate;
      utterance.pitch = settings.speechPitch;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthesisRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setCurrentTranscript('');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Voice Assistant</h1>
          <p className="text-muted-foreground">
            Hands-free interaction with your personal assistant
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isListening ? "default" : "secondary"} className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {isListening ? "Listening" : "Standby"}
          </Badge>
          <Badge variant={isSpeaking ? "default" : "secondary"} className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            {isSpeaking ? "Speaking" : "Silent"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Voice Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Voice Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Voice Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 py-8">
                <Button
                  size="lg"
                  variant={isListening ? "secondary" : "primary"}
                  onClick={isListening ? stopListening : startListening}
                  className="h-16 w-16 rounded-full"
                  disabled={isProcessing}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                
                <Button
                  size="lg"
                  variant={isSpeaking ? "secondary" : "outline"}
                  onClick={isSpeaking ? stopSpeaking : () => {}}
                  className="h-12 w-12 rounded-full"
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>
              
              {currentTranscript && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Currently listening:</p>
                  <p className="font-medium">{currentTranscript}</p>
                </div>
              )}
              
              {isProcessing && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 animate-pulse text-blue-600" />
                    <p className="text-sm text-blue-600">Processing your request...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversation
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                disabled={messages.length === 0}
              >
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation by clicking the microphone</p>
                      <p className="text-sm mt-2">Try saying: "Add expense", "Schedule meeting", or "Take a note"</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-sm p-3 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Settings */}
        <div className="space-y-6">
          {/* Quick Voice Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleUserMessage("What's the time?")}
              >
                <Clock className="w-4 h-4 mr-2" />
                What's the time?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleUserMessage("Add expense for lunch")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Add expense
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleUserMessage("Schedule a meeting")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Schedule meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleUserMessage("Take a note")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Take a note
              </Button>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Voice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Speech Rate</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) => setSettings(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Speech Pitch</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.speechPitch}
                  onChange={(e) => setSettings(prev => ({ ...prev, speechPitch: parseFloat(e.target.value) }))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>Normal</span>
                  <span>High</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.autoListen}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoListen: e.target.checked }))}
                  />
                  <span className="text-sm">Auto-listen after response</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.voiceActivation}
                    onChange={(e) => setSettings(prev => ({ ...prev, voiceActivation: e.target.checked }))}
                  />
                  <span className="text-sm">Voice activation</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.noiseReduction}
                    onChange={(e) => setSettings(prev => ({ ...prev, noiseReduction: e.target.checked }))}
                  />
                  <span className="text-sm">Noise reduction</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}