import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

// Mock notification storage (in production, this would use a database)
let notifications: any[] = [];
const vipContacts: any[] = [];

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filteredNotifications = [...notifications];
    
    // Apply filters
    if (filter === 'unread') {
      filteredNotifications = notifications.filter(n => n.status === 'delivered');
    } else if (filter === 'priority') {
      filteredNotifications = notifications.filter(n => ['critical', 'high'].includes(n.priority));
    } else if (filter === 'contextual') {
      filteredNotifications = notifications.filter(n => ['traffic', 'weather', 'calendar'].includes(n.type));
    }
    
    // Sort by timestamp (newest first) and limit
    filteredNotifications = filteredNotifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        notifications: filteredNotifications,
        total: filteredNotifications.length,
        unreadCount: notifications.filter(n => n.status === 'delivered').length
      }
    });
    
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch notifications'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    const body = await request.json();
    const { action, notificationId, data } = body;
    
    switch (action) {
      case 'create':
        return await handleCreateNotification(data);
      
      case 'dismiss':
        return await handleDismissNotification(notificationId);
      
      case 'snooze':
        return await handleSnoozeNotification(notificationId, data?.minutes || 15);
      
      case 'test':
        return await handleTestNotification(data);
      
      case 'markAllRead':
        return await handleMarkAllRead();
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('Notifications POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process notification action'
      },
      { status: 500 }
    );
  }
}

async function handleCreateNotification(data: any): Promise<NextResponse> {
  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: data.type || 'system',
    priority: data.priority || 'medium',
    title: data.title || 'New Notification',
    message: data.message || '',
    timestamp: new Date().toISOString(),
    status: 'delivered',
    vipLevel: data.vipLevel || 'none',
    context: data.context || {
      source: 'api',
      category: 'system',
      urgency: 5,
      isTimesensitive: false
    },
    metadata: data.metadata || {},
    actions: data.actions || []
  };
  
  notifications.unshift(notification);
  
  // Keep only last 1000 notifications
  if (notifications.length > 1000) {
    notifications = notifications.slice(0, 1000);
  }
  
  return NextResponse.json({
    success: true,
    data: notification,
    message: 'Notification created successfully'
  });
}

async function handleDismissNotification(notificationId: string): Promise<NextResponse> {
  const notification = notifications.find(n => n.id === notificationId);
  
  if (!notification) {
    return NextResponse.json(
      { success: false, message: 'Notification not found' },
      { status: 404 }
    );
  }
  
  notification.status = 'dismissed';
  
  return NextResponse.json({
    success: true,
    message: 'Notification dismissed'
  });
}

async function handleSnoozeNotification(notificationId: string, minutes: number): Promise<NextResponse> {
  const notification = notifications.find(n => n.id === notificationId);
  
  if (!notification) {
    return NextResponse.json(
      { success: false, message: 'Notification not found' },
      { status: 404 }
    );
  }
  
  notification.status = 'snoozed';
  notification.scheduledFor = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  
  // Simulate re-delivery after snooze period
  setTimeout(() => {
    if (notification.status === 'snoozed') {
      notification.status = 'delivered';
      notification.timestamp = new Date().toISOString();
    }
  }, minutes * 60 * 1000);
  
  return NextResponse.json({
    success: true,
    message: `Notification snoozed for ${minutes} minutes`
  });
}

