'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Mail, 
  Send, 
  Inbox, 
  Search, 
  Mic,
  RefreshCw,
  User,
  Calendar,
  Paperclip,
  Trash2
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface EmailMessage {
  id: string;
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
  };
}

export default function EmailPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Compose form fields
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (transcript && !isListening) {
      // Parse voice input for email composition
      parseVoiceEmail(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/gmail/messages${query}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data || []);
      } else {
        console.error('Failed to fetch messages:', data.message);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/gmail/unread-count');
      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const parseVoiceEmail = (voiceInput: string) => {
    const input = voiceInput.toLowerCase();
    
    // Try to parse "send email to [email] about [subject] saying [body]"
    const emailPattern = /send\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about\s+|with\s+subject\s+)(.+?)(?:\s+saying\s+(.+))?$/i;
    const match = input.match(emailPattern);
    
    if (match) {
      setEmailTo(match[1].trim());
      setEmailSubject(match[2].trim());
      if (match[3]) {
        setEmailBody(match[3].trim());
      }
      setShowCompose(true);
    } else {
      // Just fill in what we can understand
      if (input.includes('email')) {
        setShowCompose(true);
        setEmailBody(voiceInput);
      }
    }
  };

  const sendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      alert(t('name'));
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/gmail/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          message: emailBody
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(t('send') + ' ' + t('email'));
        setShowCompose(false);
        setEmailTo('');
        setEmailSubject('');
        setEmailBody('');
        fetchMessages();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert(t('settingsError'));
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm(t('delete') + ' ' + t('message') + '?')) {
      return;
    }

    setDeleting(messageId);
    try {
      const response = await fetch('/api/gmail/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchMessages();
        await fetchUnreadCount();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(t('settingsError'));
    } finally {
      setDeleting(null);
    }
  };

  const getHeaderValue = (headers: any[], name: string) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('emailTitle')}</h1>
              <p className="text-black">{t('profileDescription')}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Inbox className="h-4 w-4" />
                <span className="text-gray-700">{unreadCount} {t('unreadEmails')}</span>
              </div>
              <Button onClick={fetchMessages} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
              <Button onClick={() => setShowCompose(true)}>
                <Mail className="h-4 w-4 mr-2" />
                {t('compose')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Voice Compose */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('voiceInput')}</CardTitle>
            <CardDescription>{t('voiceDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={isListening ? stopListening : startListening}
                className={isListening ? 'voice-active bg-accent text-accent-foreground' : ''}
                disabled={!isSupported}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isListening ? t('stopRecording') : t('compose')}
              </Button>
              {transcript && (
                <p className="text-sm text-black italic">"{transcript}"</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compose Email Form */}
        {showCompose && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                {t('compose')} {t('email')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('to')}</label>
                <Input
                  type="email"
                  placeholder={t('email')}
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('subject')}</label>
                <Input
                  placeholder={t('subject')}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('message')}</label>
                <textarea
                  rows={6}
                  placeholder={t('message')}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={sendEmail}
                  disabled={!emailTo || !emailSubject || !emailBody || sending}
                  loading={sending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('send')} {t('email')}
                </Button>
                <Button variant="outline" onClick={() => setShowCompose(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('search') + ' ' + t('email') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchMessages()}
                  className="text-black"
                />
              </div>
              <Button onClick={fetchMessages}>
                <Search className="h-4 w-4 mr-2" />
                {t('search')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Inbox className="h-5 w-5 mr-2" />
              {t('message')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => {
                  const from = getHeaderValue(message.payload.headers, 'From');
                  const subject = getHeaderValue(message.payload.headers, 'Subject');
                  const date = getHeaderValue(message.payload.headers, 'Date');
                  
                  return (
                    <div key={message.id} className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-black" />
                            <span className="font-medium text-black">{from}</span>
                            <span className="text-sm text-black">{formatDate(date)}</span>
                          </div>
                          
                          <h4 className="font-medium text-black mb-2">{subject}</h4>
                          
                          <p className="text-sm text-black line-clamp-2">
                            {message.snippet}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                            disabled={deleting === message.id}
                          >
                            <Trash2 className={`h-4 w-4 ${deleting === message.id ? 'animate-spin' : 'text-red-500'}`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-black">{t('message')}</p>
                <p className="text-sm text-black mt-2">
                  {searchQuery ? t('search') : t('inbox')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}