'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Calendar,
  Mail,
  File,
  Bell,
  Target,
  BarChart3,
  PieChart,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { WorkflowRule, WorkflowExecution, workflowEngine } from '@/lib/workflowEngine';
import { workflowIntegrations } from '@/lib/workflowIntegrations';

interface WorkflowStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  executionsToday: number;
  executionsThisWeek: number;
  topTriggerTypes: { type: string; count: number }[];
  recentActivity: WorkflowExecution[];
}

interface WorkflowDashboardProps {
  onRefresh?: () => void;
}

export default function WorkflowDashboard({ onRefresh }: WorkflowDashboardProps) {
  const [stats, setStats] = useState<WorkflowStats>({
    totalRules: 0,
    activeRules: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
    avgExecutionTime: 0,
    executionsToday: 0,
    executionsThisWeek: 0,
    topTriggerTypes: [],
    recentActivity: []
  });
  
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [engineStatus, setEngineStatus] = useState<'running' | 'stopped'>('running');

  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(loadDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const rulesData = workflowEngine.getRules();
      const executionsData = workflowEngine.getExecutions();
      
      setRules(rulesData);
      setExecutions(executionsData);
      
      const calculatedStats = calculateStats(rulesData, executionsData);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const calculateStats = (rules: WorkflowRule[], executions: WorkflowExecution[]): WorkflowStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.enabled).length;
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Calculate average execution time
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.endTime);
    const avgExecutionTime = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum, e) => {
          const duration = e.endTime!.getTime() - e.startTime.getTime();
          return sum + duration;
        }, 0) / completedExecutions.length / 1000 // Convert to seconds
      : 0;

    const executionsToday = executions.filter(e => e.startTime >= today).length;
    const executionsThisWeek = executions.filter(e => e.startTime >= weekAgo).length;

    // Calculate top trigger types
    const triggerTypeCounts: Record<string, number> = {};
    rules.forEach(rule => {
      triggerTypeCounts[rule.trigger.type] = (triggerTypeCounts[rule.trigger.type] || 0) + rule.executionCount;
    });

    const topTriggerTypes = Object.entries(triggerTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const recentActivity = executions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 10);

    return {
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      avgExecutionTime,
      executionsToday,
      executionsThisWeek,
      topTriggerTypes,
      recentActivity
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboardData();
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleEngineStatus = () => {
    if (engineStatus === 'running') {
      workflowEngine.stop();
      setEngineStatus('stopped');
    } else {
      workflowEngine.start();
      setEngineStatus('running');
    }
  };

  const triggerManualTests = async () => {
    try {
      // Trigger some test events
      await workflowIntegrations.triggerEmailCheck();
      await workflowIntegrations.triggerFreeTimeCheck();
      
      // Refresh data after tests
      setTimeout(loadDashboardData, 2000);
    } catch (error) {
      console.error('Failed to trigger manual tests:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      case 'time':
        return <Clock className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Workflow Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage your automation workflows
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={engineStatus === 'running' ? 'default' : 'secondary'}>
            {engineStatus === 'running' ? (
              <>
                <Activity className="h-3 w-3 mr-1" />
                Running
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Stopped
              </>
            )}
          </Badge>
          
          <Button
            onClick={toggleEngineStatus}
            variant="outline"
            size="sm"
          >
            {engineStatus === 'running' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Engine
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Engine
              </>
            )}
          </Button>
          
          <Button
            onClick={triggerManualTests}
            variant="outline"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Test Triggers
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.activeRules} active
                </p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{Math.round(stats.successRate)}%</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stats.successRate > 80 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  {stats.successfulExecutions}/{stats.totalExecutions}
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executions Today</p>
                <p className="text-2xl font-bold">{stats.executionsToday}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.executionsThisWeek} this week
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {stats.avgExecutionTime > 0 ? 
                    `${Math.round(stats.avgExecutionTime)}s` : 
                    '0s'
                  }
                </p>
                <p className="text-xs text-muted-foreground">per execution</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Trigger Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top Trigger Types
            </CardTitle>
            <CardDescription>
              Most frequently used automation triggers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topTriggerTypes.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No execution data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topTriggerTypes.map((trigger, index) => (
                  <div key={trigger.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(trigger.type)}
                        <span className="font-medium capitalize">{trigger.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress 
                          value={stats.totalExecutions > 0 ? (trigger.count / stats.totalExecutions) * 100 : 0} 
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{trigger.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest workflow executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((execution) => {
                  const rule = rules.find(r => r.id === execution.ruleId);
                  const duration = execution.endTime ? 
                    execution.endTime.getTime() - execution.startTime.getTime() : 0;
                  
                  return (
                    <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(execution.status)}
                        <div>
                          <p className="font-medium text-sm">
                            {rule?.name || 'Unknown Rule'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {execution.startTime.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            execution.status === 'completed' ? 'default' :
                            execution.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {execution.status}
                        </Badge>
                        {duration > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rule Performance
          </CardTitle>
          <CardDescription>
            Performance metrics for your automation rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No rules configured yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.slice(0, 5).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getTriggerIcon(rule.trigger.type)}
                      <div>
                        <p className="font-medium text-sm">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{rule.trigger.type} trigger</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">{rule.executionCount}</p>
                      <p className="text-xs text-muted-foreground">executions</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {rule.executionCount > 0 ? 
                          Math.round((rule.successCount / rule.executionCount) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">success</p>
                    </div>
                    
                    <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
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