'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Stethoscope, ExternalLink, Github } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface MCPTool {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  icon: string;
  endpoint: string;
}

interface SearchResult {
  title: string;
  content: string;
  source: string;
  url?: string;
  authors?: string[];
  publishedDate?: string;
  relevanceScore?: number;
}

export default function MCPToolsPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<string>('medical');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/search/mcp');
      const data = await response.json();
      
      if (data.success) {
        setTools(data.data.tools);
      }
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/search/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          type: selectedTool,
          limit: 10,
          includeReferences: true
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data.results);
      } else {
        console.error('Search failed:', data.message);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'stethoscope':
        return <Stethoscope className="h-6 w-6" />;
      case 'book-open':
        return <BookOpen className="h-6 w-6" />;
      default:
        return <Search className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('mcpToolsTitle')}</h1>
              <p className="text-muted-foreground">{t('analyticsTitle')}</p>
            </div>
            
            <a 
              href="https://github.com/jashd7a6sdashdgad/web-mcp-agent.git"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-primary hover:text-accent smooth-transition"
            >
              <Github className="h-5 w-5" />
              <span>{t('import')}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Interface */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('search')}</CardTitle>
            <CardDescription>
              {t('settingsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="medical">{t('analytics')}</option>
                <option value="research">{t('statistics')}</option>
                <option value="general">{t('overview')}</option>
              </select>
              
              <Button onClick={handleSearch} loading={loading}>
                <Search className="h-4 w-4 mr-2" />
                {t('search')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Tools */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{t('mcpToolsTitle')}</CardTitle>
                <CardDescription>
                  {loadingTools ? t('loading') : `${tools.length} ${t('mcpToolsTitle')}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTools ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        className={`p-3 rounded-lg border smooth-transition cursor-pointer ${
                          selectedTool === tool.type
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedTool(tool.type)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-primary">
                            {getIcon(tool.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{tool.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {tool.description}
                            </p>
                            <span className="inline-block mt-2 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                              {tool.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Search Results */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('search')}</CardTitle>
                <CardDescription>
                  {searchResults.length > 0 
                    ? `${t('search')} ${searchResults.length} ${t('search')} "${searchQuery}"`
                    : t('search')
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-full mb-1"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-6">
                    {searchResults.map((result, index) => (
                      <div key={index} className="border-b border-border/50 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-primary hover:text-accent cursor-pointer">
                            {result.url ? (
                              <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                {result.title}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            ) : (
                              result.title
                            )}
                          </h3>
                          {result.relevanceScore && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {Math.round(result.relevanceScore * 100)}% {t('search')}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                          {result.content}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="bg-muted px-2 py-1 rounded">
                            {t('search')}: {result.source}
                          </span>
                          {result.authors && result.authors.length > 0 && (
                            <span className="bg-muted px-2 py-1 rounded">
                              {t('contacts')}: {result.authors.join(', ')}
                            </span>
                          )}
                          {result.publishedDate && (
                            <span className="bg-muted px-2 py-1 rounded">
                              {t('date')}: {new Date(result.publishedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('search')}</p>
                    <p className="text-sm">{t('search')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}