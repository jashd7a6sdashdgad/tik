'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
  voiceAnnouncements: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  descriptiveLabels: boolean;
  autoReadContent: boolean;
  announcePageChanges: boolean;
  announceFormErrors: boolean;
  announceUpdates: boolean;
  readingSpeed: 'slow' | 'normal' | 'fast';
  contrastLevel: 'normal' | 'high' | 'highest';
  textSize: 'normal' | 'large' | 'xlarge';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  announceLiveRegion: (message: string, region?: string) => void;
  isScreenReaderActive: boolean;
  focusElement: (selector: string) => void;
  skipToContent: () => void;
  skipToNavigation: () => void;
}

const defaultSettings: AccessibilitySettings = {
  screenReaderEnabled: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  keyboardNavigation: true,
  voiceAnnouncements: true,
  focusIndicators: true,
  skipLinks: true,
  descriptiveLabels: true,
  autoReadContent: false,
  announcePageChanges: true,
  announceFormErrors: true,
  announceUpdates: true,
  readingSpeed: 'normal',
  contrastLevel: 'normal',
  textSize: 'normal'
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for screen reader indicators
      const hasScreenReader = !!(
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.speechSynthesis ||
        window.navigator.userAgent.includes('Dragon') ||
        document.querySelector('[aria-hidden]') ||
        'speechSynthesis' in window
      );
      
      setIsScreenReaderActive(hasScreenReader);
      
      if (hasScreenReader) {
        setSettings(prev => ({ ...prev, screenReaderEnabled: true }));
      }
    };

    detectScreenReader();

    // Listen for screen reader events
    const handleFocus = (e: FocusEvent) => {
      if (e.target && settings.voiceAnnouncements) {
        const element = e.target as HTMLElement;
        const announcement = getElementAnnouncement(element);
        if (announcement) {
          announceMessage(announcement, 'polite');
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [settings.voiceAnnouncements]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Text size
    root.classList.remove('text-normal', 'text-large', 'text-xlarge');
    root.classList.add(`text-${settings.textSize}`);

    // Contrast level
    root.classList.remove('contrast-normal', 'contrast-high', 'contrast-highest');
    root.classList.add(`contrast-${settings.contrastLevel}`);
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    
    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify({ ...settings, ...updates }));
    
    // Announce setting changes
    if (updates.screenReaderEnabled !== undefined) {
      announceMessage(
        updates.screenReaderEnabled 
          ? 'Screen reader support enabled' 
          : 'Screen reader support disabled',
        'assertive'
      );
    }
  };

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.voiceAnnouncements && !settings.screenReaderEnabled) return;

    // Create or update announcement region
    let announcer = document.getElementById(`aria-announcer-${priority}`);
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = `aria-announcer-${priority}`;
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
      `;
      document.body.appendChild(announcer);
    }

    // Clear and set new message
    announcer.textContent = '';
    setTimeout(() => {
      announcer!.textContent = message;
    }, 100);

    // Also use speech synthesis if available
    if ('speechSynthesis' in window && settings.voiceAnnouncements) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = settings.readingSpeed === 'slow' ? 0.7 : settings.readingSpeed === 'fast' ? 1.3 : 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const announceLiveRegion = (message: string, region: string = 'main') => {
    const liveRegion = document.querySelector(`[aria-live][data-region="${region}"]`);
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  };

  const getElementAnnouncement = (element: HTMLElement): string => {
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('aria-labelledby') || 
                  element.getAttribute('title');
    const description = element.getAttribute('aria-describedby');
    
    let announcement = '';
    
    if (label) announcement += label;
    if (role) announcement += `, ${role}`;
    if (description) {
      const descElement = document.getElementById(description);
      if (descElement) announcement += `, ${descElement.textContent}`;
    }
    
    // Special handling for different element types
    if (element.tagName === 'BUTTON') {
      if (element.hasAttribute('aria-expanded')) {
        const expanded = element.getAttribute('aria-expanded') === 'true';
        announcement += expanded ? ', expanded' : ', collapsed';
      }
    } else if (element.tagName === 'INPUT') {
      const type = element.getAttribute('type');
      if (type === 'checkbox' || type === 'radio') {
        const checked = (element as HTMLInputElement).checked;
        announcement += checked ? ', checked' : ', unchecked';
      }
    }
    
    return announcement;
  };

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      if (settings.voiceAnnouncements) {
        const announcement = getElementAnnouncement(element);
        if (announcement) {
          announceMessage(announcement, 'polite');
        }
      }
    }
  };

  const skipToContent = () => {
    focusElement('#main-content, main, [role="main"]');
    announceMessage('Skipped to main content', 'polite');
  };

  const skipToNavigation = () => {
    focusElement('#main-navigation, nav, [role="navigation"]');
    announceMessage('Skipped to main navigation', 'polite');
  };

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      announceMessage,
      announceLiveRegion,
      isScreenReaderActive,
      focusElement,
      skipToContent,
      skipToNavigation
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}