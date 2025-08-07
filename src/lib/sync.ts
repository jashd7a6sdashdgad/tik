// Data Synchronization Manager - Cross-device data sync with conflict resolution

export interface SyncData {
  type: 'expense' | 'contact' | 'shopping-list' | 'diary' | 'calendar';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  userId: string;
  deviceId: string;
}

export interface SyncConflict {
  id: string;
  type: string;
  localData: any;
  remoteData: any;
  timestamp: number;
}

class SyncManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private deviceId!: string;
  private userId: string | null = null;
  private syncQueue: SyncData[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor() {
    // Check if running in browser environment
    if (typeof window === 'undefined') return;
    
    this.deviceId = this.getOrCreateDeviceId();
    this.setupOnlineListener();
    this.loadSyncQueue();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
      this.connect();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.disconnect();
    });
  }

  private loadSyncQueue() {
    const saved = localStorage.getItem('syncQueue');
    if (saved) {
      try {
        this.syncQueue = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load sync queue:', error);
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
    if (this.isOnline) {
      this.connect();
    }
  }

  connect() {
    if (!this.userId || !this.isOnline) return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      this.ws = new WebSocket(`${wsUrl}/sync?userId=${this.userId}&deviceId=${this.deviceId}`);

      this.ws.onopen = () => {
        console.log('🔗 Sync WebSocket connected');
        this.reconnectAttempts = 0;
        this.processSyncQueue();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SyncData = JSON.parse(event.data);
          this.handleRemoteSync(data);
        } catch (error) {
          console.error('Failed to parse sync message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Sync WebSocket disconnected');
        this.ws = null;
        this.emit('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Sync WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to sync server:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.isOnline) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting to sync server (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Sync data to other devices
  sync(data: Omit<SyncData, 'timestamp' | 'userId' | 'deviceId'>) {
    if (!this.userId) {
      console.warn('Cannot sync: No user ID set');
      return;
    }

    const syncData: SyncData = {
      ...data,
      timestamp: Date.now(),
      userId: this.userId,
      deviceId: this.deviceId
    };

    try {
      if (this.isOnline && this.ws?.readyState === WebSocket.OPEN) {
        // Send immediately if online
        this.ws.send(JSON.stringify(syncData));
      } else {
        // Queue for later if offline
        this.syncQueue.push(syncData);
        this.saveSyncQueue();
      }

      // Store locally for offline access
      this.storeLocally(syncData);
    } catch (error) {
      console.error('Sync failed:', error);
      // Still queue for retry
      this.syncQueue.push(syncData);
      this.saveSyncQueue();
    }
  }

  private processSyncQueue() {
    if (!this.isOnline || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];
    this.saveSyncQueue();

    queue.forEach(data => {
      this.ws!.send(JSON.stringify(data));
    });

    if (queue.length > 0) {
      console.log(`📤 Synced ${queue.length} queued items`);
    }
  }

  private handleRemoteSync(data: SyncData) {
    // Ignore our own sync messages
    if (data.deviceId === this.deviceId) return;

    console.log('📥 Received remote sync:', data);
    
    // Check for conflicts
    const conflict = this.detectConflict(data);
    if (conflict) {
      this.emit('conflict', conflict);
      return;
    }

    // Apply remote changes
    this.applyRemoteChanges(data);
    this.emit('sync', data);
  }

  private detectConflict(remoteData: SyncData): SyncConflict | null {
    const localKey = `${remoteData.type}_${this.getDataId(remoteData.data)}`;
    const localItem = localStorage.getItem(localKey);
    
    if (!localItem) return null;

    try {
      const localData = JSON.parse(localItem);
      const localTimestamp = localData.lastModified || 0;
      
      // Conflict if local data is newer than remote
      if (localTimestamp > remoteData.timestamp) {
        return {
          id: localKey,
          type: remoteData.type,
          localData: localData,
          remoteData: remoteData.data,
          timestamp: remoteData.timestamp
        };
      }
    } catch (error) {
      console.error('Failed to parse local data for conflict detection:', error);
    }

    return null;
  }

  private applyRemoteChanges(data: SyncData) {
    const key = `${data.type}_${this.getDataId(data.data)}`;
    
    switch (data.action) {
      case 'create':
      case 'update':
        localStorage.setItem(key, JSON.stringify({
          ...data.data,
          lastModified: data.timestamp,
          synced: true
        }));
        break;
      case 'delete':
        localStorage.removeItem(key);
        break;
    }
  }

  private storeLocally(data: SyncData) {
    const key = `${data.type}_${this.getDataId(data.data)}`;
    
    switch (data.action) {
      case 'create':
      case 'update':
        localStorage.setItem(key, JSON.stringify({
          ...data.data,
          lastModified: data.timestamp,
          synced: this.isOnline && this.ws?.readyState === WebSocket.OPEN
        }));
        break;
      case 'delete':
        localStorage.removeItem(key);
        break;
    }
  }

  private getDataId(data: any): string {
    return data.id || data._id || `temp_${Date.now()}`;
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

  // Get offline data
  getOfflineData<T>(type: string): T[] {
    const data: T[] = [];
    const prefix = `${type}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key)!);
          data.push(item);
        } catch (error) {
          console.error(`Failed to parse offline data for ${key}:`, error);
        }
      }
    }
    
    return data.sort((a: any, b: any) => (b.lastModified || 0) - (a.lastModified || 0));
  }

  // Resolve conflicts
  resolveConflict(conflict: SyncConflict, useLocal: boolean) {
    const key = conflict.id;
    
    if (useLocal) {
      // Keep local data and sync it
      const localData = conflict.localData;
      this.sync({
        type: conflict.type as any,
        action: 'update',
        data: localData
      });
    } else {
      // Use remote data
      localStorage.setItem(key, JSON.stringify({
        ...conflict.remoteData,
        lastModified: conflict.timestamp,
        synced: true
      }));
    }
    
    this.emit('conflictResolved', { conflict, useLocal });
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      connected: this.ws?.readyState === WebSocket.OPEN,
      queueSize: this.syncQueue.length,
      deviceId: this.deviceId
    };
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();