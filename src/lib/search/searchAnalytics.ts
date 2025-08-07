// Search Analytics and User Behavior Tracking System

import { SearchResult } from './searchIndex';

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsPerSearch: number;
  topQueries: Array<{ query: string; count: number; lastUsed: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  resultClickRates: Array<{ query: string; clickRate: number; totalResults: number }>;
  popularFilters: Array<{ filterId: string; usage: number }>;
  userBehavior: {
    averageQueryLength: number;
    mostSearchedTypes: Array<{ type: string; percentage: number }>;
    peakSearchHours: Array<{ hour: number; searches: number }>;
    sessionDuration: number;
  };
}

export interface SearchSuggestion {
  id: string;
  type: 'query' | 'filter' | 'trending' | 'personalized';
  text: string;
  confidence: number;
  reasoning: string;
  metadata?: any;
}

export interface QueryPerformance {
  query: string;
  resultCount: number;
  averageRelevanceScore: number;
  clickThroughRate: number;
  refinementRate: number;
  satisfaction: number;
}

// Define a type for your recommendation objects
interface Recommendation {
  type: 'warning' | 'improvement' | 'info';
  title: string;
  description: string;
  action: string;
}

class SearchAnalyticsEngine {
  private searches: Array<{
    id: string;
    query: string;
    timestamp: number;
    results: SearchResult[];
    clickedResults: string[];
    refinements: string[];
    sessionId: string;
    userAgent: string;
    filters: string[];
  }> = [];

  private sessions: Map<string, {
    id: string;
    startTime: number;
    endTime?: number;
    searches: string[];
    totalClicks: number;
  }> = new Map();

