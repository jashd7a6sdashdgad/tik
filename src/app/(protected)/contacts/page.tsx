'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Contact } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Users, 
  Plus, 
  Search,
  Mail,
  Phone,
  Building,
  Edit,
  Trash2,
  Mic,
  RefreshCw
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

export default function ContactsPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  useEffect(() => {
    fetchContacts();
  }, [searchQuery]);

  useEffect(() => {
    if (transcript && !isListening) {
      parseVoiceContact(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/sheets/contacts${query}`);
      const data = await response.json();
      
      if (data.success) {
        setContacts(data.data || []);
      } else {
        console.error('Failed to fetch contacts:', data.message);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseVoiceContact = (voiceInput: string) => {
    const input = voiceInput.toLowerCase();
    
    // Try to parse "add contact John Smith email john@example.com phone 555-1234"
    const nameMatch = input.match(/add contact (.+?)(?:\s+email|\s+phone|\s+company|$)/i);
    if (nameMatch) {
      setName(nameMatch[1].trim());
    }

    const emailMatch = input.match(/email\s+([^\s@]+@[^\s@]+\.[^\s@]+)/i);
    if (emailMatch) {
      setEmail(emailMatch[1]);
    }

    const phoneMatch = input.match(/phone\s+([\d\-\(\)\s]+)/i);
    if (phoneMatch) {
      setPhone(phoneMatch[1].trim());
    }

    const companyMatch = input.match(/company\s+(.+?)(?:\s+email|\s+phone|$)/i);
    if (companyMatch) {
      setCompany(companyMatch[1].trim());
    }
    
    if (nameMatch || emailMatch || phoneMatch) {
      setShowAddForm(true);
    }
  };

  const addContact = async () => {
    if (!name) {
      alert(t('name'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/sheets/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchContacts();
        setShowAddForm(false);
        clearForm();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert(t('settingsError'));
    } finally {
      setAdding(false);
    }
  };

  const updateContact = async () => {
    if (!name || !editingContact) {
      alert(t('name'));
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/sheets/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingContact.id,
          name,
          email,
          phone,
          company,
          notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchContacts();
        setEditingContact(null);
        setShowAddForm(false);
        clearForm();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert(t('settingsError'));
    } finally {
      setUpdating(false);
    }
  };

  const testContactsAPI = async () => {
    console.log('🔍 Testing contacts API...');
    try {
      const response = await fetch('/api/sheets/contacts', {
        method: 'GET'
      });
      console.log('🔍 Contacts API test response status:', response.status);
      console.log('🔍 Contacts API test response OK:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Contacts API is accessible:', data);
      } else {
        console.log('❌ Contacts API error:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Contacts API test failed:', error);
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm(t('delete') + '?')) {
      return;
    }

    console.log('🗑️ Attempting to delete contact:', contactId);
    console.log('🔍 DELETE URL: /api/sheets/contacts');

    setDeleting(contactId);
    try {
      const response = await fetch('/api/sheets/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contactId })
      });

      console.log('🔍 Delete response status:', response.status);
      console.log('🔍 Delete response OK:', response.ok);
      console.log('🔍 Delete response URL:', response.url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Contact deleted successfully');
        await fetchContacts();
      } else {
        console.error('❌ Failed to delete contact:', data.message);
        alert(t('contactDeleteError') + ': ' + (data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('❌ Error deleting contact:', error);
      const errorMessage = error.message || error.toString() || 'Network error';
      alert(t('contactDeleteError') + ': ' + errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setCompany(contact.company || '');
    setNotes(contact.notes || '');
    setShowAddForm(true);
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setNotes('');
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setShowAddForm(false);
    clearForm();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getContactColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('contactsTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('profileDescription')}</p>
              </div>
            </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-black">{t('contacts')}</p>
              <p className="text-xl font-bold text-primary">{contacts.length}</p>
            </div>
            <Button onClick={fetchContacts} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
            <Button onClick={testContactsAPI} variant="outline" size="sm">
              🔍 Test API
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addContact')}
            </Button>
          </div>
        </div>

        {/* Voice Add Contact */}
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
                {isListening ? t('stopRecording') : t('voiceInput')}
              </Button>
              {transcript && (
                <p className="text-sm text-black italic">"{transcript}"</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Contact Form */}
        {showAddForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{editingContact ? t('edit') + ' ' + t('contacts') : t('addContact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('name')} *</label>
                  <Input
                    placeholder={t('name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('email')}</label>
                  <Input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('phone')}</label>
                  <Input
                    placeholder={t('phone')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('company')}</label>
                  <Input
                    placeholder={t('company')}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('notes')}</label>
                <textarea
                  rows={3}
                  placeholder={t('notes')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={editingContact ? updateContact : addContact}
                  disabled={!name || adding || updating}
                  loading={adding || updating}
                >
                  {editingContact ? t('update') : t('addContact')}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
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
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-black"
                />
              </div>
              <Button onClick={fetchContacts}>
                <Search className="h-4 w-4 mr-2" />
                {t('search')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getContactColor(contact.name)}`}>
                      {getInitials(contact.name)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-black truncate">{contact.name}</h3>
                      
                      {contact.company && (
                        <div className="flex items-center mt-1 text-sm text-black">
                          <Building className="h-4 w-4 mr-1" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      
                      {contact.email && (
                        <div className="flex items-center mt-1 text-sm text-black">
                          <Mail className="h-4 w-4 mr-1" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center mt-1 text-sm text-black">
                          <Phone className="h-4 w-4 mr-1" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      
                      {contact.notes && (
                        <p className="mt-2 text-sm text-black line-clamp-2">
                          {contact.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEdit(contact)}
                      disabled={showAddForm}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => contact.id && deleteContact(contact.id)}
                      disabled={deleting === contact.id}
                    >
                      <Trash2 className={`h-4 w-4 ${deleting === contact.id ? 'animate-spin' : 'text-red-500'}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-black">{t('contacts')} {t('search')}</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery ? t('search') : t('addContact')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}