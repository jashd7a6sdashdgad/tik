'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell,
  X,
  Calendar,
  Mail,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  ArrowRight,
  BellRing,
  MapPin,
  Sun,
  Mic
} from 'lucide-react';

interface SmartNotification {
  id: string;
  type: 'urgent' | 'reminder' | 'info' | 'success' | 'prayer';
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    text: string;
    path: string;
  };
  autoHide?: boolean;
  category: 'calendar' | 'email' | 'expense' | 'system' | 'social' | 'islamic' | 'voice';
  prayerTime?: string;
  priority?: number;
}

interface SmartNotificationsProps {
  dashboardData: any;
  className?: string;
}

export default function SmartNotifications({ dashboardData, className = '' }: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);

  // Fetch prayer times
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const response = await fetch(`http://api.aladhan.com/v1/timingsByCity?city=Muscat&country=Oman&method=2`);
        const data = await response.json();
        if (data.code === 200) {
          setPrayerTimes(data.data.timings);
        }
      } catch (error) {
        console.error('Failed to fetch prayer times:', error);
      }
    };
    
    fetchPrayerTimes();
  }, []);

  // Generate smart notifications based on data
  const generateNotifications = () => {
    const newNotifications: SmartNotification[] = [];
    const now = new Date();

    // Islamic Prayer Times - Always show as highest priority
    if (prayerTimes) {
      const prayerNames = {
        'Fajr': 'Dawn',
        'Dhuhr': 'Noon', 
        'Asr': 'Afternoon',
        'Maghrib': 'Sunset',
        'Isha': 'Night'
      };

      const currentTime = now.toTimeString().substring(0, 5);
      let nextPrayer = '';
      let nextPrayerTime = '';
      let timeToNext = '';

      // Find the next prayer
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      for (let i = 0; i < prayers.length; i++) {
        const prayerTime = prayerTimes[prayers[i]];
        if (prayerTime > currentTime) {
          nextPrayer = prayers[i];
          nextPrayerTime = prayerTime;
          
          // Calculate time difference
          const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
          const [prayerHours, prayerMinutes] = prayerTime.split(':').map(Number);
          
          const currentTotal = currentHours * 60 + currentMinutes;
          const prayerTotal = prayerHours * 60 + prayerMinutes;
          
          const diffMinutes = prayerTotal - currentTotal;
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;
          
          if (hours > 0) {
            timeToNext = `${hours}h ${minutes}m`;
          } else {
            timeToNext = `${minutes}m`;
          }
          break;
        }
      }

      // If no prayer found for today, next prayer is Fajr tomorrow
      if (!nextPrayer) {
        nextPrayer = 'Fajr';
        nextPrayerTime = prayerTimes['Fajr'];
        timeToNext = 'Tomorrow';
      }

      newNotifications.push({
        id: 'islamic-prayer-times',
        type: 'prayer',
        title: `🕌 Next Prayer: ${nextPrayer} (${prayerNames[nextPrayer as keyof typeof prayerNames]})`,
        message: `${nextPrayerTime} - ${timeToNext} remaining`,
        timestamp: now,
        action: { text: 'Islamic Settings', path: '/islamic-settings' },
        category: 'islamic',
        priority: 100,
        prayerTime: nextPrayerTime
      });

      // Show all prayer times for today
      newNotifications.push({
        id: 'todays-prayer-schedule',
        type: 'info',
        title: '📅 Today\'s Prayer Schedule',
        message: `Fajr: ${prayerTimes.Fajr} | Dhuhr: ${prayerTimes.Dhuhr} | Asr: ${prayerTimes.Asr} | Maghrib: ${prayerTimes.Maghrib} | Isha: ${prayerTimes.Isha}`,
        timestamp: now,
        action: { text: 'Prayer Times', path: '/islamic-settings' },
        category: 'islamic',
        priority: 95
      });
    }

    // Upcoming events (within next 2 hours)
    if (dashboardData.todayEvents?.length > 0) {
      dashboardData.todayEvents.forEach((event: any) => {
        const eventTime = new Date(event.start?.dateTime || event.start?.date);
        const timeDiff = eventTime.getTime() - now.getTime();
        const hoursUntil = timeDiff / (1000 * 60 * 60);

        if (hoursUntil > 0 && hoursUntil <= 2) {
          newNotifications.push({
            id: `event-${event.id}`,
            type: hoursUntil <= 0.5 ? 'urgent' : 'reminder',
            title: 'Upcoming Event',
            message: `${event.summary} in ${Math.round(hoursUntil * 60)} minutes`,
            timestamp: now,
            action: { text: 'View Calendar', path: '/calendar' },
            category: 'calendar'
          });
        }
      });
    }

    // High priority emails
    if (dashboardData.unreadEmails > 20) {
      newNotifications.push({
        id: 'high-unread-emails',
        type: 'urgent',
        title: 'High Email Volume',
        message: `${dashboardData.unreadEmails} unread emails need attention`,
        timestamp: now,
        action: { text: 'Check Inbox', path: '/email' },
        category: 'email'
      });
    } else if (dashboardData.unreadEmails > 5) {
      newNotifications.push({
        id: 'unread-emails',
        type: 'reminder',
        title: 'Unread Emails',
        message: `${dashboardData.unreadEmails} unread emails`,
        timestamp: now,
        action: { text: 'Check Inbox', path: '/email' },
        category: 'email',
        autoHide: true
      });
    }

    // Expense alerts
    if (dashboardData.todayExpenses?.length > 0) {
      const todayTotal = dashboardData.todayExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      if (todayTotal > 200) {
        newNotifications.push({
          id: 'high-spending-alert',
          type: 'urgent',
          title: 'High Spending Alert',
          message: `Today's expenses: $${todayTotal.toFixed(2)} - Review your budget`,
          timestamp: now,
          action: { text: 'View Expenses', path: '/expenses' },
          category: 'expense'
        });
      }
    }

    // Daily productivity reminders
    const currentHour = now.getHours();
    if (currentHour === 9 && now.getMinutes() < 15) {
      newNotifications.push({
        id: 'morning-productivity',
        type: 'info',
        title: 'Good Morning!',
        message: 'Start your productive day - review your priorities',
        timestamp: now,
        action: { text: 'View Dashboard', path: '/dashboard' },
        category: 'system',
        autoHide: true
      });
    }

    if (currentHour === 17 && now.getMinutes() < 15) {
      newNotifications.push({
        id: 'evening-review',
        type: 'info',
        title: 'End of Day',
        message: 'Review your accomplishments and plan tomorrow',
        timestamp: now,
        action: { text: 'Write Journal', path: '/diary' },
        category: 'system',
        autoHide: true
      });
    }

    // Success notifications
    if (dashboardData.unreadEmails === 0) {
      newNotifications.push({
        id: 'inbox-zero',
        type: 'success',
        title: 'Inbox Zero! 🎉',
        message: 'Great job keeping your inbox clean',
        timestamp: now,
        category: 'email',
        autoHide: true
      });
    }

    // Sort by priority and timestamp
    return newNotifications
      .sort((a, b) => {
        // First sort by custom priority if available
        if (a.priority && b.priority) {
          return b.priority - a.priority;
        }
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        
        // Then by type priority
        const priorityOrder = { prayer: 5, urgent: 4, reminder: 3, info: 2, success: 1 };
        if (priorityOrder[a.type] !== priorityOrder[b.type]) {
          return priorityOrder[b.type] - priorityOrder[a.type];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, showAll ? 15 : 8);
  };

  useEffect(() => {
    const newNotifications = generateNotifications();
    setNotifications(newNotifications);

    // Auto-hide notifications after 30 seconds
    const autoHideTimer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => !n.autoHide));
    }, 30000);

    return () => clearTimeout(autoHideTimer);
  }, [dashboardData, showAll]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'prayer': return <Sun className="h-4 w-4 text-green-700" />;
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'reminder': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getCategoryIcon = (category: SmartNotification['category']) => {
    switch (category) {
      case 'islamic': return <Sun className="h-3 w-3" />;
      case 'voice': return <Mic className="h-3 w-3" />;
      case 'calendar': return <Calendar className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'expense': return <DollarSign className="h-3 w-3" />;
      default: return <Bell className="h-3 w-3" />;
    }
  };

  const getNotificationColor = (type: SmartNotification['type']) => {
    switch (type) {
      case 'prayer': return 'border-green-300 bg-green-100';
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'reminder': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <Bell className="h-5 w-5" />
            Smart Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BellRing className="h-12 w-12 mx-auto mb-4 text-black opacity-50" />
          <p className="text-black">All caught up! No new notifications.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} min-h-[400px]`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-3 text-black text-lg">
          <Bell className="h-6 w-6" />
          Smart Notifications
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-sm px-2 py-1">{notifications.length}</Badge>
          )}
        </CardTitle>
        {notifications.length > 8 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-sm"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
        {notifications.map((notification) => (
          <Card key={notification.id} className={`${getNotificationColor(notification.type)} border`}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(notification.category)}
                        {notification.category}
                      </div>
                    </Badge>
                  </div>
                  <p className="text-sm text-black mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    {notification.action ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => window.location.href = notification.action!.path}
                      >
                        {notification.action.text}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    ) : (
                      <div></div>
                    )}
                    <span className="text-xs text-black">
                      {notification.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="h-6 w-6 p-0 text-black hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}