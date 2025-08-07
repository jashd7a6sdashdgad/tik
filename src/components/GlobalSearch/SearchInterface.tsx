'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchDocument, SearchResult, searchIndex } from '@/lib/search/searchIndex';
import { nlProcessor, ParsedQuery } from '@/lib/search/naturalLanguageProcessor';
import { smartFilterEngine, FilterSuggestion, ContentInsight } from '@/lib/search/smartFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Mic, 
  X, 
  Clock, 
  Tag, 
  TrendingUp, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  Target,
  Zap
} from 'lucide-react';

interface SearchInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function SearchInterface({ isOpen, onClose, initialQuery = '' }: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [filterSuggestions, setFilterSuggestions] = useState<FilterSuggestion[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [insights, setInsights] = useState<ContentInsight[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load search history
  useEffect(() => {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    }
  }, []);

  // Auto-complete suggestions
  useEffect(() => {
    if (query.length > 2) {
      const autoSuggestions = searchIndex.getSuggestions(query, 5);
      const nlSuggestions = nlProcessor.getSuggestions(query);
      setSuggestions([...autoSuggestions, ...nlSuggestions]);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setParsedQuery(null);
      setFilterSuggestions([]);
      setInsights([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    
    try {
      // Parse natural language query
      const parsed = nlProcessor.parseQuery(searchQuery);
      setParsedQuery(parsed);
      
      // Convert to search query
      const searchParams = nlProcessor.toSearchQuery(parsed);
      
      // Perform search
      const searchResults = searchIndex.search(searchParams);
      setResults(searchResults);
      
      // Apply filters if any
      let filteredDocuments = searchResults.map(r => r.document);
      if (appliedFilters.length > 0) {
        filteredDocuments = smartFilterEngine.applyFilters(filteredDocuments, appliedFilters);
      }
      
      // Get filter suggestions
      const filterSugs = smartFilterEngine.getSuggestions(searchQuery, filteredDocuments);
      setFilterSuggestions(filterSugs);
      
      // Generate insights
      const contentInsights = smartFilterEngine.generateInsights(filteredDocuments);
      setInsights(contentInsights);
      
      // Record search for learning
      smartFilterEngine.recordSearch(searchQuery, searchResults);
      
      // Add to search history
      addToSearchHistory(searchQuery);
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  const addToSearchHistory = (searchQuery: string) => {
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    
    try {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  };

  const applyFilter = (filterId: string) => {
    const newFilters = [...appliedFilters, filterId];
    setAppliedFilters(newFilters);
    
    if (query.trim()) {
      performSearch(query);
    }
  };

  const removeFilter = (filterId: string) => {
    const newFilters = appliedFilters.filter(f => f !== filterId);
    setAppliedFilters(newFilters);
    
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    
    // Navigate to relevant page based on document type
    const doc = result.document;
    switch (doc.type) {
      case 'expense':
        router.push('/expenses');
        break;
      case 'contact':
        router.push('/contacts');
        break;
      case 'diary':
        router.push('/diary');
        break;
      case 'calendar':
        router.push('/calendar');
        break;
      case 'photo':
        router.push('/photos');
        break;
      case 'email':
        router.push('/email');
        break;
      case 'shopping-list':
        router.push('/shopping-list');
        break;
    }
    
    onClose();
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'expense': return '💰';
      case 'contact': return '👤';
      case 'diary': return '📖';
      case 'calendar': return '📅';
      case 'photo': return '📸';
      case 'email': return '📧';
      case 'shopping-list': return '🛒';
      default: return '📄';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <TrendingUp className="h-4 w-4" />;
      case 'anomaly': return <Zap className="h-4 w-4" />;
      case 'trend': return <Target className="h-4 w-4" />;
      case 'correlation': return <Brain className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search everything... Try 'restaurant expenses last month'"
                className="pl-10 pr-20 text-lg h-12"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={startVoiceSearch}
                  disabled={isListening}
                  className="h-8 w-8 p-0"
                >
                  <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
            
            <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Query Analysis */}
          {parsedQuery && parsedQuery.confidence > 50 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Query Understanding</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(parsedQuery.confidence)}% confident
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedQuery.entities.type && (
                  <Badge variant="outline">
                    📄 {parsedQuery.entities.type.join(', ')}
                  </Badge>
                )}
                {parsedQuery.entities.timeRange && (
                  <Badge variant="outline">
                    🕒 {parsedQuery.entities.timeRange.description}
                  </Badge>
                )}
                {parsedQuery.entities.category && (
                  <Badge variant="outline">
                    🏷️ {parsedQuery.entities.category.join(', ')}
                  </Badge>
                )}
                {parsedQuery.entities.amount && (
                  <Badge variant="outline">
                    💰 {parsedQuery.entities.amount.min ? `>${parsedQuery.entities.amount.min}` : ''}
                    {parsedQuery.entities.amount.max ? `<${parsedQuery.entities.amount.max}` : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Applied Filters */}
          {appliedFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {appliedFilters.map(filterId => {
                const filter = filterSuggestions.find(fs => fs.filter.id === filterId)?.filter;
                return (
                  <Badge key={filterId} variant="default" className="flex items-center space-x-1">
                    <Filter className="h-3 w-3" />
                    <span>{filter?.name || filterId}</span>
                    <button onClick={() => removeFilter(filterId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex h-[calc(80vh-120px)]">
          {/* Main Results */}
          <div className="flex-1 overflow-auto p-4">
            {/* Suggestions */}
            {suggestions.length > 0 && query.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Suggestions</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(suggestion)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search History */}
            {query.length === 0 && searchHistory.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Recent Searches
                </h3>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(item)}
                      className="block text-left text-sm text-gray-700 hover:bg-gray-100 px-3 py-2 rounded w-full"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    Found {results.length} results
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-1"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {results.map((result, index) => (
                  <Card 
                    key={result.document.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getDocumentIcon(result.document.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.document.title}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {result.document.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(result.score)}% match
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {result.document.content}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{new Date(result.document.timestamp).toLocaleDateString()}</span>
                            {result.document.tags.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Tag className="h-3 w-3" />
                                <span>{result.document.tags.slice(0, 3).join(', ')}</span>
                              </div>
                            )}
                          </div>
                          
                          {result.highlights.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {result.highlights.slice(0, 3).map((highlight, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-yellow-50 border-yellow-200">
                                  {highlight}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && query.trim() && results.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try adjusting your search terms or using different keywords.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {(showAdvanced || filterSuggestions.length > 0 || insights.length > 0) && (
            <div className="w-80 border-l bg-gray-50 overflow-auto p-4">
              {/* Smart Filters */}
              {filterSuggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Smart Filters
                  </h3>
                  <div className="space-y-2">
                    {filterSuggestions.slice(0, 3).map((suggestion) => (
                      <Card key={suggestion.filter.id} className="cursor-pointer hover:bg-white transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">{suggestion.filter.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(suggestion.relevance * 100)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{suggestion.reasoning}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {suggestion.preview.totalResults} results
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyFilter(suggestion.filter.id)}
                              disabled={appliedFilters.includes(suggestion.filter.id)}
                              className="h-6 text-xs"
                            >
                              Apply
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {insights.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1" />
                    Insights
                  </h3>
                  <div className="space-y-2">
                    {insights.slice(0, 3).map((insight, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-start space-x-2">
                            {getInsightIcon(insight.type)}
                            <div className="flex-1">
                              <h4 className="text-sm font-medium mb-1">{insight.title}</h4>
                              <p className="text-xs text-gray-600">{insight.description}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {Math.round(insight.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}