'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Lightbulb,
  ArrowRight,
  Calendar,
  Mail,
  DollarSign,
  Camera,
  MessageSquare,
  Zap
} from 'lucide-react';

interface SmartInsight {
  id: string;
  type: 'suggestion' | 'alert' | 'achievement' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: {
    text: string;
    path: string;
  };
  icon: React.ReactNode;
  timestamp: Date;
  data?: any;
}

interface SmartInsightsProps {
  dashboardData: any;
  weeklyStats: any;
  className?: string;
}

export default function SmartInsights({ dashboardData, weeklyStats, className = '' }: SmartInsightsProps) {
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate AI-powered insights based on user data
  const generateInsights = async () => {
    setIsGenerating(true);
    
    const newInsights: SmartInsight[] = [];
    
    try {
      // Calendar insights
      if (dashboardData.todayEvents?.length > 0) {
        const upcomingEvents = dashboardData.todayEvents.filter((event: any) => {
          const eventTime = new Date(event.start?.dateTime || event.start?.date);
          return eventTime > new Date();
        });
        
        if (upcomingEvents.length > 0) {
          newInsights.push({
            id: 'upcoming-events',
            type: 'alert',
            priority: 'high',
            title: 'Upcoming Events Today',
            description: `You have ${upcomingEvents.length} events coming up. Next: ${upcomingEvents[0]?.summary}`,
            action: { text: 'View Calendar', path: '/calendar' },
            icon: <Calendar className="h-4 w-4" />,
            timestamp: new Date()
          });
        }
      }

      // Email insights
      if (dashboardData.unreadEmails > 0) {
        const urgency = dashboardData.unreadEmails > 10 ? 'high' : 'medium';
        newInsights.push({
          id: 'unread-emails',
          type: dashboardData.unreadEmails > 20 ? 'alert' : 'suggestion',
          priority: urgency,
          title: 'Unread Emails',
          description: `${dashboardData.unreadEmails} unread emails. ${urgency === 'high' ? 'Consider clearing your inbox.' : 'Stay on top of communications.'}`,
          action: { text: 'Check Email', path: '/email' },
          icon: <Mail className="h-4 w-4" />,
          timestamp: new Date()
        });
      }

      // Expense insights
      if (dashboardData.todayExpenses?.length > 0) {
        const todayTotal = dashboardData.todayExpenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
        if (todayTotal > 100) {
          newInsights.push({
            id: 'high-spending',
            type: 'alert',
            priority: 'medium',
            title: 'High Spending Today',
            description: `You've spent $${todayTotal.toFixed(2)} today. Consider reviewing your expenses.`,
            action: { text: 'View Expenses', path: '/expenses' },
            icon: <DollarSign className="h-4 w-4" />,
            timestamp: new Date(),
            data: { amount: todayTotal }
          });
        }
      }

      // Productivity insights
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 11 && weeklyStats.peakHours === '9-11 AM') {
        newInsights.push({
          id: 'peak-productivity',
          type: 'optimization',
          priority: 'medium',
          title: 'Peak Productivity Time',
          description: 'You\'re in your most productive hours. Consider tackling important tasks now.',
          icon: <Zap className="h-4 w-4" />,
          timestamp: new Date()
        });
      }

      // Weekly achievements
      if (weeklyStats.tasksCompleted > 0) {
        const completionRate = (weeklyStats.tasksCompleted / weeklyStats.totalTasks) * 100;
        if (completionRate >= 80) {
          newInsights.push({
            id: 'high-completion',
            type: 'achievement',
            priority: 'low',
            title: 'Great Progress!',
            description: `${completionRate.toFixed(0)}% task completion rate this week. Keep it up!`,
            icon: <CheckCircle className="h-4 w-4" />,
            timestamp: new Date(),
            data: { rate: completionRate }
          });
        }
      }

      // Smart suggestions
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 1) { // Monday
        newInsights.push({
          id: 'week-planning',
          type: 'suggestion',
          priority: 'medium',
          title: 'Plan Your Week',
          description: 'Start strong! Review your calendar and set priorities for the week.',
          action: { text: 'Open Calendar', path: '/calendar' },
          icon: <Target className="h-4 w-4" />,
          timestamp: new Date()
        });
      }

      // Time-based suggestions
      if (currentHour >= 17 && currentHour <= 19) {
        newInsights.push({
          id: 'daily-review',
          type: 'suggestion',
          priority: 'low',
          title: 'Daily Reflection',
          description: 'End your day with a journal entry. Reflect on your accomplishments.',
          action: { text: 'Write Entry', path: '/diary' },
          icon: <Lightbulb className="h-4 w-4" />,
          timestamp: new Date()
        });
      }

      // Sort insights by priority and timestamp
      const sortedInsights = newInsights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setInsights(sortedInsights.slice(0, 5)); // Show top 5 insights
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, [dashboardData, weeklyStats]);

  const getInsightIcon = (type: SmartInsight['type']) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'achievement': return <CheckCircle className="h-4 w-4" />;
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: SmartInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getTypeColor = (type: SmartInsight['type']) => {
    switch (type) {
      case 'alert': return 'text-red-600';
      case 'achievement': return 'text-green-600';
      case 'optimization': return 'text-blue-600';
      default: return 'text-purple-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-black">AI Insights</CardTitle>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateInsights}
          disabled={isGenerating}
        >
          {isGenerating ? 'Analyzing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-black">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analyzing your data for insights...</p>
          </div>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id} className={`${getPriorityColor(insight.priority)} border`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`${getTypeColor(insight.type)} mt-1`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-black">{insight.title}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getTypeColor(insight.type)}`}
                      >
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-black mb-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => window.location.href = insight.action!.path}
                      >
                        {insight.action.text}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}