'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  Home,
  DollarSign,
  Calendar,
  Camera,
  BookOpen,
  Settings,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  HelpCircle,
  Lightbulb,
  Target,
  Users
} from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface SimplifiedTask {
  id: string;
  title: string;
  description: string;
  steps: string[];
  currentStep: number;
  completed: boolean;
  category: 'daily' | 'financial' | 'social' | 'health';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  icon: React.ReactNode;
}

interface CognitiveAid {
  type: 'reminder' | 'instruction' | 'encouragement' | 'warning';
  message: string;
  importance: 'low' | 'medium' | 'high';
  showFor?: number; // milliseconds
}

interface MemoryPrompt {
  id: string;
  prompt: string;
  context: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  lastShown: Date;
  completed: boolean;
}

export default function SimplifiedInterface() {
  const { announceMessage, settings } = useAccessibility();
  const [currentTask, setCurrentTask] = useState<SimplifiedTask | null>(null);
  const [cognitiveAids, setCognitiveAids] = useState<CognitiveAid[]>([]);
  const [memoryPrompts, setMemoryPrompts] = useState<MemoryPrompt[]>([]);
  const [simplifiedMode, setSimplifiedMode] = useState(true);
  const [guidanceLevel, setGuidanceLevel] = useState<'minimal' | 'standard' | 'detailed'>('standard');
  const [showProgress, setShowProgress] = useState(true);

  // Predefined simplified tasks
  const simplifiedTasks: SimplifiedTask[] = [
    {
      id: 'add-expense',
      title: 'Record an Expense',
      description: 'Keep track of money you spent today',
      steps: [
        'Think about what you bought',
        'Remember how much it cost',
        'Choose the category (food, transport, etc.)',
        'Add a note if needed',
        'Save the expense'
      ],
      currentStep: 0,
      completed: false,
      category: 'financial',
      difficulty: 'easy',
      estimatedTime: 3,
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      id: 'schedule-appointment',
      title: 'Schedule an Appointment',
      description: 'Set up a meeting or appointment',
      steps: [
        'Choose the date you want',
        'Pick a time that works',
        'Write what the appointment is for',
        'Add any important details',
        'Save to your calendar'
      ],
      currentStep: 0,
      completed: false,
      category: 'daily',
      difficulty: 'medium',
      estimatedTime: 5,
      icon: <Calendar className="w-6 h-6" />
    },
    {
      id: 'upload-photo',
      title: 'Save a Photo',
      description: 'Add a photo to your collection',
      steps: [
        'Find the photo on your device',
        'Click to select it',
        'Wait for it to upload',
        'Add a description if you want',
        'Save to your photos'
      ],
      currentStep: 0,
      completed: false,
      category: 'daily',
      difficulty: 'easy',
      estimatedTime: 2,
      icon: <Camera className="w-6 h-6" />
    },
    {
      id: 'write-note',
      title: 'Write a Note',
      description: 'Record something important to remember',
      steps: [
        'Think about what you want to remember',
        'Start typing your thoughts',
        'Add details if needed',
        'Choose a category for your note',
        'Save your note'
      ],
      currentStep: 0,
      completed: false,
      category: 'daily',
      difficulty: 'easy',
      estimatedTime: 4,
      icon: <BookOpen className="w-6 h-6" />
    }
  ];

  // Memory prompts for cognitive assistance
  const defaultMemoryPrompts: MemoryPrompt[] = [
    {
      id: 'daily-checkin',
      prompt: 'How are you feeling today?',
      context: 'Daily wellness check',
      frequency: 'daily',
      lastShown: new Date(),
      completed: false
    },
    {
      id: 'expense-reminder',
      prompt: 'Did you spend any money today that you haven\'t recorded?',
      context: 'Daily expense tracking',
      frequency: 'daily',
      lastShown: new Date(),
      completed: false
    },
    {
      id: 'weekly-review',
      prompt: 'Take a moment to review your week. What went well?',
      context: 'Weekly reflection',
      frequency: 'weekly',
      lastShown: new Date(),
      completed: false
    }
  ];

  useEffect(() => {
    setMemoryPrompts(defaultMemoryPrompts);
    
    // Show daily cognitive aids
    const dailyAids = [
      {
        type: 'reminder' as const,
        message: 'Take your time with each task. There\'s no rush.',
        importance: 'medium' as const,
        showFor: 5000
      },
      {
        type: 'encouragement' as const,
        message: 'You\'re doing great! Each small step counts.',
        importance: 'low' as const,
        showFor: 4000
      }
    ];
    
    setCognitiveAids(dailyAids);
  }, []);

  const startTask = (task: SimplifiedTask) => {
    setCurrentTask({ ...task, currentStep: 0, completed: false });
    
    const aid: CognitiveAid = {
      type: 'instruction',
      message: `Starting: ${task.title}. This should take about ${task.estimatedTime} minutes.`,
      importance: 'medium',
      showFor: 3000
    };
    
    setCognitiveAids(prev => [...prev, aid]);
    announceMessage(`Starting task: ${task.title}. ${task.description}`, 'polite');
  };

  const nextStep = () => {
    if (!currentTask) return;
    
    if (currentTask.currentStep < currentTask.steps.length - 1) {
      const newTask = { ...currentTask, currentStep: currentTask.currentStep + 1 };
      setCurrentTask(newTask);
      
      const stepMessage = `Step ${newTask.currentStep + 1}: ${newTask.steps[newTask.currentStep]}`;
      announceMessage(stepMessage, 'polite');
      
      // Add encouragement aid
      if (newTask.currentStep === Math.floor(newTask.steps.length / 2)) {
        const aid: CognitiveAid = {
          type: 'encouragement',
          message: 'You\'re halfway done! Keep going!',
          importance: 'medium',
          showFor: 3000
        };
        setCognitiveAids(prev => [...prev, aid]);
      }
    } else {
      completeTask();
    }
  };

  const previousStep = () => {
    if (!currentTask || currentTask.currentStep === 0) return;
    
    const newTask = { ...currentTask, currentStep: currentTask.currentStep - 1 };
    setCurrentTask(newTask);
    
    const stepMessage = `Back to step ${newTask.currentStep + 1}: ${newTask.steps[newTask.currentStep]}`;
    announceMessage(stepMessage, 'polite');
  };

  const completeTask = () => {
    if (!currentTask) return;
    
    const completedTask = { ...currentTask, completed: true };
    setCurrentTask(null);
    
    const aid: CognitiveAid = {
      type: 'encouragement',
      message: `Great job! You completed: ${completedTask.title}`,
      importance: 'high',
      showFor: 5000
    };
    
    setCognitiveAids(prev => [...prev, aid]);
    announceMessage(`Task completed successfully: ${completedTask.title}`, 'assertive');
  };

  const dismissCognitiveAid = (index: number) => {
    setCognitiveAids(prev => prev.filter((_, i) => i !== index));
  };

  const getProgressPercentage = () => {
    if (!currentTask) return 0;
    return ((currentTask.currentStep + 1) / currentTask.steps.length) * 100;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'daily': return 'text-blue-600 bg-blue-100';
      case 'financial': return 'text-green-600 bg-green-100';
      case 'social': return 'text-purple-600 bg-purple-100';
      case 'health': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!simplifiedMode) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Cognitive Assistance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSimplifiedMode(true)}>
              Enable Simplified Interface
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 simplified-mode">
      {/* Cognitive Aids */}
      {cognitiveAids.map((aid, index) => (
        <div
          key={index}
          className={`
            fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm
            ${aid.type === 'reminder' ? 'bg-blue-100 border-blue-300' : ''}
            ${aid.type === 'instruction' ? 'bg-purple-100 border-purple-300' : ''}
            ${aid.type === 'encouragement' ? 'bg-green-100 border-green-300' : ''}
            ${aid.type === 'warning' ? 'bg-red-100 border-red-300' : ''}
            border-2
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {aid.type === 'reminder' && <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            {aid.type === 'instruction' && <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0" />}
            {aid.type === 'encouragement' && <Star className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {aid.type === 'warning' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            
            <div className="flex-1">
              <p className="text-sm font-medium">{aid.message}</p>
            </div>
            
            <Button
              onClick={() => dismissCognitiveAid(index)}
              variant="ghost"
              size="sm"
              className="ml-2 h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      ))}

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Your Personal Assistant</h1>
          <p className="text-lg text-muted-foreground">
            Simple and clear - one step at a time
          </p>
        </div>

        {/* Current Task */}
        {currentTask ? (
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentTask.icon}
                  <div>
                    <CardTitle className="text-xl">{currentTask.title}</CardTitle>
                    <p className="text-muted-foreground">{currentTask.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getDifficultyColor(currentTask.difficulty)}>
                    {currentTask.difficulty}
                  </Badge>
                  <Badge className={getCategoryColor(currentTask.category)}>
                    {currentTask.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress */}
              {showProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>Step {currentTask.currentStep + 1} of {currentTask.steps.length}</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-3" />
                </div>
              )}

              {/* Current Step */}
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {currentTask.currentStep + 1}
                  </div>
                  <h3 className="text-xl font-semibold">Current Step</h3>
                </div>
                <p className="text-lg leading-relaxed">
                  {currentTask.steps[currentTask.currentStep]}
                </p>
              </div>

              {/* Guidance */}
              {guidanceLevel !== 'minimal' && (
                <div className="p-4 bg-blue-50 rounded-lg cognitive-helper">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Helpful Tip</span>
                  </div>
                  <p className="text-blue-800 text-sm">
                    {currentTask.currentStep === 0 && "Take your time and don't worry about making mistakes."}
                    {currentTask.currentStep === 1 && "It's okay to pause and think before continuing."}
                    {currentTask.currentStep === 2 && "You're making good progress! Keep going."}
                    {currentTask.currentStep >= 3 && "Almost there! You're doing great."}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  onClick={previousStep}
                  disabled={currentTask.currentStep === 0}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous Step
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Estimated time: {currentTask.estimatedTime} minutes
                  </p>
                </div>

                <Button
                  onClick={nextStep}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {currentTask.currentStep === currentTask.steps.length - 1 ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete Task
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Available Tasks */
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">What would you like to do?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {simplifiedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => startTask(task)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {task.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                        <p className="text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex gap-2 mb-3">
                          <Badge className={getDifficultyColor(task.difficulty)}>
                            {task.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            {task.estimatedTime} min
                          </Badge>
                        </div>
                        <Button className="w-full">
                          Start Task
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Memory Prompts */}
        {memoryPrompts.filter(p => !p.completed).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Gentle Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memoryPrompts
                .filter(p => !p.completed)
                .slice(0, 2)
                .map((prompt) => (
                  <div key={prompt.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="font-medium text-yellow-900">{prompt.prompt}</p>
                    <p className="text-sm text-yellow-700 mt-1">{prompt.context}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => setMemoryPrompts(prev =>
                          prev.map(p => p.id === prompt.id ? { ...p, completed: true } : p)
                        )}
                      >
                        Done
                      </Button>
                      <Button variant="outline" size="sm">
                        Remind me later
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-medium">Guidance Level</label>
              <select
                value={guidanceLevel}
                onChange={(e) => setGuidanceLevel(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="minimal">Minimal</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium">Show Progress Bar</label>
              <Button
                onClick={() => setShowProgress(!showProgress)}
                variant={showProgress ? "primary" : "outline"}
                size="sm"
              >
                {showProgress ? "On" : "Off"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium">Simplified Interface</label>
              <Button
                onClick={() => setSimplifiedMode(!simplifiedMode)}
                variant={simplifiedMode ? "primary" : "outline"}
                size="sm"
              >
                {simplifiedMode ? "On" : "Off"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}