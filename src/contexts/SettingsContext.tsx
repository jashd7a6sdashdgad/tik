'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  language: string;
  timezone: string;
  setLanguage: (language: string) => void;
  setTimezone: (timezone: string) => void;
  isRTL: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [language, setLanguageState] = useState('en');
  const [timezone, setTimezoneState] = useState('Asia/Muscat');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language');
    const savedTimezone = localStorage.getItem('app-timezone');
    
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
    
    if (savedTimezone) {
      setTimezoneState(savedTimezone);
    } else {
      // Default to Asia/Muscat (GMT+4)
      setTimezoneState('Asia/Muscat');
    }
    
    // Always use LTR direction regardless of language
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = savedLanguage || 'en';
  }, []);

  const setLanguage = (newLanguage: string) => {
    setLanguageState(newLanguage);
    localStorage.setItem('app-language', newLanguage);
    
    // Always use LTR direction regardless of language
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = newLanguage;
  };

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    localStorage.setItem('app-timezone', newTimezone);
  };

  const isRTL = false; // Always use LTR layout

  return (
    <SettingsContext.Provider value={{
      language,
      timezone,
      setLanguage,
      setTimezone,
      isRTL
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}