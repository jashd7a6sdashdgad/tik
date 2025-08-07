'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Search, Download, Loader2 } from 'lucide-react';

interface ScrapeResult {
  success: boolean;
  data?: any;
  message?: string;
}

export default function WebScraperPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scrape' | 'search'>('scrape');

  const handleScrape = async () => {
    if (!url.trim()) {
      alert(t('enterUrlToScrape'));
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/firecrawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'scrape',
          url: url.trim(),
          options: {
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            excludeTags: ['nav', 'footer', 'aside', 'script', 'style'],
            timeout: 30000
          }
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        console.log('Scrape successful:', data);
      } else {
        console.error('Scrape failed:', data.message);
      }
    } catch (error) {
      console.error('Error scraping URL:', error);
      setResult({
        success: false,
        message: t('failedToScrape')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      alert(t('enterSearchQuery'));
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/firecrawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          query: query.trim()
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        console.log('Search successful:', data);
      } else {
        console.error('Search failed:', data.message);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResult({
        success: false,
        message: t('failedToSearch')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t('copiedToClipboard'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {t('webScraperTitle')}
              </h1>
              <p className="text-gray-600 font-medium mt-1">Extract content from any website</p>
            </div>
          </div>
        </div>
        {/* Tab Selection */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeTab === 'scrape' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('scrape')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{t('scrapeUrl')}</span>
          </Button>
          <Button
            variant={activeTab === 'search' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('search')}
            className="flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>{t('webSearch')}</span>
          </Button>
        </div>

        {/* Input Section */}
        <Card className="bg-white border border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-black">
              {activeTab === 'scrape' ? (
                <>
                  <Download className="h-5 w-5 mr-2 text-primary" />
                  {t('scrapeWebsite')}
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2 text-primary" />
                  {t('searchWeb')}
                </>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {activeTab === 'scrape' ? (
              <>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="text-black bg-white"
                  disabled={isLoading}
                />
                
                <Button
                  onClick={handleScrape}
                  disabled={!url.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('scraping')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {t('scrapeWebsite')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder={t('enterSearchQuery')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="text-black bg-white"
                  disabled={isLoading}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                
                <Button
                  onClick={handleSearch}
                  disabled={!query.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('searching')}
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      {t('searchWeb')}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-black">
              <span className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-primary" />
                {t('results')}
              </span>
              {result?.success && result.data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    let contentToCopy = '';
                    
                    if (activeTab === 'scrape') {
                      if (Array.isArray(result.data)) {
                        const firstItem = result.data[0];
                        contentToCopy = firstItem?.content || firstItem?.markdown || firstItem?.text || '';
                      } else {
                        contentToCopy = result.data.markdown || 
                                      result.data.content || 
                                      result.data.data?.markdown || 
                                      result.data.data?.content ||
                                      result.data.data?.text ||
                                      result.data.text ||
                                      (typeof result.data === 'string' ? result.data : '');
                      }
                    } else {
                      contentToCopy = JSON.stringify(result.data, null, 2);
                    }
                    
                    copyToClipboard(contentToCopy || 'No content available');
                  }}
                >
                  {t('copy')}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {!result ? (
              <div className="text-center py-12 text-black">
                <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>{t('enterUrl')}</p>
                <p className="text-sm mt-2 text-gray-600">{t('resultsWillAppear')}</p>
              </div>
            ) : result.success ? (
              <div className="space-y-4">
                {activeTab === 'scrape' && result.data ? (
                  <div>
                    <div className="prose max-w-none bg-white p-4 border border-gray-200 rounded-lg h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-sm text-black">
                        {(() => {
                          // Extract clean content from the response
                          let content = '';
                          
                          if (Array.isArray(result.data)) {
                            // If data is an array, get content from first item
                            const firstItem = result.data[0];
                            content = firstItem?.content || firstItem?.markdown || firstItem?.text || '';
                          } else {
                            // If data is an object, extract content directly
                            content = result.data.markdown || 
                                     result.data.content || 
                                     result.data.data?.markdown || 
                                     result.data.data?.content ||
                                     result.data.data?.text ||
                                     result.data.text ||
                                     (typeof result.data === 'string' ? result.data : '');
                          }
                          
                          return content || t('noContentExtracted');
                        })()}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'search' && result.data ? (
                  <div>
                    {Array.isArray(result.data) ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {result.data.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
                            <h4 className="font-medium text-black mb-1">
                              {item.title || item.metadata?.title || `Result ${index + 1}`}
                            </h4>
                            {item.url && (
                              <p className="text-sm text-blue-600 mb-2">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {item.url}
                                </a>
                              </p>
                            )}
                            <p className="text-sm text-gray-700">
                              {item.description || item.content || item.markdown || t('noDescriptionAvailable')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : result.data.results && Array.isArray(result.data.results) ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {result.data.results.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
                            <h4 className="font-medium text-black mb-1">
                              {item.title || item.metadata?.title || `Result ${index + 1}`}
                            </h4>
                            {item.url && (
                              <p className="text-sm text-blue-600 mb-2">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {item.url}
                                </a>
                              </p>
                            )}
                            <p className="text-sm text-gray-700">
                              {item.description || item.content || item.markdown || t('noDescriptionAvailable')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        value={JSON.stringify(result.data, null, 2)}
                        readOnly
                        className="h-96 text-black font-mono text-sm resize-none bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-black">
                    <p>{t('noDataReturned')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">❌ {t('error')}</div>
                <p className="text-black">{result.message || t('error')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}