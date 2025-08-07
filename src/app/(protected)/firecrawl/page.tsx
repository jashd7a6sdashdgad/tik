'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Search, Link, FileText, Clock, Download, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface CrawlResult {
  id: string;
  url: string;
  title: string;
  content: string;
  crawled_at: string;
  status: 'success' | 'error' | 'pending';
}

export default function FirecrawlPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCrawls: 0,
    successfulCrawls: 0,
    totalPages: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    // Mock data - replace with actual Firecrawl API calls
    setStats({
      totalCrawls: 47,
      successfulCrawls: 44,
      totalPages: 312,
      avgResponseTime: 2.3
    });
    
    setCrawlResults([
      {
        id: '1',
        url: 'https://example.com/blog/ai-trends',
        title: 'Latest AI Trends in 2025',
        content: 'Artificial intelligence continues to evolve with new breakthroughs in machine learning...',
        crawled_at: '2025-07-31T09:30:00Z',
        status: 'success'
      },
      {
        id: '2',
        url: 'https://example.com/docs/api-guide',
        title: 'API Integration Guide',
        content: 'This comprehensive guide covers everything you need to know about integrating...',
        crawled_at: '2025-07-31T08:15:00Z',
        status: 'success'
      },
      {
        id: '3',
        url: 'https://example.com/news/updates',
        title: 'Product Updates',
        content: 'We are excited to announce several new features and improvements...',
        crawled_at: '2025-07-31T07:45:00Z',
        status: 'pending'
      }
    ]);
  }, []);

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    
    setIsLoading(true);
    
    // Mock crawl process - replace with actual Firecrawl API call
    setTimeout(() => {
      const newResult: CrawlResult = {
        id: Date.now().toString(),
        url: crawlUrl,
        title: `Crawled: ${crawlUrl}`,
        content: 'Content will be extracted from the crawled page...',
        crawled_at: new Date().toISOString(),
        status: 'success'
      };
      
      setCrawlResults(prev => [newResult, ...prev]);
      setCrawlUrl('');
      setIsLoading(false);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalCrawls: prev.totalCrawls + 1,
        successfulCrawls: prev.successfulCrawls + 1,
        totalPages: prev.totalPages + 1
      }));
    }, 3000);
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(crawlResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `firecrawl-results-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('firecrawlTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('webScraperTitle')}</p>
              </div>
            </div>
            
            <Button onClick={exportResults}>
              <Download className="h-4 w-4 mr-2" />
              {t('export')} {t('results')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('overview')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalCrawls}</p>
                </div>
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('statistics')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.round((stats.successfulCrawls / stats.totalCrawls) * 100)}%
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('results')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalPages}</p>
                </div>
                <Link className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('loading')}</p>
                  <p className="text-2xl font-bold text-primary">{stats.avgResponseTime}s</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crawl Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <Search className="h-5 w-5 mr-2" />
              {t('webScraper')}
            </CardTitle>
            <CardDescription className="text-black">
              {t('enterUrl')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Input
                placeholder={t('url')}
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleCrawl} 
                disabled={isLoading || !crawlUrl.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    {t('search')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Crawl Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              <FileText className="h-5 w-5 mr-2" />
              {t('results')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {crawlResults.map((result) => (
                <div key={result.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-black mb-1">{result.title}</h4>
                      <p className="text-sm text-blue-600 mb-2 break-all">{result.url}</p>
                      <p className="text-sm text-black line-clamp-2">{result.content}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        result.status === 'success' ? 'bg-green-100 text-green-800' :
                        result.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-black">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(result.crawled_at).toLocaleString()}
                    </span>
                    <Button size="sm" variant="ghost">
                      <FileText className="h-3 w-3 mr-1" />
                      {t('overview')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}