'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncConflict } from '@/lib/sync';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState(syncManager.getSyncStatus());

  const getSyncStatus = useCallback(() => {
    return syncManager.getSyncStatus();
  }, []);

  const resolveConflict = useCallback((conflict: SyncConflict, useLocal: boolean) => {
    return syncManager.resolveConflict(conflict, useLocal);
  }, []);

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    // Update status on mount
    updateStatus();

    // Set up interval to check status
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    getSyncStatus,
    resolveConflict
  };
}

export function useSyncEvents() {
  const [listeners] = useState(new Map<string, ((data?: any) => void)[]>());

  const on = useCallback((event: string, callback: (data?: any) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }, [listeners]);

  const emit = useCallback((event: string, data?: any) => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }, [listeners]);

  return { on, emit };
}