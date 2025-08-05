'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap,
  Calendar,
  Mail,
  PlusCircle,
  DollarSign,
  BookOpen,
  Camera,
  MessageSquare,
  Clock,
  Target,
  FileText,
  Users,
  Settings,
  TrendingUp,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  category: 'create' | 'view' | 'manage' | 'analyze';
  priority: 'high' | 'medium' | 'low';
  smartSuggestion?: boolean;
  timeContext?: string;
}

interface SmartQuickActionsProps {
  dashboardData: any;
  weeklyStats: any;
  className?: string;
}

export default function SmartQuickActions({ 
  dashboardData, 
  weeklyStats, 
  className = '' 
}: SmartQuickActionsProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const generateSmartActions = (): QuickAction[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();
    
    const baseActions: QuickAction[] = [
      // Create actions
      {
        id: 'create-event',
        title: 'Schedule Meeting',
        description: 'Add new calendar event',
        path: '/calendar',
        icon: <Calendar className="h-4 w-4" />,
        color: 'text-blue-600 bg-blue-50',
        category: 'create',
        priority: 'high'
      },
      {
        id: 'compose-email',
        title: 'Compose Email',
        description: 'Write new email',
        path: '/email',
        icon: <Mail className="h-4 w-4" />,
        color: 'text-green-600 bg-green-50',
        category: 'create',
        priority: 'medium'
      },
      {
        id: 'add-expense',
        title: 'Log Expense',
        description: 'Record new expense',
        path: '/expenses',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-yellow-600 bg-yellow-50',
        category: 'create',
        priority: 'medium'
      },
      {
        id: 'journal-entry',
        title: 'Write Journal',
        description: 'Add diary entry',
        path: '/diary',
        icon: <BookOpen className="h-4 w-4" />,
        color: 'text-purple-600 bg-purple-50',
        category: 'create',
        priority: 'low'
      },
      {
        id: 'upload-photo',
        title: 'Add Photos',
        description: 'Upload to Google Drive',
        path: '/photos',
        icon: <Camera className="h-4 w-4" />,
        color: 'text-pink-600 bg-pink-50',
        category: 'create',
        priority: 'low'
      },

      // View actions
      {
        id: 'view-calendar',
        title: 'Today\'s Schedule',
        description: `${dashboardData.todayEvents?.length || 0} events today`,
        path: '/calendar',
        icon: <Clock className="h-4 w-4" />,
        color: 'text-indigo-600 bg-indigo-50',
        category: 'view',
        priority: 'high'
      },
      {
        id: 'check-inbox',
        title: 'Check Inbox',
        description: `${dashboardData.unreadEmails || 0} unread emails`,
        path: '/email',
        icon: <Mail className="h-4 w-4" />,
        color: 'text-green-600 bg-green-50',
        category: 'view',
        priority: dashboardData.unreadEmails > 0 ? 'high' : 'medium'
      },
      {
        id: 'review-expenses',
        title: 'Review Spending',
        description: 'Check expense reports',
        path: '/expenses',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-orange-600 bg-orange-50',
        category: 'analyze',
        priority: 'medium'
      },

      // Manage actions
      {
        id: 'voice-assistant',
        title: 'Voice Assistant',
        description: 'Talk to AI assistant',
        path: '/voice-assistant',
        icon: <MessageSquare className="h-4 w-4" />,
        color: 'text-cyan-600 bg-cyan-50',
        category: 'manage',
        priority: 'medium'
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'Manage preferences',
        path: '/settings',
        icon: <Settings className="h-4 w-4" />,
        color: 'text-gray-600 bg-gray-50',
        category: 'manage',
        priority: 'low'
      }
    ];

    // Add smart suggestions based on context
    const smartActions: QuickAction[] = [];

    // Morning suggestions (6 AM - 10 AM)
    if (currentHour >= 6 && currentHour <= 10) {
      if (dashboardData.todayEvents?.length > 0) {
        smartActions.push({
          id: 'morning-review',
          title: 'Morning Review',
          description: 'Review today\'s schedule',
          path: '/calendar',
          icon: <Lightbulb className="h-4 w-4" />,
          color: 'text-amber-600 bg-amber-50',
          category: 'view',
          priority: 'high',
          smartSuggestion: true,
          timeContext: 'Good morning!'
        });
      }
    }

    // Afternoon productivity (1 PM - 3 PM)
    if (currentHour >= 13 && currentHour <= 15) {
      smartActions.push({
        id: 'afternoon-focus',
        title: 'Focus Session',
        description: 'Review priorities',
        path: '/think-tool',
        icon: <Target className="h-4 w-4" />,
        color: 'text-violet-600 bg-violet-50',
        category: 'analyze',
        priority: 'high',
        smartSuggestion: true,
        timeContext: 'Peak productivity time'
      });
    }

    // Evening reflection (5 PM - 8 PM)
    if (currentHour >= 17 && currentHour <= 20) {
      smartActions.push({
        id: 'evening-journal',
        title: 'Daily Reflection',
        description: 'Write about your day',
        path: '/diary',
        icon: <BookOpen className="h-4 w-4" />,
        color: 'text-purple-600 bg-purple-50',
        category: 'create',
        priority: 'medium',
        smartSuggestion: true,
        timeContext: 'End of day reflection'
      });
    }

    // Monday planning
    if (dayOfWeek === 1 && currentHour >= 8 && currentHour <= 11) {
      smartActions.push({
        id: 'week-planning',
        title: 'Plan Your Week',
        description: 'Set weekly goals',
        path: '/calendar',
        icon: <Target className="h-4 w-4" />,
        color: 'text-blue-700 bg-blue-100',
        category: 'manage',
        priority: 'high',
        smartSuggestion: true,
        timeContext: 'Monday motivation'
      });
    }

    // High unread emails suggestion
    if (dashboardData.unreadEmails > 10) {
      smartActions.push({
        id: 'inbox-cleanup',
        title: 'Inbox Cleanup',
        description: 'Clear unread emails',
        path: '/email',
        icon: <Mail className="h-4 w-4" />,
        color: 'text-red-600 bg-red-50',
        category: 'manage',
        priority: 'high',
        smartSuggestion: true,
        timeContext: 'High email volume'
      });
    }

    // Expense tracking reminder
    if (dashboardData.todayExpenses?.length === 0 && currentHour >= 18) {
      smartActions.push({
        id: 'expense-reminder',
        title: 'Log Today\'s Expenses',
        description: 'Don\'t forget to track spending',
        path: '/expenses',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-yellow-700 bg-yellow-100',
        category: 'create',
        priority: 'medium',
        smartSuggestion: true,
        timeContext: 'Daily expense tracking'
      });
    }

    // Combine and sort actions
    const allActions = [...baseActions, ...smartActions];
    
    return allActions.sort((a, b) => {
      // Smart suggestions first
      if (a.smartSuggestion && !b.smartSuggestion) return -1;
      if (!a.smartSuggestion && b.smartSuggestion) return 1;
      
      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const [actions, setActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    setActions(generateSmartActions());
  }, [dashboardData, weeklyStats]);

  const categories = [
    { id: 'all', label: 'All Actions', count: actions.length },
    { id: 'create', label: 'Create', count: actions.filter(a => a.category === 'create').length },
    { id: 'view', label: 'View', count: actions.filter(a => a.category === 'view').length },
    { id: 'manage', label: 'Manage', count: actions.filter(a => a.category === 'manage').length },
    { id: 'analyze', label: 'Analyze', count: actions.filter(a => a.category === 'analyze').length }
  ];

  const filteredActions = selectedCategory === 'all' 
    ? actions 
    : actions.filter(action => action.category === selectedCategory);

  const handleActionClick = (path: string) => {
    router.push(path);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-black">
          <Zap className="h-5 w-5 text-amber-500" />
          Smart Quick Actions
        </CardTitle>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="text-xs"
            >
              {category.label}
              {category.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {category.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActions.slice(0, 9).map((action) => (
            <Card 
              key={action.id} 
              className={`cursor-pointer hover:shadow-md transition-all border ${
                action.smartSuggestion ? 'ring-2 ring-amber-200 border-amber-300' : ''
              }`}
              onClick={() => handleActionClick(action.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-black">{action.title}</h4>
                        <p className="text-xs text-black mb-2">
                          {action.description}
                        </p>
                        {action.timeContext && (
                          <Badge variant="outline" className="text-xs">
                            {action.timeContext}
                          </Badge>
                        )}
                      </div>
                      {action.smartSuggestion && (
                        <div className="flex-shrink-0">
                          <Badge className="text-xs bg-amber-100 text-amber-800">
                            Smart
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredActions.length > 9 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              Show More Actions
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}