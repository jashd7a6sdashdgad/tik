'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Mic, 
  MicOff,
  Navigation,
  FileText,
  Mail,
  Repeat,
  Zap,
  Settings,
  Brain
} from 'lucide-react';

interface SmartCalendarDemoProps {
  onVoiceCommand?: (command: string) => void;
}

export default function SmartCalendarDemo({ onVoiceCommand }: SmartCalendarDemoProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [demoScenarios, setDemoScenarios] = useState([
    {
      id: 1,
      command: "Book 1 hour for gym every Tuesday at 6 PM",
      type: "Recurring Fitness",
      status: "pending",
      features: ["recurring", "location", "conflict-detection"]
    },
    {
      id: 2,
      command: "Schedule team meeting tomorrow at 10 AM with John and Sarah",
      type: "Meeting",
      status: "pending",
      features: ["meeting-prep", "attendees", "travel-time"]
    },
    {
      id: 3,
      command: "Add dentist appointment next Friday at 3 PM",
      type: "Appointment",
      status: "pending",
      features: ["location", "travel-time", "conflict-detection"]
    }
  ]);

  const [smartFeatures] = useState([
    {
      name: "Voice Scheduling",
      description: "Natural language processing for event creation",
      icon: <Mic className="h-5 w-5" />,
      examples: [
        "Book 1 hour for gym every Tuesday",
        "Schedule lunch meeting tomorrow at noon",
        "Add reminder to call client next week"
      ]
    },
    {
      name: "Conflict Detection",
      description: "Smart conflict detection with alternative suggestions",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      examples: [
        "Detects overlapping events",
        "Suggests alternative time slots",
        "Considers travel time between locations"
      ]
    },
    {
      name: "Auto-Location & Travel",
      description: "Automatic location resolution and travel time calculation",
      icon: <Navigation className="h-5 w-5 text-blue-500" />,
      examples: [
        "Auto-detects gym, office, home locations",
        "Calculates travel time between venues",
        "Suggests departure times"
      ]
    },
    {
      name: "Meeting Preparation",
      description: "AI-powered meeting preparation with relevant emails and docs",
      icon: <Brain className="h-5 w-5 text-purple-500" />,
      examples: [
        "Gathers relevant emails from attendees",
        "Suggests meeting agenda items",
        "Prepares contact information"
      ]
    }
  ]);

  const handleVoiceCommand = async (command: string) => {
    setProcessingResult(null);
    
    try {
      // Simulate API call to smart calendar
      const response = await fetch('/api/calendar/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_voice_scheduling',
          voiceInput: command
        })
      });
      
      const result = await response.json();
      setProcessingResult(result);
      
      // Update demo scenario status
      setDemoScenarios(prev =>
        prev.map(scenario =>
          scenario.command === command
            ? { ...scenario, status: result.success ? 'completed' : 'error' }
            : scenario
        )
      );
      
    } catch (error) {
      console.error('Voice command processing error:', error);
      setProcessingResult({
        success: false,
        message: 'Failed to process voice command'
      });
    }
  };

  const startListening = () => {
    setIsListening(true);
    setVoiceInput('');
    
    // Simulate voice recognition (would integrate with actual speech API)
    setTimeout(() => {
      const demoCommands = [
        "Book 1 hour for gym every Tuesday at 6 PM",
        "Schedule team meeting tomorrow at 10 AM",
        "Add dentist appointment next Friday at 3 PM"
      ];
      
      const randomCommand = demoCommands[Math.floor(Math.random() * demoCommands.length)];
      setVoiceInput(randomCommand);
      setIsListening(false);
    }, 2000);
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const processVoiceInput = () => {
    if (voiceInput.trim()) {
      handleVoiceCommand(voiceInput);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'recurring':
        return <Repeat className="h-3 w-3" />;
      case 'location':
        return <MapPin className="h-3 w-3" />;
      case 'conflict-detection':
        return <AlertTriangle className="h-3 w-3" />;
      case 'meeting-prep':
        return <FileText className="h-3 w-3" />;
      case 'attendees':
        return <Users className="h-3 w-3" />;
      case 'travel-time':
        return <Navigation className="h-3 w-3" />;
      default:
        return <Zap className="h-3 w-3" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Calendar className="h-8 w-8" />
          Smart Calendar Integration Demo
        </h1>
        <p className="text-muted-foreground">
          Experience AI-powered voice scheduling with conflict detection, travel time, and meeting preparation
        </p>
      </div>

      {/* Voice Input Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Scheduling
          </CardTitle>
          <CardDescription>
            Try natural language commands like "Book 1 hour for gym every Tuesday"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              placeholder="Type or speak your scheduling request..."
              className="flex-1"
            />
            <Button
              onClick={isListening ? stopListening : startListening}
              variant={isListening ? "secondary" : "outline"}
              size="sm"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? 'Stop' : 'Listen'}
            </Button>
            <Button onClick={processVoiceInput} disabled={!voiceInput.trim()}>
              Process
            </Button>
          </div>
          
          {isListening && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-pulse">
                <Mic className="h-4 w-4" />
              </div>
              Listening for voice input...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Result */}
      {processingResult && (
        <Card className={`border-2 ${processingResult.success ? 'border-green-200' : 'border-red-200'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {processingResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Processing Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm">{processingResult.message || processingResult.data?.message}</p>
              
              {processingResult.success && processingResult.data?.schedulingRequest && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Confidence: {Math.round(processingResult.data.schedulingRequest.confidence * 100)}%
                    </Badge>
                    <Badge variant="outline">
                      {processingResult.data.schedulingRequest.parsedIntent.action}
                    </Badge>
                  </div>
                  
                  {processingResult.data.schedulingRequest.ambiguities?.length > 0 && (
                    <div className="text-sm text-orange-600">
                      <strong>Clarifications needed:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {processingResult.data.schedulingRequest.ambiguities.map((amb: string, idx: number) => (
                          <li key={idx}>{amb}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Scenarios</CardTitle>
          <CardDescription>Try these example voice commands to see smart features in action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoScenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(scenario.status)}
                    <span className="font-medium">{scenario.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">"{scenario.command}"</p>
                  <div className="flex gap-1">
                    {scenario.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {getFeatureIcon(feature)}
                        <span className="ml-1">{feature}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVoiceInput(scenario.command);
                    handleVoiceCommand(scenario.command);
                  }}
                  disabled={scenario.status === 'completed'}
                >
                  Try It
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {smartFeatures.map((feature) => (
          <Card key={feature.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {feature.icon}
                {feature.name}
              </CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                {feature.examples.map((example, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {example}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Integration Status */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Settings className="h-5 w-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Voice Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Conflict Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Location Services</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Meeting Preparation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}