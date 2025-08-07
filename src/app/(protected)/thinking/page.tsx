'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Lightbulb, Target, BookOpen, Clock, Plus, Search, Tag } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface ThoughtEntry {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'goal' | 'reflection' | 'learning';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function ThinkingPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([]);
  const [newThought, setNewThought] = useState({
    title: '',
    content: '',
    category: 'idea' as const,
    tags: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Mock data - replace with actual data storage
    setThoughts([
      {
        id: '1',
        title: 'AI Integration Ideas',
        content: 'Thinking about how to better integrate AI capabilities into the personal assistant. Could add voice recognition for hands-free operation and natural language processing for better command understanding.',
        category: 'idea',
        tags: ['AI', 'voice', 'integration'],
        created_at: '2025-07-31T10:30:00Z',
        updated_at: '2025-07-31T10:30:00Z'
      },
      {
        id: '2',
        title: 'Monthly Goals Review',
        content: 'Need to review progress on monthly goals. Focus on completing the social media integration and improving the user interface. Also want to add more automation features.',
        category: 'goal',
        tags: ['goals', 'review', 'progress'],
        created_at: '2025-07-30T14:15:00Z',
        updated_at: '2025-07-30T14:15:00Z'
      },
      {
        id: '3',
        title: 'Learning Next.js 15 Features',
        content: 'Discovered some interesting new features in Next.js 15. The App Router is quite powerful and the server components make the app much faster. Should explore more about streaming and suspense.',
        category: 'learning',
        tags: ['nextjs', 'learning', 'development'],
        created_at: '2025-07-29T09:00:00Z',
        updated_at: '2025-07-29T09:00:00Z'
      },
      {
        id: '4',
        title: 'Daily Reflection',
        content: 'Today was productive. Managed to complete the social media integration and add new navigation items. Feeling good about the progress. Tomorrow should focus on improving the UI and adding more interactive features.',
        category: 'reflection',
        tags: ['daily', 'reflection', 'productivity'],
        created_at: '2025-07-31T20:00:00Z',
        updated_at: '2025-07-31T20:00:00Z'
      }
    ]);
  }, []);

  const handleAddThought = () => {
    if (!newThought.title.trim() || !newThought.content.trim()) return;

    const thought: ThoughtEntry = {
      id: Date.now().toString(),
      title: newThought.title,
      content: newThought.content,
      category: newThought.category,
      tags: newThought.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setThoughts(prev => [thought, ...prev]);
    setNewThought({ title: '', content: '', category: 'idea', tags: '' });
  };

  const filteredThoughts = thoughts.filter(thought => {
    const matchesSearch = thought.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thought.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thought.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || thought.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'idea': return <Lightbulb className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      case 'learning': return <BookOpen className="h-4 w-4" />;
      case 'reflection': return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'idea': return 'bg-yellow-100 text-yellow-800';
      case 'goal': return 'bg-green-100 text-green-800';
      case 'learning': return 'bg-blue-100 text-blue-800';
      case 'reflection': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    totalThoughts: thoughts.length,
    ideas: thoughts.filter(t => t.category === 'idea').length,
    goals: thoughts.filter(t => t.category === 'goal').length,
    reflections: thoughts.filter(t => t.category === 'reflection').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {t('thinkingTitle')}
              </h1>
              <p className="text-gray-600 font-medium mt-1">{t('content')}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('overview')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalThoughts}</p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('analytics')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.ideas}</p>
                </div>
                <Lightbulb className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('statistics')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.goals}</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('notes')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.reflections}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Thought */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Plus className="h-5 w-5 mr-2" />
                {t('add')}
              </CardTitle>
              <CardDescription className="text-black">
                {t('content')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={t('name')}
                value={newThought.title}
                onChange={(e) => setNewThought(prev => ({ ...prev, title: e.target.value }))}
              />
              
              <Textarea
                placeholder={t('content')}
                value={newThought.content}
                onChange={(e) => setNewThought(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
              
              <select
                className="w-full p-2 border rounded-md"
                value={newThought.category}
                onChange={(e) => setNewThought(prev => ({ ...prev, category: e.target.value as any }))}
              >
                <option value="idea">💡 {t('analytics')}</option>
                <option value="goal">🎯 {t('statistics')}</option>
                <option value="learning">📚 {t('education')}</option>
                <option value="reflection">🧠 {t('notes')}</option>
              </select>
              
              <Input
                placeholder={t('tags')}
                value={newThought.tags}
                onChange={(e) => setNewThought(prev => ({ ...prev, tags: e.target.value }))}
              />
              
              <Button onClick={handleAddThought} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t('add')}
              </Button>
            </CardContent>
          </Card>

          {/* Thoughts List */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-black">
                <Brain className="h-5 w-5 mr-2" />
                {t('content')}
              </CardTitle>
              
              {/* Search and Filter */}
              <div className="flex space-x-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  className="px-3 py-2 border rounded-md"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">{t('overview')}</option>
                  <option value="idea">{t('analytics')}</option>
                  <option value="goal">{t('statistics')}</option>
                  <option value="learning">{t('education')}</option>
                  <option value="reflection">{t('notes')}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredThoughts.map((thought) => (
                  <div key={thought.id} className="p-4 bg-muted rounded-lg shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-black">{thought.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center ${getCategoryColor(thought.category)}`}>
                        {getCategoryIcon(thought.category)}
                        <span className="ml-1 capitalize">{thought.category}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-black mb-3 line-clamp-3">{thought.content}</p>
                    
                    <div className="flex items-center justify-between text-xs text-black">
                      <div className="flex items-center space-x-2">
                        {thought.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-200 px-2 py-1 rounded-full flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(thought.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}