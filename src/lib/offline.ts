// Offline Data Management and Synchronization System

// Offline data management utilities
import { syncManager } from './sync';

export interface OfflineCapableData {
  id: string;
  lastModified: number;
  synced: boolean;
  [key: string]: any;
}

class OfflineManager {
  private storageQuota = 50 * 1024 * 1024; // 50MB storage quota
  private compressionEnabled = true;
  private syncRetryDelay = 5000; // 5 seconds

  constructor() {
    // Check if running in browser environment
    if (typeof window === 'undefined') return;
    
    this.setupStorageQuotaCheck();
    this.setupPeriodicSync();
  }

  private setupStorageQuotaCheck() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        console.log(`💾 Storage used: ${Math.round(used / 1024 / 1024)}MB of ${Math.round(quota / 1024 / 1024)}MB`);
        
        if (used > quota * 0.8) {
          this.cleanupOldData();
        }
      });
    }
  }

  private setupPeriodicSync() {
    // Sync every 30 seconds when online
    setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingChanges();
      }
    }, 30000);
  }

  // Store data with offline capabilities
  async store<T extends OfflineCapableData>(type: string, data: T): Promise<void> {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    const key = `offline_${type}_${data.id}`;
    const timestamp = Date.now();
    
    const offlineData: OfflineCapableData = {
      ...data,
      lastModified: timestamp,
      synced: false
    };

    try {
      // Compress data if needed
      const serialized = this.compressionEnabled 
        ? await this.compress(JSON.stringify(offlineData))
        : JSON.stringify(offlineData);

      localStorage.setItem(key, serialized);
      
      // Track for sync
      this.markForSync(type, data.id, 'update');
      
      console.log(`💾 Stored offline: ${type}/${data.id}`);
    } catch (error) {
      console.error('Failed to store offline data:', error);
      
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        console.warn('Storage quota exceeded, attempting cleanup...');
        await this.cleanupOldData();
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(offlineData));
        } catch (retryError) {
          console.error('Failed to store after cleanup:', retryError);
          throw retryError;
        }
      } else if (this.compressionEnabled) {
        // Try without compression
        try {
          localStorage.setItem(key, JSON.stringify(offlineData));
        } catch (fallbackError) {
          console.error('Failed to store even without compression:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  // Retrieve data with offline fallback
  async get<T extends OfflineCapableData>(type: string, id: string): Promise<T | null> {
    const key = `offline_${type}_${id}`;
    
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      // Decompress if needed
      const serialized = this.compressionEnabled && stored.startsWith('compressed:')
        ? await this.decompress(stored)
        : stored;

      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error(`Failed to retrieve offline data for ${type}/${id}:`, error);
      return null;
    }
  }

  // Get all data of a type
  async getAll<T extends OfflineCapableData>(type: string): Promise<T[]> {
    const prefix = `offline_${type}_`;
    const data: T[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const item = await this.get<T>(type, key.replace(prefix, ''));
          if (item) data.push(item);
        } catch (error) {
          console.error(`Failed to parse offline data for ${key}:`, error);
        }
      }
    }

    return data.sort((a, b) => b.lastModified - a.lastModified);
  }

  // Delete data
  async delete(type: string, id: string): Promise<void> {
    const key = `offline_${type}_${id}`;
    localStorage.removeItem(key);
    this.markForSync(type, id, 'delete');
    console.log(`🗑️ Deleted offline: ${type}/${id}`);
  }

  // Mark item for sync
  private markForSync(type: string, id: string, action: 'create' | 'update' | 'delete') {
    const syncKey = 'pendingSync';
    const pending = JSON.parse(localStorage.getItem(syncKey) || '[]');
    
    // Remove existing entry for this item
    const filtered = pending.filter((item: any) => !(item.type === type && item.id === id));
    
    // Add new sync task
    filtered.push({
      type,
      id,
      action,
      timestamp: Date.now()
    });

    localStorage.setItem(syncKey, JSON.stringify(filtered));
  }

  // Sync pending changes
  async syncPendingChanges(): Promise<void> {
    if (!navigator.onLine) return;

    const syncKey = 'pendingSync';
    const pending = JSON.parse(localStorage.getItem(syncKey) || '[]');
    
    if (pending.length === 0) return;

    console.log(`🔄 Syncing ${pending.length} pending changes`);

    const successful: any[] = [];
    
    for (const item of pending) {
      try {
        if (item.action === 'delete') {
          syncManager.sync({
            type: item.type,
            action: 'delete',
            data: { id: item.id }
          });
        } else {
          const data = await this.get(item.type, item.id);
          if (data) {
            syncManager.sync({
              type: item.type,
              action: item.action,
              data: { ...data, synced: true }
            });
            
            // Update local data as synced
            await this.store(item.type, { ...data, synced: true });
          }
        }
        successful.push(item);
      } catch (error) {
        console.error(`Failed to sync ${item.type}/${item.id}:`, error);
      }
    }

    // Remove successfully synced items
    if (successful.length > 0) {
      const remaining = pending.filter((item: any) => 
        !successful.some(s => s.type === item.type && s.id === item.id)
      );
      localStorage.setItem(syncKey, JSON.stringify(remaining));
      console.log(`✅ Successfully synced ${successful.length} items`);
    }
  }

  // Get sync status
  getSyncStatus() {
    const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
    return {
      pendingSync: pending.length,
      isOnline: navigator.onLine,
      lastSync: localStorage.getItem('lastSyncTime') || null
    };
  }

  // Cleanup old data to free space
  private async cleanupOldData() {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('offline_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          if (data.lastModified < cutoff && data.synced) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove corrupted data
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} old offline entries`);
  }

  // Simple compression for large data
  private async compress(data: string): Promise<string> {
    if (data.length < 1000) return data; // Don't compress small data
    
    try {
      // Simple LZ-string style compression could be added here
      // For now, just mark it as compressed
      return `compressed:${data}`;
    } catch (error) {
      return data;
    }
  }

  private async decompress(data: string): Promise<string> {
    if (!data.startsWith('compressed:')) return data;
    
    try {
      return data.substring(11); // Remove "compressed:" prefix
    } catch (error) {
      throw new Error('Failed to decompress data');
    }
  }

  // Clear all offline data (for logout/reset)
  clearAll(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('offline_') || key === 'pendingSync') {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared all offline data (${keysToRemove.length} items)`);
  }
}

// Global offline manager instance
export const offlineManager = new OfflineManager();