async function handleTestNotification(data: any): Promise<NextResponse> {
  const testNotifications = {
    critical: {
      type: 'system',
      priority: 'critical',
      title: '🚨 Critical System Alert',
      message: 'This is a test critical notification. High priority alerts like this bypass Do Not Disturb.',
      vipLevel: 'emergency'
    },
    high: {
      type: 'email',
      priority: 'high',
      title: '📧 Important Email from Boss',
      message: 'New email from your manager requires immediate attention.',
      vipLevel: 'vip'
    },
    medium: {
      type: 'calendar',
      priority: 'medium', 
      title: '📅 Meeting Reminder',
      message: 'Team standup meeting starts in 15 minutes.',
      vipLevel: 'none'
    },
    low: {
      type: 'system',
      priority: 'low',
      title: '💬 System Update',
      message: 'Background sync completed successfully.',
      vipLevel: 'none'
    },
    traffic: {
      type: 'traffic',
      priority: 'high',
      title: '🚗 Traffic Alert',
      message: 'Heavy traffic detected on your route. Leave 15 minutes early.',
      vipLevel: 'none',
      actions: [
        {
          id: 'navigate',
          label: 'Get Directions',
          action: 'navigate'
        }
      ]
    },
    weather: {
      type: 'weather',
      priority: 'medium',
      title: '🌦️ Weather Alert',
      message: 'Rain expected in the next hour. Consider bringing an umbrella.',
      vipLevel: 'none'
    }
  };
  
  const testType = data?.type || 'medium';
  const testData = testNotifications[testType as keyof typeof testNotifications] || testNotifications.medium;
  
  return await handleCreateNotification(testData);
}

async function handleMarkAllRead(): Promise<NextResponse> {
  const unreadCount = notifications.filter(n => n.status === 'delivered').length;
  
  notifications.forEach(notification => {
    if (notification.status === 'delivered') {
      notification.status = 'dismissed';
    }
  });
  
  return NextResponse.json({
    success: true,
    message: `Marked ${unreadCount} notifications as read`
  });
}

// VIP Contacts endpoints
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    const body = await request.json();
    const { action, contactData, contactId } = body;
    
    if (action === 'addVip') {
      const vipContact = {
        id: contactData.email,
        ...contactData,
        createdAt: new Date().toISOString()
      };
      
      vipContacts.push(vipContact);
      
      return NextResponse.json({
        success: true,
        data: vipContact,
        message: 'VIP contact added successfully'
      });
    }
    
    if (action === 'removeVip') {
      const index = vipContacts.findIndex(c => c.id === contactId);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: 'VIP contact not found' },
          { status: 404 }
        );
      }
      
      vipContacts.splice(index, 1);
      
      return NextResponse.json({
        success: true,
        message: 'VIP contact removed successfully'
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Generate demo notifications for testing
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    // Create demo notifications
    const demoNotifications = [
      {
        type: 'email',
        priority: 'high',
        title: '📧 Urgent: Budget Review',
        message: 'Please review the Q4 budget proposal before the meeting.',
        vipLevel: 'vip',
        metadata: { fromEmail: 'boss@company.com' }
      },
      {
        type: 'calendar',
        priority: 'medium',
        title: '📅 Meeting in 30 minutes',
        message: 'Project sync with development team',
        actions: [
          { id: 'join', label: 'Join Meeting', action: 'custom' }
        ]
      },
      {
        type: 'traffic',
        priority: 'high',
        title: '🚗 Heavy Traffic Alert',
        message: 'Traffic is heavy to Downtown Office. Leave 20 minutes early.',
        actions: [
          { id: 'navigate', label: 'Get Directions', action: 'navigate' }
        ]
      },
      {
        type: 'weather',
        priority: 'medium',
        title: '🌧️ Rain Expected',
        message: 'Heavy rain starting in 45 minutes. Consider indoor lunch plans.'
      },
      {
        type: 'contact',
        priority: 'medium',
        title: '📞 Missed Call',
        message: 'Sarah Johnson called regarding the presentation.',
        actions: [
          { id: 'call', label: 'Call Back', action: 'call' }
        ]
      }
    ];
    
    // Add demo notifications with staggered timestamps
    demoNotifications.forEach((notif, index) => {
      const notification = {
        id: `demo_${Date.now()}_${index}`,
        ...notif,
        timestamp: new Date(Date.now() - index * 15 * 60 * 1000).toISOString(), // 15 mins apart
        status: 'delivered',
        context: {
          source: 'demo',
          category: 'test',
          urgency: notif.priority === 'high' ? 8 : 5,
          isTimesensitive: notif.type === 'calendar' || notif.type === 'traffic'
        },
        metadata: notif.metadata || {}
      };
      
      notifications.unshift(notification);
    });
    
    return NextResponse.json({
      success: true,
      data: { created: demoNotifications.length },
      message: 'Demo notifications created successfully'
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}