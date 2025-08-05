'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { voiceNarrator, narratorSpeak } from '@/lib/voiceNarrator';
import { narratorPersonality } from '@/lib/narratorPersonality';

interface SmartNarratorContextType {
  isEnabled: boolean;
  isSpeaking: boolean;
  currentMessage: string;
  enableNarrator: () => void;
  disableNarrator: () => void;
  speakMessage: (message: string, type?: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  greetUser: () => void;
  announcePageChange: (pageName: string) => void;
  announceSuccess: (message: string) => void;
  announceError: (message: string) => void;
  provideHelp: (context: string) => void;
}

const SmartNarratorContext = createContext<SmartNarratorContextType | undefined>(undefined);

interface SmartNarratorProviderProps {
  children: React.ReactNode;
}

export function SmartNarratorProvider({ children }: SmartNarratorProviderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);
  const [lastPath, setLastPath] = useState('');

  useEffect(() => {
    // Set up narrator event listeners
    const handleSpeechStart = (event: any) => {
      setIsSpeaking(true);
      setCurrentMessage(event.detail.message.text);
    };

    const handleSpeechEnd = (event: any) => {
      setIsSpeaking(false);
      setCurrentMessage('');
    };

    window.addEventListener('narrator:speaking:start', handleSpeechStart);
    window.addEventListener('narrator:speaking:end', handleSpeechEnd);

    return () => {
      window.removeEventListener('narrator:speaking:start', handleSpeechStart);
      window.removeEventListener('narrator:speaking:end', handleSpeechEnd);
    };
  }, []);

  // Handle user login/authentication
  useEffect(() => {
    if (user && !hasGreeted && isEnabled) {
      narratorPersonality.setUserName(user.username || user.email || 'there');
      narratorPersonality.saveUserPreferences();
      
      // Welcome user after a short delay
      setTimeout(() => {
        greetUser();
        setHasGreeted(true);
      }, 1500);
    }
  }, [user, hasGreeted, isEnabled]);

  // Handle page changes
  useEffect(() => {
    if (pathname && pathname !== lastPath && isEnabled) {
      const pageName = getPageNameFromPath(pathname);
      
      if (pageName && hasGreeted) {
        // Announce page change after a short delay
        setTimeout(() => {
          announcePageChange(pageName);
        }, 800);
      }
      
      setLastPath(pathname);
    }
  }, [pathname, lastPath, isEnabled, hasGreeted]);

