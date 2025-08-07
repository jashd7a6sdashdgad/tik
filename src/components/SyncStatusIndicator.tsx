'use client';

import { useState, useEffect } from 'react';
import { useSync, useSyncEvents } from '@/hooks/useSync';
import { SyncConflict } from '@/lib/sync';
import { useOffline } from '@/hooks/useOffline';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertTriangle, 
  Check,
  Clock,
  Smartphone
} from 'lucide-react';
import SyncConflictDialog from './SyncConflictDialog';

export default function SyncStatusIndicator() {
  const { getSyncStatus, resolveConflict } = useSync();
  const { syncStatus } = useOffline('general');
  const { isPWA } = usePWA();
  const { on } = useSyncEvents();
  
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [syncState, setSyncState] = useState(getSyncStatus());

  useEffect(() => {
    // Listen for sync events
    const unsubscribeConflict = on('conflict', (conflict: SyncConflict) => {
      setCurrentConflict(conflict);
    });

    const unsubscribeSync = on('sync', () => {
      setSyncState(getSyncStatus());
    });

    const unsubscribeConnected = on('connected', () => {
      setSyncState(getSyncStatus());
    });

    const unsubscribeDisconnected = on('disconnected', () => {
      setSyncState(getSyncStatus());
    });

    // Update sync status periodically
    const interval = setInterval(() => {
      setSyncState(getSyncStatus());
    }, 5000);

    return () => {
      unsubscribeConflict();
      unsubscribeSync();
      unsubscribeConnected();
      unsubscribeDisconnected();
      clearInterval(interval);
    };
  }, [on, getSyncStatus]);

  const handleResolveConflict = (conflict: SyncConflict, useLocal: boolean) => {
    resolveConflict(conflict, useLocal);
    setCurrentConflict(null);
  };

  const getStatusIcon = () => {
    if (currentConflict) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    
    if (!syncState.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (!syncState.connected) {
      return <CloudOff className="h-4 w-4 text-orange-500" />;
    }
    
    if (syncState.queueSize > 0) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    
    return <Check className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (currentConflict) return 'Conflict';
    if (!syncState.isOnline) return 'Offline';
    if (!syncState.connected) return 'Connecting';
    if (syncState.queueSize > 0) return 'Syncing';
    return 'Synced';
  };

  const getStatusColor = () => {
    if (currentConflict) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (!syncState.isOnline) return 'bg-red-100 text-red-800 border-red-200';
    if (!syncState.connected) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (syncState.queueSize > 0) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Main Status Badge */}
        <Badge 
          variant="outline" 
          className={`cursor-pointer transition-all hover:shadow-sm ${getStatusColor()}`}
          onClick={() => setShowDetails(!showDetails)}
        >
          {getStatusIcon()}
          <span className="ml-1 text-xs font-medium">{getStatusText()}</span>
        </Badge>

        {/* PWA Indicator */}
        {isPWA && (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
            <Smartphone className="h-3 w-3 mr-1" />
            <span className="text-xs">PWA</span>
          </Badge>
        )}

        {/* Conflict Alert */}
        {currentConflict && (
          <Button 
            size="sm" 
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
            onClick={() => setCurrentConflict(currentConflict)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Resolve
          </Button>
        )}
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Sync Status</h3>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowDetails(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Connection:</span>
                <div className="flex items-center space-x-1">
                  {syncState.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className={syncState.isOnline ? 'text-green-600' : 'text-red-600'}>
                    {syncState.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Real-time Sync:</span>
                <div className="flex items-center space-x-1">
                  {syncState.connected ? (
                    <Cloud className="h-4 w-4 text-green-500" />
                  ) : (
                    <CloudOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={syncState.connected ? 'text-green-600' : 'text-gray-600'}>
                    {syncState.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {syncStatus.pendingSync > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    <span className="text-blue-600">
                      {syncStatus.pendingSync} items
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Device ID:</span>
                <span className="text-xs text-gray-500 font-mono">
                  {syncState.deviceId.slice(-8)}
                </span>
              </div>

              {syncStatus.lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="text-xs text-gray-500">
                    {new Date(syncStatus.lastSync).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {!syncState.isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                <div className="flex items-start space-x-2">
                  <WifiOff className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <div className="font-medium">Offline Mode</div>
                    <div>Your changes are saved locally and will sync when you're back online.</div>
                  </div>
                </div>
              </div>
            )}

            {currentConflict && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-xs text-orange-800">
                    <div className="font-medium">Sync Conflict</div>
                    <div>The same {currentConflict.type} was modified on multiple devices.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Conflict Dialog */}
      <SyncConflictDialog
        conflict={currentConflict}
        onResolve={handleResolveConflict}
        onClose={() => setCurrentConflict(null)}
      />
    </>
  );
}