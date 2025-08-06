'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import SearchTrigger from '@/components/GlobalSearch/SearchTrigger';
import SearchDashboard from '@/components/GlobalSearch/SearchDashboard';
import { searchAnalytics } from '@/lib/search/searchAnalytics';
import { 
  Search, 
  Brain, 
  Filter, 
  TrendingUp, 
  Sparkles,
  BookOpen,
  BarChart3,
  Settings,
  Lightbulb
} from 'lucide-react';

export default function SearchPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const { indexData, getSearchStats } = useGlobalSearch();
  
  const [activeTab, setActiveTab] = useState<'search' | 'analytics'>('search');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchStats, setSearchStats] = useState<any>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  useEffect(() => {
    loadSearchData();
  }, []);

  const loadSearchData = async () => {
    try {
      // Get search statistics
      const stats = getSearchStats();
      setSearchStats(stats);
      
      // Get suggestions
      const suggestions = searchAnalytics.generateSuggestions();
      setSuggestions(suggestions);
      
      // Load recent queries from storage
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        const history = JSON.parse(stored);
        setRecentQueries(history.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  };

  const handleReindexData = async () => {
    await indexData();
    loadSearchData();
  };

  const searchExamples = [
    {
      query: "restaurant expenses last month",
      description: "Find all restaurant spending from the previous month",
      type: "Natural Language"
    },
    {
      query: "contacts from Microsoft",
      description: "Search for contacts working at Microsoft",
      type: "Filtered Search"
    },
    {
      query: "diary entries about work",
      description: "Find diary entries mentioning work topics",
      type: "Content Search"
    },
    {
      query: "expenses over $100",
      description: "Find high-value expense transactions",
      type: "Amount Filter"
    },
    {
      query: "calendar events this week",
      description: "Show upcoming calendar events",
      type: "Time Range"
    },
    {
      query: "photos from vacation",
      description: "Find photos tagged with vacation",
      type: "Tag Search"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center space-x-2">
                <Search className="h-6 w-6" />
                <span>Advanced Search</span>
              </h1>
              <p className="text-muted-foreground">
                Search across all your data with natural language and AI-powered filters
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={activeTab === 'search' ? 'default' : 'outline'}
                onClick={() => setActiveTab('search')}
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant={activeTab === 'analytics' ? 'default' : 'outline'}
                onClick={() => setActiveTab('analytics')}
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' ? (
          <SearchDashboard />
        ) : (
          <div className="space-y-8">
            {/* Search Interface */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Search Everything
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Use natural language to find exactly what you're looking for
                  </p>
                  
                  <div className="max-w-2xl mx-auto">
                    <SearchTrigger 
                      variant="input"
                      placeholder="Try 'restaurant expenses last month' or 'contacts from work'"
                      size="lg"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Search Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Natural Language</h3>
                    <p className="text-sm text-gray-600">
                      Search using everyday language, just like talking to a person
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <Filter className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Smart Filters</h3>
                    <p className="text-sm text-gray-600">
                      AI-powered filters that understand your intent and patterns
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <Sparkles className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">Global Search</h3>
                    <p className="text-sm text-gray-600">
                      Search across expenses, contacts, diary, calendar, and more
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Statistics */}
            {searchStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Searchable Items</p>
                        <p className="text-2xl font-bold">{searchStats.totalDocuments}</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Data Types</p>
                        <p className="text-2xl font-bold">
                          {Object.keys(searchStats.documentsByType).length}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Index Size</p>
                        <p className="text-2xl font-bold">{searchStats.indexSize}</p>
                      </div>
                      <Settings className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Words Indexed</p>
                        <p className="text-2xl font-bold">{searchStats.totalWords}</p>
                      </div>
                      <Search className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Queries and Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Search Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>Search Examples</span>
                  </CardTitle>
                  <CardDescription>
                    Try these example queries to see what's possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchExamples.map((example, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {example.query}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {example.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{example.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions and Recent */}
              <div className="space-y-6">
                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-5 w-5" />
                        <span>Smart Suggestions</span>
                      </CardTitle>
                      <CardDescription>
                        Personalized suggestions based on your usage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {suggestions.slice(0, 5).map((suggestion, index) => (
                          <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <span className="text-sm">{suggestion.text}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(suggestion.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Queries */}
                {recentQueries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Recent Searches</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {recentQueries.map((query, index) => (
                          <div key={index} className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <code className="text-sm font-mono">{query}</code>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Index Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Search Index</CardTitle>
                    <CardDescription>
                      Manage your search data and indexing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button onClick={handleReindexData} className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Reindex All Data
                      </Button>
                      <p className="text-sm text-gray-600">
                        Last updated: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}