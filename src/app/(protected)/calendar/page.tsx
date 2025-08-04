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
      const payload = naturalLanguage 
        ? { naturalLanguage: naturalLanguageInput }
        : {
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

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchEvents();
        setShowCreateForm(false);
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventStart('');
        setNewEventEnd('');
        setNaturalLanguageInput('');
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('calendarTitle')}</h1>
              <p className="text-black">{t('settingsDescription')}</p>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Create with Voice */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('createEvent')}</CardTitle>
            <CardDescription>{t('settingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
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
              <p className="mt-2 text-sm text-black italic">{t('loading')}: "{transcript}"</p>
            )}
          </CardContent>
        </Card>

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
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('endTime')}</label>
                  <Input
                    type="datetime-local"
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
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
  );
}