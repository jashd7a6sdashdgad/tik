'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Navigation,
  Phone,
  Mail,
  Calendar,
  Car,
  Cloud,
  Users,
  Settings,
  Star,
  Volume2,
  VolumeX
} from 'lucide-react';
import { smartNotificationEngine, SmartNotification } from '@/lib/smartNotifications';

interface SmartNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartNotificationCenter({ isOpen, onClose }: SmartNotificationCenterProps) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority' | 'contextual'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }

    // Listen for new notifications
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail as SmartNotification;
      setNotifications(prev => [notification, ...prev]);
      
      // Play notification sound
      if (soundEnabled && notification.priority !== 'low') {
        playNotificationSound(notification);
      }
    };

    window.addEventListener('smartNotification', handleNewNotification as EventListener);
    
    return () => {
      window.removeEventListener('smartNotification', handleNewNotification as EventListener);
    };
  }, [isOpen, soundEnabled]);

  const loadNotifications = () => {
    const allNotifications = smartNotificationEngine.getNotifications();
    setNotifications(allNotifications);
  };

  const playNotificationSound = (notification: SmartNotification) => {
    // Different sounds for different priorities
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different priorities
    const frequencies: Record<string, number> = {
      critical: 800,  // High pitched urgent sound
      high: 600,      // Medium-high pitched
      medium: 400,    // Medium pitched
      low: 300        // Low pitched
    };
    
    oscillator.frequency.setValueAtTime(frequencies[notification.priority] || 400, audioContext.currentTime);
    oscillator.type = notification.priority === 'critical' ? 'square' : 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => n.status === 'delivered');
        break;
      case 'priority':
        filtered = notifications.filter(n => ['critical', 'high'].includes(n.priority));
        break;
      case 'contextual':
        filtered = notifications.filter(n => ['traffic', 'weather', 'calendar'].includes(n.type));
        break;
      default:
        filtered = notifications;
    }
    
    return filtered.slice(0, 50); // Limit to 50 most recent
  };

  const handleDismiss = (notificationId: string) => {
    smartNotificationEngine.dismissNotification(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status: 'dismissed' as const } : n)
    );
  };

  const handleClock = (notificationId: string, minutes: number = 15) => {
    smartNotificationEngine.snoozeNotification(notificationId, minutes);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status: 'snoozed' as const } : n)
    );
  };

  const handleAction = (notification: SmartNotification, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    switch (action.action) {
      case 'navigate':
        // Open maps/navigation
        if (action.payload?.destination) {
          window.open(`https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.payload.destination)}`);
        }
        break;
      case 'call':
        if (action.payload?.phone) {
          window.open(`tel:${action.payload.phone}`);
        }
        break;
      case 'reply':
        // Open email compose or messaging app
        break;
      case 'reschedule':
        // Open calendar reschedule dialog
        break;
      case 'snooze':
        handleClock(notification.id, action.payload?.minutes || 15);
        return;
      case 'custom':
        // Handle custom actions
        if (action.payload?.meetingUrl) {
          window.open(action.payload.meetingUrl);
        }
        break;
    }
    
    // Mark as handled
    handleDismiss(notification.id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'; 
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVIPBadge = (vipLevel?: string) => {
    if (!vipLevel || vipLevel === 'none') return null;
    
    const colors = {
      emergency: 'bg-red-100 text-red-800',
      vip: 'bg-purple-100 text-purple-800', 
      important: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={`text-xs ${colors[vipLevel as keyof typeof colors]}`}>
        <Star className="h-3 w-3 mr-1" />
        {vipLevel.toUpperCase()}
      </Badge>
    );
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      email: <Mail className="h-5 w-5" />,
      calendar: <Calendar className="h-5 w-5" />,
      traffic: <Car className="h-5 w-5" />,
      weather: <Cloud className="h-5 w-5" />,
      contact: <Users className="h-5 w-5" />,
      task: <CheckCircle className="h-5 w-5" />,
      system: <Settings className="h-5 w-5" />
    };
    return icons[type] || <Bell className="h-5 w-5" />;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => n.status === 'delivered').length;
  const priorityCount = notifications.filter(n => ['critical', 'high'].includes(n.priority)).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Smart Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Priority-based alerts with meeting awareness
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'priority' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('priority')}
            >
              Priority ({priorityCount})
            </Button>
            <Button
              variant={filter === 'contextual' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('contextual')}
            >
              Contextual
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications to show</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    notification.status === 'dismissed' ? 'opacity-60' : ''
                  } ${getPriorityColor(notification.priority)} border-l-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {getVIPBadge(notification.vipLevel)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {/* Action buttons */}
                          {notification.actions?.slice(0, 2).map((action) => (
                            <Button
                              key={action.id}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleAction(notification, action.id)}
                            >
                              {action.action === 'navigate' && <Navigation className="h-3 w-3 mr-1" />}
                              {action.action === 'call' && <Phone className="h-3 w-3 mr-1" />}
                              {action.action === 'snooze' && <Clock className="h-3 w-3 mr-1" />}
                              {action.label}
                            </Button>
                          ))}
                          
                          {/* Default actions */}
                          {notification.status !== 'dismissed' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClock(notification.id)}
                                className="text-xs"
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDismiss(notification.id)}
                                className="text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}