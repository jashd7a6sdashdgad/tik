'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Copy,
  Edit,
  Eye,
  Calendar,
  Mail,
  File,
  Clock,
  MapPin,
  Webhook,
  Bell,
  Send,
  FolderOpen,
  Phone,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  Filter,
  Search,
  BarChart3,
  Brain,
  Sparkles,
  Target,
  Workflow
} from 'lucide-react';
import { workflowEngine, WorkflowRule, WorkflowExecution, WorkflowTemplate, TriggerCondition, WorkflowAction } from '@/lib/workflowEngine';
import WorkflowDashboard from '@/components/WorkflowDashboard';

export default function WorkflowsPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedRule, setSelectedRule] = useState<WorkflowRule | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [viewMode, setViewMode] = useState<'rules' | 'executions' | 'analytics'>('rules');

  // Rule builder state
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    enabled: true,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    tags: [] as string[],
    trigger: {
      type: 'email' as 'email' | 'calendar' | 'file' | 'time' | 'location' | 'webhook' | 'manual',
      name: '',
      description: '',
      conditions: [] as TriggerCondition[],
      enabled: true,
      triggerCount: 0
    },
    actions: [] as Omit<WorkflowAction, 'id'>[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRules(workflowEngine.getRules());
    setExecutions(workflowEngine.getExecutions());
    setTemplates(workflowEngine.getTemplates());
  };

  const createRule = async () => {
    try {
      setIsCreating(true);
      
      const rule = await workflowEngine.createRule({
        ...newRule,
        trigger: {
          ...newRule.trigger,
          id: `trigger_${Date.now()}`
        },
        actions: newRule.actions.map(action => ({
          ...action,
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }))
      });

      setRules(workflowEngine.getRules());
      setShowRuleBuilder(false);
      resetRuleBuilder();
      
      console.log('✅ Workflow rule created:', rule.name);
    } catch (error) {
      console.error('Failed to create rule:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      await workflowEngine.updateRule(ruleId, { enabled: !rule.enabled });
      setRules(workflowEngine.getRules());
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this workflow rule?')) {
      await workflowEngine.deleteRule(ruleId);
      setRules(workflowEngine.getRules());
    }
  };

  const executeRule = async (ruleId: string) => {
    try {
      await workflowEngine.executeRule(ruleId, { manual: true, timestamp: new Date() });
      setExecutions(workflowEngine.getExecutions());
      console.log('✅ Rule executed manually');
    } catch (error) {
      console.error('Failed to execute rule:', error);
    }
  };

  const createFromTemplate = (template: WorkflowTemplate) => {
    setNewRule({
      ...template.template,
      name: template.template.name,
      description: template.template.description,
      enabled: template.template.enabled,
      priority: template.template.priority,
      tags: template.template.tags,
      trigger: {
        ...template.template.trigger
      },
      actions: template.template.actions.map(action => ({
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      }))
    });
    setShowTemplates(false);
    setShowRuleBuilder(true);
  };

  const resetRuleBuilder = () => {
    setNewRule({
      name: '',
      description: '',
      enabled: true,
      priority: 'medium',
      tags: [],
      trigger: {
        type: 'email',
        name: '',
        description: '',
        conditions: [],
        enabled: true,
        triggerCount: 0
      },
      actions: []
    });
  };

  const addCondition = () => {
    setNewRule(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: [...prev.trigger.conditions, {
          field: '',
          operator: 'equals',
          value: ''
        }]
      }
    }));
  };

  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setNewRule(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: prev.trigger.conditions.map((condition, i) => 
          i === index ? { ...condition, ...updates } : condition
        )
      }
    }));
  };

  const removeCondition = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: prev.trigger.conditions.filter((_, i) => i !== index)
      }
    }));
  };

  const addAction = () => {
    setNewRule(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'notification',
        name: '',
        description: '',
        parameters: {},
        enabled: true
      }]
    }));
  };

  const updateAction = (index: number, updates: Partial<Omit<WorkflowAction, 'id'>>) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, ...updates } : action
      )
    }));
  };

  const removeAction = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = !searchTerm || 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'enabled' && rule.enabled) ||
      (filterStatus === 'disabled' && !rule.enabled);
    
    return matchesSearch && matchesFilter;
  });

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'file': return <File className="h-4 w-4" />;
      case 'time': return <Clock className="h-4 w-4" />;
      case 'location': return <MapPin className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'manual': return <Play className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'email': return <Send className="h-4 w-4" />;
      case 'file_operation': return <FolderOpen className="h-4 w-4" />;
      case 'api_call': return <Webhook className="h-4 w-4" />;
      case 'task_creation': return <Plus className="h-4 w-4" />;
      case 'calendar_event': return <Calendar className="h-4 w-4" />;
      case 'backup': return <Copy className="h-4 w-4" />;
      case 'reminder': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Workflow className="h-6 w-6" />
                Workflow Automation
              </h1>
              <p className="text-muted-foreground">Create intelligent rules to automate your tasks</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode('rules')}
                variant={viewMode === 'rules' ? 'secondary' : 'outline'}
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Rules
              </Button>
              <Button
                onClick={() => setViewMode('executions')}
                variant={viewMode === 'executions' ? 'secondary' : 'outline'}
                size="sm"
              >
                <Activity className="h-4 w-4 mr-2" />
                Executions
              </Button>
              <Button
                onClick={() => setViewMode('analytics')}
                variant={viewMode === 'analytics' ? 'secondary' : 'outline'}
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button onClick={() => setShowTemplates(true)} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button onClick={() => setShowRuleBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'rules' && (
          <>
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search workflow rules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rules</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Rules */}
            <div className="space-y-4">
              {filteredRules.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Workflow Rules</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first automation rule to get started
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowRuleBuilder(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                      <Button onClick={() => setShowTemplates(true)} variant="outline">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredRules.map((rule) => (
                  <Card key={rule.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${getPriorityColor(rule.priority)} text-white`}>
                              {getTriggerIcon(rule.trigger.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{rule.name}</h3>
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            </div>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => toggleRule(rule.id)}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">
                              {getTriggerIcon(rule.trigger.type)}
                              <span className="ml-1 capitalize">{rule.trigger.type}</span>
                            </Badge>
                            <Badge variant="outline">
                              {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline" className={`text-white ${getPriorityColor(rule.priority)}`}>
                              {rule.priority}
                            </Badge>
                            {rule.tags.map(tag => (
                              <Badge key={tag} variant="secondary">#{tag}</Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Executed: {rule.executionCount} times</span>
                            <span>Success: {rule.successCount}</span>
                            <span>Failed: {rule.failureCount}</span>
                            {rule.lastExecuted && (
                              <span>Last: {rule.lastExecuted.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => executeRule(rule.id)}
                            disabled={!rule.enabled}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRule(rule)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Edit rule functionality
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRule(rule.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {viewMode === 'executions' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>History of workflow rule executions</CardDescription>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No executions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.slice(0, 20).map((execution) => {
                      const rule = rules.find(r => r.id === execution.ruleId);
                      return (
                        <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(execution.status)}
                            <div>
                              <p className="font-medium">{rule?.name || 'Unknown Rule'}</p>
                              <p className="text-sm text-muted-foreground">
                                {execution.startTime.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={execution.status === 'completed' ? 'default' : 
                                          execution.status === 'failed' ? 'destructive' : 'secondary'}>
                              {execution.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {execution.endTime && execution.startTime ? 
                                `${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s` :
                                'Running...'
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'analytics' && (
          <WorkflowDashboard onRefresh={loadData} />
        )}
      </main>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Workflow Templates
              </CardTitle>
              <CardDescription>
                Choose from pre-built automation templates to get started quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3" 
                        onClick={() => createFromTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowTemplates(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Workflow Rule
              </CardTitle>
              <CardDescription>
                Build a custom automation rule with triggers and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ruleName">Rule Name</Label>
                    <Input
                      id="ruleName"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Boss Email Alert"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newRule.priority} 
                      onValueChange={(value: any) => setNewRule(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this rule does..."
                  />
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="space-y-4">
                <h3 className="font-semibold">Trigger</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Trigger Type</Label>
                    <Select 
                      value={newRule.trigger.type} 
                      onValueChange={(value: any) => setNewRule(prev => ({ 
                        ...prev, 
                        trigger: { ...prev.trigger, type: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="calendar">Calendar</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trigger Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Conditions</Label>
                    <Button size="sm" variant="outline" onClick={addCondition}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                  
                  {newRule.trigger.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-3 border rounded-lg">
                      <Input
                        placeholder="Field (e.g., from.email)"
                        value={condition.field}
                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                      />
                      <Select 
                        value={condition.operator} 
                        onValueChange={(value: any) => updateCondition(index, { operator: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="startsWith">Starts With</SelectItem>
                          <SelectItem value="endsWith">Ends With</SelectItem>
                          <SelectItem value="greaterThan">Greater Than</SelectItem>
                          <SelectItem value="lessThan">Less Than</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Actions</h3>
                  <Button size="sm" variant="outline" onClick={addAction}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Action
                  </Button>
                </div>

                {newRule.actions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Select 
                        value={action.type} 
                        onValueChange={(value: any) => updateAction(index, { type: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="email">Send Email</SelectItem>
                          <SelectItem value="file_operation">File Operation</SelectItem>
                          <SelectItem value="api_call">API Call</SelectItem>
                          <SelectItem value="task_creation">Create Task</SelectItem>
                          <SelectItem value="calendar_event">Calendar Event</SelectItem>
                          <SelectItem value="backup">Backup</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Action name"
                        value={action.name}
                        onChange={(e) => updateAction(index, { name: e.target.value })}
                      />
                      <Input
                        placeholder="Description"
                        value={action.description}
                        onChange={(e) => updateAction(index, { description: e.target.value })}
                      />
                    </div>

                    {/* Action-specific parameters */}
                    {action.type === 'notification' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Notification title"
                          value={action.parameters.title || ''}
                          onChange={(e) => updateAction(index, { 
                            parameters: { ...action.parameters, title: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Notification body"
                          value={action.parameters.body || ''}
                          onChange={(e) => updateAction(index, { 
                            parameters: { ...action.parameters, body: e.target.value }
                          })}
                        />
                      </div>
                    )}

                    {action.type === 'email' && (
                      <div className="space-y-2">
                        <Input
                          placeholder="To email address"
                          value={action.parameters.to || ''}
                          onChange={(e) => updateAction(index, { 
                            parameters: { ...action.parameters, to: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Subject"
                          value={action.parameters.subject || ''}
                          onChange={(e) => updateAction(index, { 
                            parameters: { ...action.parameters, subject: e.target.value }
                          })}
                        />
                        <Textarea
                          placeholder="Email body"
                          value={action.parameters.body || ''}
                          onChange={(e) => updateAction(index, { 
                            parameters: { ...action.parameters, body: e.target.value }
                          })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRuleBuilder(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createRule} 
                  disabled={isCreating || !newRule.name || newRule.actions.length === 0}
                >
                  {isCreating ? 'Creating...' : 'Create Rule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rule Details Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {selectedRule.name}
              </CardTitle>
              <CardDescription>{selectedRule.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Trigger</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getTriggerIcon(selectedRule.trigger.type)}
                    <span className="capitalize">{selectedRule.trigger.type}</span>
                  </div>
                  {selectedRule.trigger.conditions.map((condition, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {condition.field} {condition.operator} {condition.value}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Actions</h4>
                <div className="space-y-2">
                  {selectedRule.actions.map((action, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(action.type)}
                        <span className="font-medium">{action.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Executions</p>
                    <p className="text-lg font-bold">{selectedRule.executionCount}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-lg font-bold">
                      {selectedRule.executionCount > 0 ? 
                        Math.round((selectedRule.successCount / selectedRule.executionCount) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedRule(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}