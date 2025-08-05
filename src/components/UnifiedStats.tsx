'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Mail,
  DollarSign,
  BookOpen,
  Camera,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  Users,
  Activity
} from 'lucide-react';

interface UnifiedStatsProps {
  dashboardData: any;
  weeklyStats: any;
  socialMediaStats: any;
  className?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  progress?: number;
  goal?: number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export default function UnifiedStats({ 
  dashboardData, 
  weeklyStats, 
  socialMediaStats, 
  className = '' 
}: UnifiedStatsProps) {
  
  const getTrendIcon = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'decrease': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const formatChange = (change?: number) => {
    if (!change) return '';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  // Calculate completion rates and trends
  const emailResponseRate = dashboardData.totalEmails > 0 
    ? Math.round(((dashboardData.totalEmails - dashboardData.unreadEmails) / dashboardData.totalEmails) * 100)
    : 100;

  const taskCompletionRate = weeklyStats.totalTasks > 0
    ? Math.round((weeklyStats.tasksCompleted / weeklyStats.totalTasks) * 100)
    : 0;

  const budgetUsage = weeklyStats.expenseBudgetGoal > 0
    ? Math.round((weeklyStats.expenseBudget / weeklyStats.expenseBudgetGoal) * 100)
    : 0;

  const stats: StatCard[] = [
    {
      title: 'Today\'s Events',
      value: dashboardData.todayEvents?.length || 0,
      change: 15,
      changeType: 'increase',
      icon: <Calendar className="h-4 w-4" />,
      color: 'text-blue-600',
      description: 'Scheduled for today'
    },
    {
      title: 'Email Inbox',
      value: dashboardData.unreadEmails || 0,
      change: -12,
      changeType: 'decrease',
      progress: emailResponseRate,
      icon: <Mail className="h-4 w-4" />,
      color: 'text-green-600',
      description: `${emailResponseRate}% response rate`
    },
    {
      title: 'Today\'s Expenses',
      value: `$${dashboardData.todayExpenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0).toFixed(2) || '0.00'}`,
      change: 8,
      changeType: 'increase',
      progress: budgetUsage,
      goal: weeklyStats.expenseBudgetGoal,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-yellow-600',
      description: `${budgetUsage}% of budget used`
    },
    {
      title: 'Task Progress',
      value: `${weeklyStats.tasksCompleted}/${weeklyStats.totalTasks}`,
      progress: taskCompletionRate,
      changeType: taskCompletionRate >= 80 ? 'increase' : taskCompletionRate >= 50 ? 'neutral' : 'decrease',
      icon: <Target className="h-4 w-4" />,
      color: 'text-purple-600',
      description: `${taskCompletionRate}% completed`
    },
    {
      title: 'Journal Entries',
      value: weeklyStats.diaryEntries || 0,
      progress: Math.round(((weeklyStats.diaryEntries || 0) / weeklyStats.diaryEntriesGoal) * 100),
      goal: weeklyStats.diaryEntriesGoal,
      icon: <BookOpen className="h-4 w-4" />,
      color: 'text-indigo-600',
      description: 'This month'
    },
    {
      title: 'Photos Stored',
      value: '24',
      change: 20,
      changeType: 'increase',
      icon: <Camera className="h-4 w-4" />,
      color: 'text-pink-600',
      description: 'In Google Drive'
    }
  ];

  // Add social media stats if available
  if (socialMediaStats.facebook) {
    stats.push({
      title: 'Facebook Reach',
      value: socialMediaStats.facebook.followers,
      change: 5,
      changeType: 'increase',
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-700',
      description: `${socialMediaStats.facebook.posts} posts`
    });
  }

  if (socialMediaStats.youtube) {
    stats.push({
      title: 'YouTube Growth',
      value: socialMediaStats.youtube.subscribers,
      change: 12,
      changeType: 'increase',
      icon: <Activity className="h-4 w-4" />,
      color: 'text-red-600',
      description: `${socialMediaStats.youtube.videos} videos`
    });
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.color} bg-opacity-10 p-2 rounded-lg`}>
                <div className={stat.color}>
                  {stat.icon}
                </div>
              </div>
              {stat.change !== undefined && (
                <div className="flex items-center gap-1">
                  {getTrendIcon(stat.changeType)}
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 
                    stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formatChange(stat.change)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium text-black">{stat.title}</h3>
                <p className="text-2xl font-bold text-black">{stat.value}</p>
              </div>
              
              {stat.progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={stat.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-black">
                    <span>{stat.description}</span>
                    {stat.goal && <span>Goal: {stat.goal}</span>}
                  </div>
                </div>
              )}
              
              {stat.progress === undefined && (
                <p className="text-xs text-black">{stat.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}