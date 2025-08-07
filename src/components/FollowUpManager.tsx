'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Bell,
  User,
  Mail,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Filter,
  Search,
  TrendingUp,
  Target,
  Timer
} from 'lucide-react';

interface FollowUpReminder {
  id: string;
  emailId: string;
  emailSubject: string;
  sender: string;
  senderEmail: string;
  originalDate: Date;
  reminderDate: Date;
  status: 'pending' | 'completed' | 'overdue' | 'snoozed';
  priority: 'high' | 'medium' | 'low';
  category: 'response_needed' | 'follow_up' | 'deadline' | 'meeting' | 'payment' | 'review';
  notes?: string;
  originalDeadline?: Date;
  snoozeUntil?: Date;
  completedDate?: Date;
  estimatedResponseTime?: number;
  actualResponseTime?: number;
  responseType?: 'email' | 'call' | 'meeting' | 'task';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ReminderStats {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  snoozed: number;
  avgResponseTime: number;
  completionRate: number;
}

export default function FollowUpManager() {
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<FollowUpReminder[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<FollowUpReminder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'sender'>('date');
  const [showCompleted, setShowCompleted] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleReminders: FollowUpReminder[] = [
      {
        id: '1',
        emailId: 'email_1',
        emailSubject: 'Q4 Budget Review Meeting',
        sender: 'Sarah Johnson',
        senderEmail: 'sarah.johnson@company.com',
        originalDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'pending',
        priority: 'high',
        category: 'response_needed',
        notes: 'Need to confirm availability and prepare budget documents',
        originalDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimatedResponseTime: 30,
        responseType: 'email',
        tags: ['budget', 'meeting', 'urgent'],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        id: '2',
        emailId: 'email_2',
        emailSubject: 'Project Proposal - Additional Information',
        sender: 'Michael Chen',
        senderEmail: 'michael.chen@client.com',
        originalDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: 'overdue',
        priority: 'high',
        category: 'follow_up',
        notes: 'Client requested timeline and cost breakdown. Follow up needed.',
        originalDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000),
        estimatedResponseTime: 120,
        responseType: 'email',
        tags: ['proposal', 'client', 'cost-breakdown'],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        emailId: 'email_3',
        emailSubject: 'Annual Training Completion',
        sender: 'HR Department',
        senderEmail: 'hr@company.com',
        originalDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'pending',
        priority: 'medium',
        category: 'deadline',
        notes: 'Complete mandatory training by month end',
        originalDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedResponseTime: 15,
        responseType: 'task',
        tags: ['training', 'hr', 'mandatory'],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        emailId: 'email_4',
        emailSubject: 'Invoice #12345 Payment Confirmation',
        sender: 'Accounting Team',
        senderEmail: 'accounting@vendor.com',
        originalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed',
        priority: 'low',
        category: 'payment',
        notes: 'Payment processed and confirmation sent',
        completedDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        estimatedResponseTime: 10,
        actualResponseTime: 8,
        responseType: 'email',
        tags: ['payment', 'invoice', 'accounting'],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: '5',
        emailId: 'email_5',
        emailSubject: 'Weekly Team Sync - Agenda Items',
        sender: 'Team Lead',
        senderEmail: 'teamlead@company.com',
        originalDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
        status: 'snoozed',
        priority: 'medium',
        category: 'meeting',
        notes: 'Prepare agenda items for team sync',
        snoozeUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
        estimatedResponseTime: 20,
        responseType: 'meeting',
        tags: ['team', 'sync', 'agenda'],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    setReminders(sampleReminders);
  }, []);

  // Filter and sort reminders
  useEffect(() => {
    const filtered = reminders.filter(reminder => {
      const matchesSearch = searchQuery === '' || 
        reminder.emailSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reminder.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reminder.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reminder.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || reminder.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || reminder.priority === priorityFilter;
      const matchesCompleted = showCompleted || reminder.status !== 'completed';
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCompleted;
    });

    // Sort reminders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return a.reminderDate.getTime() - b.reminderDate.getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'sender':
          return a.sender.localeCompare(b.sender);
        default:
          return 0;
      }
    });

