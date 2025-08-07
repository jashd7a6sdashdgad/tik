'use client';

import { useState, useEffect } from 'react';
import { pwaManager } from '@/lib/pwa';

export function usePWA() {
  const [isPWA, setIsPWA] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone || 
                       document.referrer.includes('android-app://');
      setIsPWA(isPWAMode);
    };

    // Check if can install
    const checkCanInstall = () => {
      // This would normally be set by beforeinstallprompt event
      setCanInstall(false);
    };

    checkPWA();
    checkCanInstall();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkPWA();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const installPWA = async () => {
    setIsInstalling(true);
    try {
      await pwaManager.installPWA();
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    isPWA,
    canInstall,
    isInstalling,
    installPWA
  };
}