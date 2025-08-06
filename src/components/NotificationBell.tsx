'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing,
  AlertTriangle,
  Star,
  Clock
} from 'lucide-react';
import { smartNotificationEngine, SmartNotification } from '@/lib/smartNotifications';
import SmartNotificationCenter from './SmartNotificationCenter';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    // Load initial notifications
    loadNotifications();

    // Listen for new notifications
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail as SmartNotification;
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      setHasNewNotifications(true);
      
      // Auto-clear the "new" indicator after 5 seconds
      setTimeout(() => {
        setHasNewNotifications(false);
      }, 5000);
    };

    window.addEventListener('smartNotification', handleNewNotification as EventListener);
    
    // Periodic refresh
    const interval = setInterval(loadNotifications, 60000); // Every minute
    
    return () => {
      window.removeEventListener('smartNotification', handleNewNotification as EventListener);
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = () => {
    const allNotifications = smartNotificationEngine.getNotifications();
    setNotifications(allNotifications);
  };

  const handleBellClick = () => {
    setIsOpen(true);
    setHasNewNotifications(false);
  };

  const unreadCount = notifications.filter(n => n.status === 'delivered').length;
  const hasHighPriority = notifications.some(n => 
    ['critical', 'high'].includes(n.priority) && n.status === 'delivered'
  );
  const hasVIP = notifications.some(n => 
    n.vipLevel && n.vipLevel !== 'none' && n.status === 'delivered'
  );

  return (
    <>
      <div className="relative">
        <Button
          onClick={handleBellClick}
          variant="ghost"
          size="sm"
          className={`relative transition-all duration-200 ${
            hasNewNotifications ? 'animate-pulse' : ''
          } ${hasHighPriority ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-700'}`}
        >
          {hasNewNotifications || hasHighPriority ? (
            <BellRing className={`h-5 w-5 ${hasHighPriority ? 'text-red-600' : ''}`} />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {/* Notification count badge */}
          {unreadCount > 0 && (
            <Badge
              className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 ${
                hasHighPriority 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : hasVIP
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          
          {/* Priority indicators */}
          {hasHighPriority && (
            <div className="absolute -top-1 -left-1">
              <AlertTriangle className="h-3 w-3 text-red-600 animate-pulse" />
            </div>
          )}
          
          {hasVIP && !hasHighPriority && (
            <div className="absolute -top-1 -left-1">
              <Star className="h-3 w-3 text-purple-600" />
            </div>
          )}
          
          {/* Pulsing animation for new notifications */}
          {hasNewNotifications && (
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping"></div>
          )}
        </Button>

        {/* Quick preview tooltip */}
        {unreadCount > 0 && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recent Notifications</span>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {notifications
                .filter(n => n.status === 'delivered')
                .slice(0, 3)
                .map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-gray-50 last:border-b-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.priority === 'critical' && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        {notification.vipLevel === 'vip' && (
                          <Star className="h-4 w-4 text-purple-600" />
                        )}
                        {notification.type === 'calendar' && (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                        {!['critical'].includes(notification.priority) && 
                         notification.vipLevel !== 'vip' && 
                         notification.type !== 'calendar' && (
                          <Bell className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            {unreadCount > 3 && (
              <div className="p-2 text-center border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  +{unreadCount - 3} more notifications
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Center Modal */}
      <SmartNotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return timestamp.toLocaleDateString();
}