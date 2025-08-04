'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DiaryEntry } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  BookOpen, 
  Plus, 
  Search,
  Calendar,
  Heart,
  Frown,
  Smile,
  Meh,
  Zap,
  AlertCircle,
  Mic,
  RefreshCw
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

export default function DiaryPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'happy' | 'sad' | 'neutral' | 'excited' | 'anxious' | 'grateful' | 'angry' | 'peaceful'>('neutral');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moodFilter, setMoodFilter] = useState('');

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  const moods = [
    { value: 'happy', label: t('happy'), icon: Smile, color: 'text-green-500' },
    { value: 'sad', label: t('sad'), icon: Frown, color: 'text-blue-500' },
    { value: 'neutral', label: t('neutral'), icon: Meh, color: 'text-black' },
    { value: 'excited', label: t('excited'), icon: Zap, color: 'text-yellow-500' },
    { value: 'anxious', label: t('anxious'), icon: AlertCircle, color: 'text-red-500' },
    { value: 'grateful', label: t('grateful'), icon: Heart, color: 'text-pink-500' },
    { value: 'angry', label: t('angry'), icon: AlertCircle, color: 'text-red-600' },
    { value: 'peaceful', label: t('peaceful'), icon: Heart, color: 'text-blue-400' }
  ];

  useEffect(() => {
    fetchEntries();
  }, [searchQuery, startDate, endDate, moodFilter]);

  useEffect(() => {
    if (transcript && !isListening) {
      parseVoiceDiary(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (moodFilter) params.append('mood', moodFilter);
      
      const response = await fetch(`/api/sheets/diary?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setEntries(Array.isArray(data.data) ? data.data : data.data?.entries || []);
      } else {
        console.error('Failed to fetch entries:', data.message);
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const parseVoiceDiary = (voiceInput: string) => {
    setContent(voiceInput);
    
    // Try to detect mood from the content
    const input = voiceInput.toLowerCase();
    if (input.includes('happy') || input.includes('joy') || input.includes('great') || input.includes('amazing')) {
      setMood('happy');
    } else if (input.includes('sad') || input.includes('down') || input.includes('upset')) {
      setMood('sad');
    } else if (input.includes('excited') || input.includes('thrilled')) {
      setMood('excited');
    } else if (input.includes('anxious') || input.includes('worried')) {
      setMood('anxious');
    } else if (input.includes('grateful') || input.includes('thankful')) {
      setMood('grateful');
    }
    
    setShowAddForm(true);
  };

  const addEntry = async () => {
    if (!content) {
      alert(t('content'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/sheets/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mood,
          tags
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchEntries();
        setShowAddForm(false);
        setContent('');
        setMood('neutral');
        setTags([]);
        setTagInput('');
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error adding diary entry:', error);
      alert(t('settingsError'));
    } finally {
      setAdding(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getMoodIcon = (moodValue: string) => {
    const moodItem = moods.find(m => m.value === moodValue);
    if (!moodItem) return { Icon: Meh, color: 'text-black' };
    return { Icon: moodItem.icon, color: moodItem.color };
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return t('unknownDate');
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('invalidDate');
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return t('invalidDate');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">{t('diaryTitle')}</h1>
            <p className="text-black mt-2">{t('profileDescription')}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-black">{t('events')}</p>
              <p className="text-xl font-bold text-primary">{entries.length}</p>
            </div>
            <Button onClick={fetchEntries} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newEntry')}
            </Button>
          </div>
        </div>

        {/* Voice Add Entry */}
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

        {/* Add Entry Form */}
        {showAddForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{t('newEntry')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('content')}</label>
                <textarea
                  rows={6}
                  placeholder={t('content')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('mood')}</label>
                <div className="grid grid-cols-4 gap-3">
                  {moods.map((moodOption) => {
                    const Icon = moodOption.icon;
                    return (
                      <button
                        key={moodOption.value}
                        type="button"
                        onClick={() => setMood(moodOption.value as any)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          mood === moodOption.value
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mx-auto mb-1 ${moodOption.color}`} />
                        <span className="text-sm text-black">{moodOption.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('tags')}</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder={t('add') + ' ' + t('tags')}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="text-black"
                  />
                  <Button onClick={addTag} variant="outline">{t('add')}</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-primary hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={addEntry}
                  disabled={!content || adding}
                  loading={adding}
                >
                  {t('save')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('search')}</label>
                <Input
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('startTime')}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('endTime')}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('mood')}</label>
                <select
                  value={moodFilter}
                  onChange={(e) => setMoodFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
                >
                  <option value="">{t('mood')}</option>
                  {moods.map(mood => (
                    <option key={mood.value} value={mood.value}>{mood.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-6">
            {entries.map((entry) => {
              if (!entry || !entry.id) return null;
              
              const { Icon, color } = getMoodIcon(entry.mood || 'neutral');
              const entryDate = entry.date || new Date().toISOString().split('T')[0];
              const entryContent = entry.content || 'No content';
              const entryMood = entry.mood || 'neutral';
              const entryTags = entry.tags ? (typeof entry.tags === 'string' ? entry.tags.split(',').filter(t => t.trim()) : entry.tags) : [];
              
              return (
                <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-6 w-6 ${color}`} />
                        <div>
                          <h3 className="font-semibold text-black">
                            {formatDate(entryDate)}
                          </h3>
                          <p className="text-sm text-black capitalize">
                            {t('mood')}: {entryMood}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-black">
                        <Calendar className="h-4 w-4 mr-1" />
                        {entryDate}
                      </div>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className="text-black leading-relaxed whitespace-pre-wrap">
                        {entryContent}
                      </p>
                    </div>
                    
                    {entryTags && entryTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {entryTags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-black rounded-full text-xs"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }).filter(Boolean)}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-black">{t('diaryTitle')}</p>
              <p className="text-sm text-black mt-2">
                {searchQuery || startDate || endDate || moodFilter 
                  ? t('filter') 
                  : t('newEntry')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}