'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Users,
  Mic,
  RefreshCw
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

export default function CalendarPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (transcript && !isListening) {
      setNaturalLanguageInput(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar/events');
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data || []);
      } else {
        console.error('Failed to fetch events:', data.message);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (naturalLanguage = false) => {
    setCreating(true);
    try {
      let response;
      
      if (naturalLanguage && naturalLanguageInput.trim()) {
        // Use smart calendar scheduling for natural language input
        response = await fetch('/api/calendar/smart-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'process_voice_scheduling',
            voiceInput: naturalLanguageInput
          })
        });
      } else {
        // Check for conflicts first with manual input
        if (newEventStart && newEventEnd) {
          await checkConflicts();
        }
        
        // Use regular calendar creation
        const payload = {
          event: {
            summary: newEventTitle,
            description: newEventDescription,
            start: {
              dateTime: new Date(newEventStart).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(newEventEnd).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          }
        };

        response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchEvents();
        setShowCreateForm(false);
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventStart('');
        setNewEventEnd('');
        setNaturalLanguageInput('');
        setConflicts([]);
        setSuggestions([]);
        setShowConflicts(false);
        
        // Show success message with smart features info
        if (data.data?.event?.conflictResolution?.length > 0) {
          alert('Event created successfully! I found some conflicts and adjusted the timing.');
        } else if (data.data?.event?.travelTime) {
          alert('Event created successfully! Travel time has been automatically calculated and added.');
        }
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert(t('settingsError'));
    } finally {
      setCreating(false);
    }
  };

  const checkConflicts = async () => {
    if (!newEventStart || !newEventEnd) return;
    
    try {
      const response = await fetch('/api/calendar/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_conflicts',
          eventData: {
            startTime: new Date(newEventStart).toISOString(),
            endTime: new Date(newEventEnd).toISOString(),
            title: newEventTitle || 'New Event'
          }
        })
      });

      const data = await response.json();
      
      if (data.success && data.data.hasConflicts) {
        setConflicts(data.data.conflicts);
        setSuggestions(data.data.suggestions);
        setShowConflicts(true);
      } else {
        setConflicts([]);
        setSuggestions([]);
        setShowConflicts(false);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const updateEvent = async () => {
    if (!editingEvent || !newEventTitle.trim() || !newEventStart || !newEventEnd) {
      alert(t('settingsDescription'));
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            summary: newEventTitle,
            description: newEventDescription,
            start: {
              dateTime: new Date(newEventStart).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: new Date(newEventEnd).toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchEvents();
        cancelEdit();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert(t('settingsError'));
    } finally {
      setUpdating(false);
    }
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEventTitle(event.summary || '');
    setNewEventDescription(event.description || '');
    setNewEventStart(formatDateTimeForInput(event.start.dateTime));
    setNewEventEnd(formatDateTimeForInput(event.end.dateTime));
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setShowCreateForm(false);
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventStart('');
    setNewEventEnd('');
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm(t('delete') + ' ' + t('events') + '?')) return;
    
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchEvents();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(t('settingsError'));
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatDateTimeForInput = (dateTime: string) => {
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getTodayEvents = () => {
    const today = new Date().toDateString();
    return events.filter(event => 
      new Date(event.start.dateTime).toDateString() === today
    );
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start.dateTime) > now)
      .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
      .slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('calendarTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('settingsDescription')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={fetchEvents} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('loading')}
              </Button>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('createEvent')}
              </Button>
            </div>
          </div>
        </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Quick Create Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8 hover:shadow-3xl hover:bg-white/80 transition-all duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
                {t('createEvent')}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                  🧠 Smart Scheduling
                </span>
              </h2>
              <p className="text-gray-600 font-medium">{t('settingsDescription')} Try: "Book 1 hour for gym every Tuesday at 6 PM"</p>
            </div>
          </div>
          <div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('eventDescription')}
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  className="text-black"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createEvent(true)}
                  disabled={!naturalLanguageInput.trim() || creating}
                  loading={creating}
                >
                  {t('createEvent')}
                </Button>
                <Button
                  variant="outline"
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? 'voice-active bg-accent text-accent-foreground' : ''}
                  disabled={!isSupported}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {transcript && (
              <p className="mt-2 text-sm text-gray-600 italic">{t('loading')}: "{transcript}"</p>
            )}
          </div>
        </div>

        {/* Smart Features: Conflict Detection */}
        {showConflicts && conflicts.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Clock className="h-5 w-5 mr-2" />
                Scheduling Conflicts Detected
              </CardTitle>
              <CardDescription>
                I found {conflicts.length} conflict(s) with your existing events. Here are some suggestions:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show conflicts */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Conflicting Events:</h4>
                {conflicts.map((conflict, index) => (
                  <div key={index} className="p-3 bg-white rounded border-l-4 border-orange-400">
                    <p className="font-medium">{conflict.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Show suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Suggested Alternative Times:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const suggestedTime = new Date(suggestion);
                          const endTime = new Date(suggestedTime.getTime() + 60 * 60 * 1000); // 1 hour later
                          setNewEventStart(suggestedTime.toISOString().slice(0, 16));
                          setNewEventEnd(endTime.toISOString().slice(0, 16));
                          setShowConflicts(false);
                        }}
                        className="justify-start"
                      >
                        {new Date(suggestion).toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConflicts(false)}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Event Form Modal */}
        {showCreateForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{editingEvent ? t('edit') + ' ' + t('events') : t('createEvent')}</CardTitle>
              <CardDescription>{editingEvent ? t('edit') + ' ' + t('eventDescription') : t('eventDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={t('eventTitle')}
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="text-black"
              />
              <Input
                placeholder={t('eventDescription')}
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="text-black"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('startTime')}</label>
                  <Input
                    type="datetime-local"
                    value={newEventStart}
                    onChange={(e) => {
                      setNewEventStart(e.target.value);
                      // Auto-check conflicts when time changes
                      if (e.target.value && newEventEnd) {
                        setTimeout(() => checkConflicts(), 500);
                      }
                    }}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('endTime')}</label>
                  <Input
                    type="datetime-local"
                    value={newEventEnd}
                    onChange={(e) => {
                      setNewEventEnd(e.target.value);
                      // Auto-check conflicts when time changes
                      if (newEventStart && e.target.value) {
                        setTimeout(() => checkConflicts(), 500);
                      }
                    }}
                    className="text-black"
                  />
                </div>
              </div>
              
              {/* Real-time conflict indicator in manual form */}
              {showConflicts && conflicts.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">⚠️ Time Conflict Detected</span>
                  </div>
                  <p className="text-sm text-orange-600 mb-2">
                    This time conflicts with {conflicts.length} existing event(s).
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const suggestedTime = new Date(suggestion);
                          const endTime = new Date(suggestedTime.getTime() + 60 * 60 * 1000);
                          setNewEventStart(suggestedTime.toISOString().slice(0, 16));
                          setNewEventEnd(endTime.toISOString().slice(0, 16));
                          setShowConflicts(false);
                        }}
                        className="text-xs"
                      >
                        {new Date(suggestion).toLocaleTimeString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={editingEvent ? updateEvent : () => createEvent(false)}
                  disabled={!newEventTitle.trim() || !newEventStart || !newEventEnd || creating || updating}
                  loading={creating || updating}
                >
                  {editingEvent ? t('edit') + ' ' + t('events') : t('createEvent')}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                {t('todayEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : getTodayEvents().length > 0 ? (
                <div className="space-y-3">
                  {getTodayEvents().map((event) => {
                    const datetime = formatDateTime(event.start.dateTime);
                    return (
                      <div key={event.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{event.summary}</h4>
                            {event.description && (
                              <p className="text-sm text-black mt-1">{event.description}</p>
                            )}
                            <div className="flex items-center mt-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {datetime.time}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => startEdit(event)}
                              disabled={showCreateForm}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => event.id && deleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-black text-center py-8">{t('todayEvents')}</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {t('events')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : getUpcomingEvents().length > 0 ? (
                <div className="space-y-3">
                  {getUpcomingEvents().map((event) => {
                    const datetime = formatDateTime(event.start.dateTime);
                    return (
                      <div key={event.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{event.summary}</h4>
                            {event.description && (
                              <p className="text-sm text-black mt-1">{event.description}</p>
                            )}
                            <div className="flex items-center mt-2 text-sm text-gray-500">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {datetime.date} at {datetime.time}
                            </div>
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center mt-1 text-sm text-gray-500">
                                <Users className="h-4 w-4 mr-1" />
                                {event.attendees.length} {t('contacts')}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => startEdit(event)}
                              disabled={showCreateForm}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => event.id && deleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-black text-center py-8">{t('events')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      </div>
    </div>
  );
}