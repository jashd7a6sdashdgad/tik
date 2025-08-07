// Progressive Web App Manager with Service Worker and Install Prompts

// Declare SyncManager to resolve the TypeScript error
declare global {
  interface SyncManager {
    register(tag: string): Promise<void>;
  }
}

// Adjusted type to match the 'beforeinstallprompt' event object for better type safety
interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UpdateAvailableInfo {
  isUpdateAvailable: boolean;
  updateSW: () => Promise<void>;
  registration: ServiceWorkerRegistration | null;
}

class PWAManager {
  private deferredPrompt: PWAInstallPromptEvent | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private async initialize() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('🔧 Service Worker registered:', this.registration);

        // Check for updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.emit('updateAvailable', {
                  isUpdateAvailable: true,
                  updateSW: () => this.activateUpdate(),
                  registration: this.registration
                });
              }
            });
          }
        });

        // Handle controlled page updates
        const controllerChangeHandler = () => {
          window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Correctly type the event object
      this.deferredPrompt = e as PWAInstallPromptEvent;
      this.emit('installPromptAvailable', true);
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA installed successfully');
      this.deferredPrompt = null;
      this.emit('appInstalled', true);
    });

    // Setup notification permission
    this.setupNotifications();

    // Setup background sync
    this.setupBackgroundSync();
  }

  private async setupNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = Notification.permission;
      this.emit('notificationPermission', permission);
    }
  }

  private setupBackgroundSync() {
    // Check for `sync` support on the registration object
    if ('serviceWorker' in navigator && this.registration && 'sync' in this.registration) {
      console.log('🔄 Background sync is supported');
      this.emit('backgroundSyncSupported', true);
    }
  }

  // Install PWA
  async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('❌ No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted PWA install');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('❌ User dismissed PWA install');
        return false;
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
      return false;
    }
  }

  // Check if PWA is installable
  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  // Check if running as PWA
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
              (window.navigator as any).standalone === true ||
              document.referrer.includes('android-app://');
  }

  // Update service worker
  async activateUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Send message to SW to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.emit('notificationPermission', permission);
    return permission;
  }

  // Show notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    const notificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      // The `vibrate` property is not in the standard NotificationOptions type,
      // so we include it and then cast the entire object to the correct type.
      vibrate: [100, 50, 100],
      ...options
    };

    await this.registration.showNotification(title, notificationOptions as NotificationOptions);
  }

  // Register for background sync
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if ('sync' in this.registration) {
      // Type assertion to inform TypeScript that 'sync' is a SyncManager.
      // The `declare global` block above ensures this type is recognized.
      const syncManager = this.registration.sync as SyncManager;
      await syncManager.register(tag);
      console.log(`🔄 Registered background sync: ${tag}`);
    } else {
      console.warn('Background sync not supported by this browser.');
    }
  }

  // Get PWA capabilities
  getCapabilities() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      // Check `sync` property on the registration object, not the window prototype
      backgroundSync: 'serviceWorker' in navigator && this.registration && 'sync' in this.registration,
      periodicSync: 'serviceWorker' in navigator && this.registration && 'periodicSync' in this.registration,
      webShare: 'share' in navigator,
      installPrompt: this.deferredPrompt !== null,
      isPWA: this.isPWA(),
      updateAvailable: this.updateAvailable
    };
  }

// Share content
async shareContent(data: ShareData): Promise<void> {
  if ('share' in navigator) {
    await navigator.share(data);
  } else {
    // Fallback to clipboard
    if (data.url) {
      // Use a type assertion to bypass the TypeScript error for 'clipboard'
      await (navigator as any).clipboard.writeText(data.url);
      console.log('📋 URL copied to clipboard');
    } else {
      console.warn('Web Share API is not supported and no URL was provided to copy.');
    }
  }
}

  // Event system
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clear all data (for logout)
  async clearAppData(): Promise<void> {
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear local storage
    localStorage.clear();

    // Clear session storage
    sessionStorage.clear();

    // Clear IndexedDB (if used)
    if ('indexedDB' in window) {
      // IndexedDB clearing logic would go here
    }

    console.log('🗑️ Cleared all app data');
  }
}

// Global PWA manager instance
export const pwaManager = new PWAManager();