'use client';

import { useEffect } from 'react';
import { pwaManager } from '@/lib/pwa';
import { syncManager } from '@/lib/sync';

export default function PWAInit() {
  useEffect(() => {
    // Initialize PWA features on the client side
    const initializePWA = async () => {
      try {
        console.log('🚀 Initializing PWA features...');
        
        // Get user ID from auth context if available
        // This would typically come from your auth system
        const userId = localStorage.getItem('userId') || 'anonymous';
        syncManager.setUserId(userId);
        
        // Log PWA capabilities
        const capabilities = pwaManager.getCapabilities();
        console.log('📱 PWA Capabilities:', capabilities);
        
        // Setup notification permission if needed
        if (capabilities.notifications && Notification.permission === 'default') {
          // Don't ask immediately, let user trigger it
          console.log('💬 Notifications available but not requested yet');
        }
        
        // Setup background sync if supported
        if (capabilities.backgroundSync) {
          console.log('🔄 Background sync is supported');
        }
        
        // Log if running as PWA
        if (capabilities.isPWA) {
          console.log('📱 Running as installed PWA');
        }
        
        console.log('✅ PWA initialization completed');
      } catch (error) {
        console.error('❌ PWA initialization failed:', error);
      }
    };

    initializePWA();
  }, []);

  return null; // This component doesn't render anything
}