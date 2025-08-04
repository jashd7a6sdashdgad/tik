'use client';

import { useEffect } from 'react';

export function useTheme() {
  useEffect(() => {
    // Load and apply saved theme settings on app startup
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const appearance = parsed.appearance;
        
        if (appearance) {
          // Apply theme
          if (appearance.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }

          // Apply color scheme
          if (appearance.colorScheme) {
            document.documentElement.setAttribute('data-color-scheme', appearance.colorScheme);
          }

          // Apply font size
          if (appearance.fontSize) {
            const fontSize = appearance.fontSize === 'small' ? '14px' : 
                            appearance.fontSize === 'large' ? '18px' : '16px';
            document.documentElement.style.setProperty('--base-font-size', fontSize);
            document.body.style.fontSize = fontSize;
          }
        }
      } catch (error) {
        console.error('Failed to apply saved theme:', error);
      }
    }
  }, []);
}