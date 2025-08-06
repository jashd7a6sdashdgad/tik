'use client';

import { useState, useEffect } from 'react';
import { searchAnalytics, SearchAnalytics } from '@/lib/search/searchAnalytics';
import { searchIndex } from '@/lib/search/searchIndex';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3, 
  Activity,
  Target,
  Lightbulb,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2
} from 'lucide-react';

export default function SearchDashboard() {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [indexStats, setIndexStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const analyticsData = searchAnalytics.getAnalytics();
      const stats = searchIndex.getStats();
      const recs = searchAnalytics.getOptimizationRecommendations();
      
      setAnalytics(analyticsData);
      setIndexStats(stats);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load search dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAnalytics = () => {
    if (confirm('Are you sure you want to clear all search analytics data?')) {
      searchAnalytics.clearAnalytics();
      loadData();
    }
  };

  const clearSearchIndex = () => {
    if (confirm('Are you sure you want to clear the entire search index?')) {
      searchIndex.clear();
      loadData();
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'improvement': return <Target className="h-4 w-4 text-blue-500" />;
      case 'info': return <Info className="h-4 w-4 text-gray-500" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Analytics</h1>
          <p className="text-gray-600">Monitor and optimize your search experience</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={clearAnalytics} size="sm" className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Analytics
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Searches</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalSearches || 0}</p>
              </div>
              <Search className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Queries</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.uniqueQueries || 0}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Results</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics?.averageResultsPerSearch || 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Session Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(analytics?.userBehavior.sessionDuration || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Index Stats */}
      {indexStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Search Index Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-xl font-semibold">{indexStats.totalDocuments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Index Size</p>
                <p className="text-xl font-semibold">{indexStats.indexSize}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tags</p>
                <p className="text-xl font-semibold">{indexStats.totalTags}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Words Indexed</p>
                <p className="text-xl font-semibold">{indexStats.totalWords}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Documents by Type</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(indexStats.documentsByType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-end">
              <Button variant="outline" onClick={clearSearchIndex} size="sm" className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Index
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Optimization Recommendations</span>
            </CardTitle>
            <CardDescription>
              Suggestions to improve your search experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  {getRecommendationIcon(rec.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    {rec.action && (
                      <p className="text-sm text-blue-600 mt-2 font-medium">
                        Action: {rec.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Queries */}
      {analytics?.topQueries && analytics.topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Top Search Queries</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topQueries.slice(0, 10).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-500 w-6">#{index + 1}</span>
                    <span className="font-medium">{query.query}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{query.count} searches</span>
                    <span>{new Date(query.lastUsed).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Behavior */}
      {analytics?.userBehavior && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Searched Types */}
          <Card>
            <CardHeader>
              <CardTitle>Content Types</CardTitle>
              <CardDescription>Most searched document types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.userBehavior.mostSearchedTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{type.type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${type.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {Math.round(type.percentage)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Search Hours</CardTitle>
              <CardDescription>When you search most frequently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.userBehavior.peakSearchHours.map((hour, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(hour.searches / Math.max(...analytics.userBehavior.peakSearchHours.map(h => h.searches))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {hour.searches}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Click-through Rates */}
      {analytics?.resultClickRates && analytics.resultClickRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Query Performance</CardTitle>
            <CardDescription>Click-through rates for your queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.resultClickRates.slice(0, 10).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="font-medium flex-1 truncate">{query.query}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">{query.totalResults} results</span>
                    <Badge 
                      variant={query.clickRate > 0.2 ? 'default' : query.clickRate > 0.1 ? 'secondary' : 'outline'}
                      className="min-w-16 text-center"
                    >
                      {Math.round(query.clickRate * 100)}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}