  private queryPerformance: Map<string, QueryPerformance> = new Map();
  private personalizedSuggestions: Map<string, SearchSuggestion[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // Record a search event
  recordSearch(
    query: string,
    results: SearchResult[],
    filters: string[] = [],
    sessionId?: string
  ): string {
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentSessionId = sessionId || this.getCurrentSessionId();

    const searchRecord = {
      id: searchId,
      query: query.trim().toLowerCase(),
      timestamp: Date.now(),
      results,
      clickedResults: [],
      refinements: [],
      sessionId: currentSessionId,
      userAgent: navigator.userAgent,
      filters
    };

    this.searches.push(searchRecord);
    this.updateSession(currentSessionId, searchId);
    this.updateQueryPerformance(query, results);
    
    // Keep only last 1000 searches
    if (this.searches.length > 1000) {
      this.searches = this.searches.slice(-1000);
    }

    this.saveToStorage();
    return searchId;
  }

  // Record result click
  recordResultClick(searchId: string, resultId: string): void {
    const search = this.searches.find(s => s.id === searchId);
    if (search) {
      search.clickedResults.push(resultId);
      
      const session = this.sessions.get(search.sessionId);
      if (session) {
        session.totalClicks++;
      }

      // Update query performance
      const performance = this.queryPerformance.get(search.query);
      if (performance) {
        const totalClicks = this.searches
          .filter(s => s.query === search.query)
          .reduce((sum, s) => sum + s.clickedResults.length, 0);
        
        const totalSearches = this.searches.filter(s => s.query === search.query).length;
        performance.clickThroughRate = totalSearches > 0 ? totalClicks / totalSearches : 0;
      }

      this.saveToStorage();
    }
  }

  // Record query refinement
  recordQueryRefinement(originalSearchId: string, newQuery: string): void {
    const search = this.searches.find(s => s.id === originalSearchId);
    if (search) {
      search.refinements.push(newQuery);

      // Update refinement rate
      const performance = this.queryPerformance.get(search.query);
      if (performance) {
        const totalRefinements = this.searches
          .filter(s => s.query === search.query)
          .reduce((sum, s) => sum + s.refinements.length, 0);
        
        const totalSearches = this.searches.filter(s => s.query === search.query).length;
        performance.refinementRate = totalSearches > 0 ? totalRefinements / totalSearches : 0;
      }

      this.saveToStorage();
    }
  }

  // Get comprehensive analytics
  getAnalytics(): SearchAnalytics {
    const totalSearches = this.searches.length;
    const uniqueQueries = new Set(this.searches.map(s => s.query)).size;
    const averageResults = totalSearches > 0 ? this.searches.reduce((sum, s) => sum + s.results.length, 0) / totalSearches : 0;

    // Top queries
    const queryCount = new Map<string, { count: number; lastUsed: number }>();
    this.searches.forEach(search => {
      const existing = queryCount.get(search.query) || { count: 0, lastUsed: 0 };
      queryCount.set(search.query, {
        count: existing.count + 1,
        lastUsed: Math.max(existing.lastUsed, search.timestamp)
      });
    });

    const topQueries = Array.from(queryCount.entries())
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Search trends (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const trendData = new Map<string, number>();
    
    this.searches
      .filter(s => s.timestamp > thirtyDaysAgo)
      .forEach(search => {
        const date = new Date(search.timestamp).toISOString().split('T')[0];
        trendData.set(date, (trendData.get(date) || 0) + 1);
      });

    const searchTrends = Array.from(trendData.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Result click rates
    const resultClickRates = Array.from(queryCount.entries())
      .filter(([, data]) => data.count > 2) // Only queries with multiple searches
      .map(([query]) => {
        const querySearches = this.searches.filter(s => s.query === query);
        const totalResults = querySearches.reduce((sum, s) => sum + s.results.length, 0);
        const totalClicks = querySearches.reduce((sum, s) => sum + s.clickedResults.length, 0);
        
        return {
          query,
          clickRate: totalResults > 0 ? totalClicks / totalResults : 0,
          totalResults
        };
      })
      .sort((a, b) => b.clickRate - a.clickRate)
      .slice(0, 10);

    // Popular filters
    const filterUsage = new Map<string, number>();
    this.searches.forEach(search => {
      search.filters.forEach(filter => {
        filterUsage.set(filter, (filterUsage.get(filter) || 0) + 1);
      });
    });

    const popularFilters = Array.from(filterUsage.entries())
      .map(([filterId, usage]) => ({ filterId, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    // User behavior analysis
    const queryLengths = this.searches.map(s => s.query.length);
    const averageQueryLength = queryLengths.length > 0 ? queryLengths.reduce((sum, len) => sum + len, 0) / queryLengths.length : 0;

    // Most searched types
    const typeCount = new Map<string, number>();
    this.searches.forEach(search => {
      search.results.forEach(result => {
        typeCount.set(result.document.type, (typeCount.get(result.document.type) || 0) + 1);
      });
    });

    const totalTypeResults = Array.from(typeCount.values()).reduce((sum, count) => sum + count, 0);
    const mostSearchedTypes = Array.from(typeCount.entries())
      .map(([type, count]) => ({
        type,
        percentage: totalTypeResults > 0 ? (count / totalTypeResults) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Peak search hours
    const hourCount = new Map<number, number>();
    this.searches.forEach(search => {
      const hour = new Date(search.timestamp).getHours();
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
    });

    const peakSearchHours = Array.from(hourCount.entries())
      .map(([hour, searches]) => ({ hour, searches }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 5);

    // Average session duration
    const completedSessions = Array.from(this.sessions.values()).filter(s => s.endTime);
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0) / completedSessions.length
      : 0;

    return {
      totalSearches,
      uniqueQueries,
      averageResultsPerSearch: averageResults,
      topQueries,
      searchTrends,
      resultClickRates,
      popularFilters,
      userBehavior: {
        averageQueryLength,
        mostSearchedTypes,
        peakSearchHours,
        sessionDuration: averageSessionDuration
      }
    };
  }

  // Generate personalized suggestions
  generateSuggestions(currentQuery: string = ''): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Query-based suggestions
    if (currentQuery.length > 2) {
      const similarQueries = this.findSimilarQueries(currentQuery, 3);
      similarQueries.forEach(query => {
        suggestions.push({
          id: `query_${query}`,
          type: 'query',
          text: query,
          confidence: 0.8,
          reasoning: 'Based on similar searches'
        });
      });
    }

    // Trending suggestions
    const trendingQueries = this.getTrendingQueries(3);
    trendingQueries.forEach(query => {
      suggestions.push({
        id: `trending_${query}`,
        type: 'trending',
        text: query,
        confidence: 0.7,
        reasoning: 'Popular right now'
      });
    });

    // Personalized suggestions based on history
    const personalizedQueries = this.getPersonalizedQueries(3);
    personalizedQueries.forEach(query => {
      suggestions.push({
        id: `personalized_${query}`,
        type: 'personalized',
        text: query,
        confidence: 0.9,
        reasoning: 'Based on your search history'
      });
    });

    // Filter suggestions
    const popularFilters = this.getPopularFilters(2);
    popularFilters.forEach(filter => {
      suggestions.push({
        id: `filter_${filter.filterId}`,
        type: 'filter',
        text: `Use ${filter.filterId} filter`,
        confidence: 0.6,
        reasoning: 'Popular filter option',
        metadata: { filterId: filter.filterId }
      });
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  // Get query performance metrics
  getQueryPerformance(query: string): QueryPerformance | null {
    return this.queryPerformance.get(query.toLowerCase()) || null;
  }

  // Get search optimization recommendations
  getOptimizationRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const analytics = this.getAnalytics();
  
    // Low click-through rates
    const lowCTRQueries = analytics.resultClickRates.filter(r => r.clickRate < 0.1);
    if (lowCTRQueries.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Low Click-Through Rates',
        description: `${lowCTRQueries.length} queries have very low click rates, suggesting poor result relevance.`,
        action: 'Review search algorithm and result ranking'
      });
    }
  
    // High refinement rates
    const highRefinementQueries = Array.from(this.queryPerformance.values())
      .filter(p => p.refinementRate > 0.5);
  
    if (highRefinementQueries.length > 0) {
      recommendations.push({
        type: 'improvement',
        title: 'High Query Refinement',
        description: `${highRefinementQueries.length} queries are frequently refined, indicating initial results may not be optimal.`,
        action: 'Improve natural language processing and result relevance'
      });
    }
  
    // Popular search times
    if (analytics.userBehavior.peakSearchHours.length > 0) {
      const peakHour = analytics.userBehavior.peakSearchHours[0];
      recommendations.push({
        type: 'info',
        title: 'Peak Usage Pattern',
        description: `Most searches occur at ${peakHour.hour}:00 with ${peakHour.searches} searches.`,
        action: 'Consider optimizing performance during peak hours'
      });
    }
  
    // Search diversity
    if (analytics.uniqueQueries / analytics.totalSearches < 0.3) {
      recommendations.push({
        type: 'info',
        title: 'Repetitive Searches',
        description: 'Users frequently repeat the same searches.',
        action: 'Consider improving search suggestions and result persistence'
      });
    }
  
    return recommendations;
  }

  // Helper methods
  private getCurrentSessionId(): string {
    const sessionKey = 'currentSearchSession';
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(sessionKey, sessionId);
      
      this.sessions.set(sessionId, {
        id: sessionId,
        startTime: Date.now(),
        searches: [],
        totalClicks: 0
      });
    }
    
    return sessionId;
  }

  private updateSession(sessionId: string, searchId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.searches.push(searchId);
      session.endTime = Date.now();
    }
  }

  private updateQueryPerformance(query: string, results: SearchResult[]): void {
    const queryLower = query.toLowerCase();
    const existing = this.queryPerformance.get(queryLower);
    
    const averageScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

    if (existing) {
      // Update existing performance metrics
      existing.resultCount = (existing.resultCount + results.length) / 2;
      existing.averageRelevanceScore = (existing.averageRelevanceScore + averageScore) / 2;
    } else {
      // Create new performance record
      this.queryPerformance.set(queryLower, {
        query: queryLower,
        resultCount: results.length,
        averageRelevanceScore: averageScore,
        clickThroughRate: 0,
        refinementRate: 0,
        satisfaction: 0
      });
    }
  }

  private findSimilarQueries(query: string, limit: number): string[] {
    const queryWords = query.toLowerCase().split(' ');
    const similar: Array<{ query: string; similarity: number }> = [];

    this.searches.forEach(search => {
      if (search.query === query.toLowerCase()) return;

      const searchWords = search.query.split(' ');
      const commonWords = queryWords.filter(word => searchWords.includes(word));
      const similarity = commonWords.length / Math.max(queryWords.length, searchWords.length);

      if (similarity > 0.3) {
        similar.push({ query: search.query, similarity });
      }
    });

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.query);
  }

  private getTrendingQueries(limit: number): string[] {
    const recent = Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days
    const recentQueries = new Map<string, number>();

    this.searches
      .filter(s => s.timestamp > recent)
      .forEach(search => {
        recentQueries.set(search.query, (recentQueries.get(search.query) || 0) + 1);
      });

    return Array.from(recentQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  private getPersonalizedQueries(limit: number): string[] {
    const queryFrequency = new Map<string, number>();
    
    this.searches.forEach(search => {
      queryFrequency.set(search.query, (queryFrequency.get(search.query) || 0) + 1);
    });

    return Array.from(queryFrequency.entries())
      .filter(([, count]) => count > 1) // Only repeated queries
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  private getPopularFilters(limit: number): Array<{ filterId: string; usage: number }> {
    const filterUsage = new Map<string, number>();
    
    this.searches.forEach(search => {
      search.filters.forEach(filter => {
        filterUsage.set(filter, (filterUsage.get(filter) || 0) + 1);
      });
    });

    return Array.from(filterUsage.entries())
      .map(([filterId, usage]) => ({ filterId, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  }

  // Clear analytics data
  clearAnalytics(): void {
    this.searches = [];
    this.sessions.clear();
    this.queryPerformance.clear();
    this.personalizedSuggestions.clear();
    this.saveToStorage();
    sessionStorage.removeItem('currentSearchSession');
  }

  // Storage methods
  private saveToStorage(): void {
    try {
      const data = {
        searches: this.searches.slice(-500), // Keep last 500 searches
        sessions: Array.from(this.sessions.entries()),
        queryPerformance: Array.from(this.queryPerformance.entries())
      };
      
      localStorage.setItem('searchAnalytics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save search analytics:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('searchAnalytics');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      this.searches = data.searches || [];
      this.sessions = new Map(data.sessions || []);
      this.queryPerformance = new Map(data.queryPerformance || []);
    } catch (error) {
      console.warn('Failed to load search analytics:', error);
    }
  }
}

// Global search analytics instance
export const searchAnalytics = new SearchAnalyticsEngine();