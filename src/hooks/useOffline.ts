'use client';

import { useState, useEffect } from 'react';
import { offlineManager } from '@/lib/offline';

export function useOffline(dataType: string) {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    pendingSync: 0,
    lastSync: null as Date | null
  });

  useEffect(() => {
    const updateStatus = () => {
      // Get offline data count for this data type
      const offlineKey = `offline_${dataType}`;
      const offlineData = localStorage.getItem(offlineKey);
      const pendingSync = offlineData ? JSON.parse(offlineData).length || 0 : 0;
      
      // Get last sync time
      const lastSyncKey = `last_sync_${dataType}`;
      const lastSyncStr = localStorage.getItem(lastSyncKey);
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;

      setSyncStatus({
        isOnline: navigator.onLine,
        pendingSync,
        lastSync
      });
    };

    // Update on mount
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [dataType]);

  return { syncStatus };
}