  // Automatically detect and announce certain page interactions
  useEffect(() => {
    if (!isEnabled) return;

    // Listen for form submissions
    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (form.tagName === 'FORM') {
        setTimeout(() => {
          speakMessage("Form submitted successfully! I'll let you know when it's processed.", 'system', 'medium');
        }, 500);
      }
    };

    // Listen for button clicks for important actions
    const handleButtonClick = (event: Event) => {
      const button = event.target as HTMLButtonElement;
      if (button.tagName === 'BUTTON') {
        const buttonText = button.textContent?.toLowerCase() || '';
        
        // Respond to specific button types
        if (buttonText.includes('save')) {
          setTimeout(() => speakMessage("Saving your changes...", 'system', 'low'), 300);
        } else if (buttonText.includes('delete')) {
          setTimeout(() => speakMessage("Item deleted successfully.", 'system', 'medium'), 500);
        } else if (buttonText.includes('connect')) {
          setTimeout(() => speakMessage("Establishing connection...", 'system', 'low'), 300);
        }
      }
    };

    // Listen for errors in the console (simplified error detection)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      // Check if it's a network or API error
      const errorMessage = args.join(' ').toLowerCase();
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('api')) {
        setTimeout(() => {
          announceError("I encountered a connection issue, but I'm working on resolving it for you.");
        }, 1000);
      }
    };

    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('click', handleButtonClick);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('click', handleButtonClick);
      console.error = originalConsoleError;
    };
  }, [isEnabled]);

  const getPageNameFromPath = (path: string): string => {
    const pageMappings: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/social-media': 'social media',
      '/email': 'email',
      '/calendar': 'calendar',
      '/expenses': 'expenses',
      '/voice-chat': 'voice chat',
      '/photos': 'photos',
      '/contacts': 'contacts',
      '/settings': 'settings',
      '/diary': 'diary',
      '/budget': 'budget',
      '/facebook': 'Facebook',
      '/messenger': 'Messenger',
      '/youtube': 'YouTube',
      '/weather': 'weather',
      '/tracking': 'tracking',
      '/think-tool': 'thinking tool',
      '/shopping': 'shopping list',
      '/hotel-expenses': 'hotel expenses'
    };

    return pageMappings[path] || path.replace('/', '').replace('-', ' ');
  };

  const enableNarrator = () => {
    setIsEnabled(true);
    voiceNarrator.setEnabled(true);
    speakMessage("Voice narrator is now enabled! I'm here to help guide you through everything.", 'system', 'high');
  };

  const disableNarrator = () => {
    voiceNarrator.stopSpeaking();
    voiceNarrator.setEnabled(false);
    setIsEnabled(false);
    setIsSpeaking(false);
    setCurrentMessage('');
  };

  const speakMessage = async (message: string, type: string = 'response', priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> => {
    if (!isEnabled) return;
    
    return narratorSpeak(message, type as any, priority);
  };

  const greetUser = () => {
    if (!isEnabled) return;

    const greeting = narratorPersonality.getTimeBasedGreeting();
    speakMessage(greeting, 'greeting', 'high');
  };

  const announcePageChange = (pageName: string) => {
    if (!isEnabled) return;

    narratorPersonality.setCurrentPage(pageName);
    const welcomeMessage = narratorPersonality.getPageWelcomeMessage(pageName);
    speakMessage(welcomeMessage, 'system', 'medium');
  };

  const announceSuccess = (message: string) => {
    if (!isEnabled) return;

    const successMessage = narratorPersonality.getEncouragementMessage('complete_task');
    const fullMessage = message ? `${successMessage} ${message}` : successMessage;
    speakMessage(fullMessage, 'notification', 'medium');
  };

  const announceError = (message: string) => {
    if (!isEnabled) return;

    const errorMessage = narratorPersonality.getErrorRecoveryMessage('general');
    const fullMessage = `${errorMessage} ${message}`;
    speakMessage(fullMessage, 'notification', 'high');
  };

  const provideHelp = (context: string) => {
    if (!isEnabled) return;

    const helpMessage = narratorPersonality.getContextualResponse('help', context);
    speakMessage(helpMessage, 'guidance', 'medium');
  };

  const contextValue: SmartNarratorContextType = {
    isEnabled,
    isSpeaking,
    currentMessage,
    enableNarrator,
    disableNarrator,
    speakMessage,
    greetUser,
    announcePageChange,
    announceSuccess,
    announceError,
    provideHelp
  };

  return (
    <SmartNarratorContext.Provider value={contextValue}>
      {children}
    </SmartNarratorContext.Provider>
  );
}

export function useSmartNarrator() {
  const context = useContext(SmartNarratorContext);
  if (context === undefined) {
    throw new Error('useSmartNarrator must be used within a SmartNarratorProvider');
  }
  return context;
}

// Hook for easy narrator integration in components
export function useNarratorAnnouncements() {
  const narrator = useSmartNarrator();

  return {
    announceAction: (action: string) => {
      narrator.speakMessage(`${action} completed successfully!`, 'notification', 'medium');
    },
    
    announceLoading: (item: string) => {
      narrator.speakMessage(`Loading ${item}...`, 'system', 'low');
    },
    
    announceDataUpdate: (dataType: string) => {
      narrator.speakMessage(`${dataType} updated! Your information is now current.`, 'notification', 'medium');
    },
    
    announceNavigation: (destination: string) => {
      narrator.speakMessage(`Navigating to ${destination}...`, 'system', 'low');
    },
    
    announceFeature: (feature: string) => {
      const helpMessage = narratorPersonality.getContextualResponse('learning', feature);
      narrator.speakMessage(helpMessage, 'guidance', 'medium');
    },
    
    celebrateAchievement: (achievement: string) => {
      narrator.speakMessage(`Congratulations! You've ${achievement}. That's fantastic progress!`, 'notification', 'high');
    }
  };
}