    setFilteredReminders(filtered);
  }, [reminders, searchQuery, statusFilter, priorityFilter, showCompleted, sortBy]);

  const getStats = (): ReminderStats => {
    const total = reminders.length;
    const pending = reminders.filter(r => r.status === 'pending').length;
    const overdue = reminders.filter(r => r.status === 'overdue').length;
    const completed = reminders.filter(r => r.status === 'completed').length;
    const snoozed = reminders.filter(r => r.status === 'snoozed').length;
    
    const completedReminders = reminders.filter(r => r.status === 'completed' && r.actualResponseTime);
    const avgResponseTime = completedReminders.length > 0 
      ? completedReminders.reduce((acc, r) => acc + (r.actualResponseTime || 0), 0) / completedReminders.length 
      : 0;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, pending, overdue, completed, snoozed, avgResponseTime, completionRate };
  };

  const stats = getStats();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'snoozed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'response_needed': return <Mail className="w-4 h-4" />;
      case 'follow_up': return <Clock className="w-4 h-4" />;
      case 'deadline': return <AlertCircle className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'payment': return <Target className="w-4 h-4" />;
      case 'review': return <CheckCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const completeReminder = (reminderId: string) => {
    setReminders(prev => prev.map(r => 
      r.id === reminderId 
        ? { 
            ...r, 
            status: 'completed' as const, 
            completedDate: new Date(),
            actualResponseTime: r.estimatedResponseTime ? r.estimatedResponseTime + Math.random() * 10 : undefined,
            updatedAt: new Date()
          }
        : r
    ));
  };

  const snoozeReminder = (reminderId: string, hours: number) => {
    const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    setReminders(prev => prev.map(r => 
      r.id === reminderId 
        ? { ...r, status: 'snoozed' as const, snoozeUntil, reminderDate: snoozeUntil, updatedAt: new Date() }
        : r
    ));
  };

  const deleteReminder = (reminderId: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      if (selectedReminder?.id === reminderId) {
        setSelectedReminder(null);
      }
    }
  };

  const isOverdue = (reminder: FollowUpReminder) => {
    return reminder.status !== 'completed' && reminder.reminderDate < new Date();
  };

  const getTimeUntilDue = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    
    if (hours < 0) return `${Math.abs(hours)} hours overdue`;
    if (hours < 24) return `${hours} hours`;
    const days = Math.ceil(hours / 24);
    return `${days} days`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="w-8 h-8 text-primary" />
            Follow-up Manager
          </h1>
          <p className="text-muted-foreground">
            Track email responses and manage follow-up reminders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Timer className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{Math.round(stats.completionRate)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgResponseTime)}min</p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Follow-up Reminders</CardTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                    />
                    Show completed
                  </label>
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-64 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search reminders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                  <option value="snoozed">Snoozed</option>
                </select>
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="date">Sort by Date</option>
                  <option value="priority">Sort by Priority</option>
                  <option value="sender">Sort by Sender</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2 max-h-96 overflow-y-auto p-4">
                {filteredReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors
                      ${selectedReminder?.id === reminder.id ? 'bg-muted ring-2 ring-primary' : ''}
                      ${isOverdue(reminder) ? 'border-l-4 border-l-red-500' : ''}
                    `}
                    onClick={() => setSelectedReminder(reminder)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(reminder.category)}
                        <h3 className="font-medium">{reminder.emailSubject}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getPriorityColor(reminder.priority)}>
                          {reminder.priority}
                        </Badge>
                        <Badge className={getStatusColor(reminder.status)}>
                          {reminder.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{reminder.sender}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {getTimeUntilDue(reminder.reminderDate)}
                      </span>
                    </div>
                    
                    {reminder.notes && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {reminder.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {reminder.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {reminder.status !== 'completed' && (
                          <>
                            <Button size="sm" variant="outline" onClick={(e) => {
                              e.stopPropagation();
                              completeReminder(reminder.id);
                            }}>
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={(e) => {
                              e.stopPropagation();
                              snoozeReminder(reminder.id, 24);
                            }}>
                              <Clock className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredReminders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reminders found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reminder Details */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedReminder ? 'Reminder Details' : 'Select Reminder'}
                </CardTitle>
                {selectedReminder && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteReminder(selectedReminder.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedReminder ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{selectedReminder.emailSubject}</h3>
                    <div className="flex gap-2 mb-3">
                      <Badge className={getPriorityColor(selectedReminder.priority)}>
                        {selectedReminder.priority} priority
                      </Badge>
                      <Badge className={getStatusColor(selectedReminder.status)}>
                        {selectedReminder.status}
                      </Badge>
                      <Badge variant="outline">
                        {selectedReminder.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">From:</span>
                      <p className="font-medium">{selectedReminder.sender}</p>
                      <p className="text-sm text-muted-foreground">{selectedReminder.senderEmail}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Reminder Date:</span>
                      <p className="font-medium">{selectedReminder.reminderDate.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {getTimeUntilDue(selectedReminder.reminderDate)}
                      </p>
                    </div>
                    
                    {selectedReminder.originalDeadline && (
                      <div>
                        <span className="text-sm text-muted-foreground">Original Deadline:</span>
                        <p className="font-medium">{selectedReminder.originalDeadline.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {selectedReminder.notes && (
                      <div>
                        <span className="text-sm text-muted-foreground">Notes:</span>
                        <p className="text-sm bg-muted p-2 rounded mt-1">{selectedReminder.notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Response Type:</span>
                      <p className="font-medium capitalize">{selectedReminder.responseType}</p>
                    </div>
                    
                    {selectedReminder.estimatedResponseTime && (
                      <div>
                        <span className="text-sm text-muted-foreground">Est. Response Time:</span>
                        <p className="font-medium">{selectedReminder.estimatedResponseTime} minutes</p>
                        {selectedReminder.actualResponseTime && (
                          <p className="text-sm text-muted-foreground">
                            Actual: {selectedReminder.actualResponseTime} minutes
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedReminder.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {selectedReminder.status !== 'completed' && (
                    <div className="space-y-2 pt-4 border-t">
                      <Button 
                        onClick={() => completeReminder(selectedReminder.id)} 
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => snoozeReminder(selectedReminder.id, 1)}
                        >
                          Snooze 1h
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => snoozeReminder(selectedReminder.id, 24)}
                        >
                          Snooze 1d
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {selectedReminder.completedDate && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Completed</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        {selectedReminder.completedDate.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a reminder to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}