// Smart Filter Engine for Intelligent Search and Content Filtering

import { SearchDocument, SearchResult } from './searchIndex';

export interface SmartFilter {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'behavioral' | 'temporal' | 'financial' | 'contextual';
  confidence: number;
  apply: (documents: SearchDocument[]) => SearchDocument[];
}

export interface FilterSuggestion {
  filter: SmartFilter;
  relevance: number;
  reasoning: string;
  preview: {
    totalResults: number;
    sampleResults: SearchDocument[];
  };
}

export interface ContentInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  data: any;
}

class SmartFilterEngine {
  private filters: Map<string, SmartFilter> = new Map();
  private userPreferences: Map<string, number> = new Map();
  private searchHistory: Array<{ query: string; results: SearchResult[]; timestamp: number }> = [];

  constructor() {
    this.initializeFilters();
    this.loadUserPreferences();
  }

  private initializeFilters(): void {
    // Content-based filters
    this.addFilter({
      id: 'high-value-expenses',
      name: 'High Value Expenses',
      description: 'Expenses above your typical spending pattern',
      category: 'financial',
      confidence: 0.85,
      apply: (docs) => this.filterHighValueExpenses(docs)
    });

    this.addFilter({
      id: 'recurring-patterns',
      name: 'Recurring Patterns',
      description: 'Items that appear regularly in your data',
      category: 'behavioral',
      confidence: 0.80,
      apply: (docs) => this.filterRecurringPatterns(docs)
    });

    this.addFilter({
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Items from your most active periods',
      category: 'temporal',
      confidence: 0.90,
      apply: (docs) => this.filterRecentActivity(docs)
    });

    this.addFilter({
      id: 'similar-content',
      name: 'Similar Content',
      description: 'Items similar to your recent searches',
      category: 'content',
      confidence: 0.75,
      apply: (docs) => this.filterSimilarContent(docs)
    });

    this.addFilter({
      id: 'important-contacts',
      name: 'Important Contacts',
      description: 'Frequently contacted or VIP contacts',
      category: 'behavioral',
      confidence: 0.85,
      apply: (docs) => this.filterImportantContacts(docs)
    });

    this.addFilter({
      id: 'location-based',
      name: 'Location Context',
      description: 'Items related to your current or frequent locations',
      category: 'contextual',
      confidence: 0.70,
      apply: (docs) => this.filterLocationBased(docs)
    });

    this.addFilter({
      id: 'expense-anomalies',
      name: 'Unusual Expenses',
      description: 'Expenses that deviate from your normal patterns',
      category: 'financial',
      confidence: 0.75,
      apply: (docs) => this.filterExpenseAnomalies(docs)
    });

    this.addFilter({
      id: 'productivity-peaks',
      name: 'Productivity Peaks',
      description: 'Content from your most productive time periods',
      category: 'temporal',
      confidence: 0.80,
      apply: (docs) => this.filterProductivityPeaks(docs)
    });

    this.addFilter({
      id: 'mood-based',
      name: 'Mood Context',
      description: 'Content that matches emotional patterns in your diary',
      category: 'contextual',
      confidence: 0.65,
      apply: (docs) => this.filterMoodBased(docs)
    });

    this.addFilter({
      id: 'project-related',
      name: 'Project Context',
      description: 'Items related to ongoing projects or goals',
      category: 'contextual',
      confidence: 0.80,
      apply: (docs) => this.filterProjectRelated(docs)
    });
  }

  // Add a filter to the engine
  private addFilter(filter: Omit<SmartFilter, 'apply'> & { apply: (docs: SearchDocument[]) => SearchDocument[] }): void {
    this.filters.set(filter.id, filter as SmartFilter);
  }

  // Get filter suggestions based on query and context
  getSuggestions(query: string, documents: SearchDocument[]): FilterSuggestion[] {
    const suggestions: FilterSuggestion[] = [];
    
    for (const filter of this.filters.values()) {
      const relevance = this.calculateFilterRelevance(filter, query, documents);
      
      if (relevance > 0.3) {
        const preview = this.previewFilter(filter, documents);
        const reasoning = this.generateFilterReasoning(filter, query, preview);
        
        suggestions.push({
          filter,
          relevance,
          reasoning,
          preview
        });
      }
    }

    // Sort by relevance
    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  // Apply multiple filters with ranking
  applyFilters(documents: SearchDocument[], filterIds: string[]): SearchDocument[] {
    let filtered = documents;
    
    for (const filterId of filterIds) {
      const filter = this.filters.get(filterId);
      if (filter) {
        filtered = filter.apply(filtered);
        
        // Update filter usage statistics
        this.updateFilterUsage(filterId);
      }
    }
    
    return filtered;
  }

  // Generate content insights from documents
  generateInsights(documents: SearchDocument[]): ContentInsight[] {
    const insights: ContentInsight[] = [];
    
    // Spending patterns
    const expenseInsights = this.analyzeExpensePatterns(documents);
    insights.push(...expenseInsights);
    
    // Time-based patterns
    const temporalInsights = this.analyzeTemporalPatterns(documents);
    insights.push(...temporalInsights);
    
    // Content correlations
    const correlationInsights = this.analyzeContentCorrelations(documents);
    insights.push(...correlationInsights);
    
    // Behavioral anomalies
    const anomalyInsights = this.detectAnomalies(documents);
    insights.push(...anomalyInsights);
    
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  // Calculate filter relevance for suggestions
  private calculateFilterRelevance(filter: SmartFilter, query: string, documents: SearchDocument[]): number {
    let relevance = 0;
    const queryLower = query.toLowerCase();
    
    // Query keyword matching
    if (queryLower.includes('expensive') || queryLower.includes('high') || queryLower.includes('costly')) {
      if (filter.id === 'high-value-expenses') relevance += 0.8;
    }
    
    if (queryLower.includes('recent') || queryLower.includes('latest') || queryLower.includes('new')) {
      if (filter.id === 'recent-activity') relevance += 0.9;
    }
    
    if (queryLower.includes('similar') || queryLower.includes('like') || queryLower.includes('related')) {
      if (filter.id === 'similar-content') relevance += 0.7;
    }
    
    if (queryLower.includes('unusual') || queryLower.includes('strange') || queryLower.includes('different')) {
      if (filter.id === 'expense-anomalies') relevance += 0.8;
    }
    
    // Document type relevance
    const hasExpenses = documents.some(doc => doc.type === 'expense');
    const hasContacts = documents.some(doc => doc.type === 'contact');
    const hasDiary = documents.some(doc => doc.type === 'diary');
    
    if (hasExpenses && ['high-value-expenses', 'expense-anomalies', 'recurring-patterns'].includes(filter.id)) {
      relevance += 0.5;
    }
    
    if (hasContacts && filter.id === 'important-contacts') {
      relevance += 0.6;
    }
    
    if (hasDiary && ['mood-based', 'productivity-peaks'].includes(filter.id)) {
      relevance += 0.4;
    }
    
    // User preference boost
    const userPreference = this.userPreferences.get(filter.id) || 0;
    relevance += userPreference * 0.3;
    
    // Base filter confidence
    relevance = Math.min(relevance + filter.confidence * 0.2, 1.0);
    
    return relevance;
  }

  // Preview filter results
  private previewFilter(filter: SmartFilter, documents: SearchDocument[]): FilterSuggestion['preview'] {
    const filtered = filter.apply(documents.slice(0, 100)); // Limit for preview
    
    return {
      totalResults: filtered.length,
      sampleResults: filtered.slice(0, 3)
    };
  }

  // Generate reasoning for filter suggestion
  private generateFilterReasoning(filter: SmartFilter, query: string, preview: FilterSuggestion['preview']): string {
    const reasons: string[] = [];
    
    if (preview.totalResults > preview.sampleResults.length) {
      reasons.push(`Found ${preview.totalResults} matching items`);
    }
    
    switch (filter.id) {
      case 'high-value-expenses':
        reasons.push('Based on your spending patterns');
        break;
      case 'recent-activity':
        reasons.push('Focuses on your latest activity');
        break;
      case 'similar-content':
        reasons.push('Similar to your recent searches');
        break;
      case 'recurring-patterns':
        reasons.push('Identifies repeated behaviors');
        break;
      case 'important-contacts':
        reasons.push('Highlights frequently contacted people');
        break;
      case 'expense-anomalies':
        reasons.push('Shows unusual spending patterns');
        break;
    }
    
    return reasons.join('. ');
  }

  // Filter implementations
  private filterHighValueExpenses(docs: SearchDocument[]): SearchDocument[] {
    const expenses = docs.filter(doc => doc.type === 'expense' && doc.metadata.debitAmount);
    
    if (expenses.length === 0) return [];
    
    // Calculate 80th percentile
    const amounts = expenses.map(doc => doc.metadata.debitAmount).sort((a, b) => a - b);
    const threshold = amounts[Math.floor(amounts.length * 0.8)] || 0;
    
    return expenses.filter(doc => doc.metadata.debitAmount > threshold);
  }

  private filterRecurringPatterns(docs: SearchDocument[]): SearchDocument[] {
    const patterns = new Map<string, SearchDocument[]>();
    
    docs.forEach(doc => {
      const key = this.generatePatternKey(doc);
      if (!patterns.has(key)) {
        patterns.set(key, []);
      }
      patterns.get(key)!.push(doc);
    });
    
    // Return documents that appear in patterns of 3 or more
    const recurring: SearchDocument[] = [];
    for (const [, documents] of patterns) {
      if (documents.length >= 3) {
        recurring.push(...documents);
      }
    }
    
    return recurring;
  }

  private filterRecentActivity(docs: SearchDocument[]): SearchDocument[] {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return docs.filter(doc => doc.timestamp > thirtyDaysAgo);
  }

  private filterSimilarContent(docs: SearchDocument[]): SearchDocument[] {
    // Use recent search history to find similar content
    if (this.searchHistory.length === 0) return docs;
    
    const recentQueries = this.searchHistory
      .slice(-5)
      .map(entry => entry.query.toLowerCase());
    
    return docs.filter(doc => {
      const content = doc.searchable.toLowerCase();
      return recentQueries.some(query => 
        this.calculateTextSimilarity(content, query) > 0.3
      );
    });
  }

  private filterImportantContacts(docs: SearchDocument[]): SearchDocument[] {
    const contacts = docs.filter(doc => doc.type === 'contact');
    
    // Simple importance scoring based on metadata
    return contacts.filter(doc => {
      const isVIP = doc.metadata.isVIP || doc.tags.includes('vip');
      const hasMultipleContacts = doc.metadata.email && doc.metadata.phone;
      const recentlyContacted = doc.timestamp > (Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      return isVIP || hasMultipleContacts || recentlyContacted;
    });
  }

  private filterLocationBased(docs: SearchDocument[]): SearchDocument[] {
    // Simple location-based filtering
    const locationKeywords = ['restaurant', 'store', 'mall', 'office', 'home'];
    
    return docs.filter(doc => {
      const content = doc.searchable.toLowerCase();
      return locationKeywords.some(keyword => content.includes(keyword));
    });
  }

  private filterExpenseAnomalies(docs: SearchDocument[]): SearchDocument[] {
    const expenses = docs.filter(doc => doc.type === 'expense' && doc.metadata.debitAmount);
    
    if (expenses.length < 10) return expenses;
    
    // Calculate mean and standard deviation
    const amounts = expenses.map(doc => doc.metadata.debitAmount);
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    // Return expenses that are 2 standard deviations from the mean
    return expenses.filter(doc => {
      const amount = doc.metadata.debitAmount;
      return Math.abs(amount - mean) > 2 * stdDev;
    });
  }

  private filterProductivityPeaks(docs: SearchDocument[]): SearchDocument[] {
    // Group by hour of day and find peak activity times
    const hourCounts = new Map<number, number>();
    
    docs.forEach(doc => {
      const hour = new Date(doc.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    // Find top 3 most active hours
    const topHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
    
    return docs.filter(doc => {
      const hour = new Date(doc.timestamp).getHours();
      return topHours.includes(hour);
    });
  }

  private filterMoodBased(docs: SearchDocument[]): SearchDocument[] {
    const diaryEntries = docs.filter(doc => doc.type === 'diary');
    
    // Simple sentiment analysis based on keywords
    const positiveKeywords = ['happy', 'excited', 'great', 'awesome', 'wonderful', 'amazing'];
    const negativeKeywords = ['sad', 'angry', 'frustrated', 'tired', 'stressed', 'worried'];
    
    return diaryEntries.filter(doc => {
      const content = doc.content.toLowerCase();
      const hasPositive = positiveKeywords.some(word => content.includes(word));
      const hasNegative = negativeKeywords.some(word => content.includes(word));
      
      // Return entries with clear emotional indicators
      return hasPositive || hasNegative;
    });
  }

  private filterProjectRelated(docs: SearchDocument[]): SearchDocument[] {
    // Look for project-related keywords and tags
    const projectKeywords = ['project', 'task', 'goal', 'milestone', 'deadline', 'meeting'];
    const projectTags = docs
      .flatMap(doc => doc.tags)
      .filter(tag => projectKeywords.some(keyword => tag.toLowerCase().includes(keyword)));
    
    return docs.filter(doc => {
      const content = doc.searchable.toLowerCase();
      const hasProjectKeyword = projectKeywords.some(keyword => content.includes(keyword));
      const hasProjectTag = doc.tags.some(tag => projectTags.includes(tag));
      
      return hasProjectKeyword || hasProjectTag;
    });
  }

  // Analysis methods for insights
  private analyzeExpensePatterns(docs: SearchDocument[]): ContentInsight[] {
    const insights: ContentInsight[] = [];
    const expenses = docs.filter(doc => doc.type === 'expense');
    
    if (expenses.length === 0) return insights;
    
    // Category spending analysis
    const categoryTotals = new Map<string, number>();
    expenses.forEach(doc => {
      const category = doc.metadata.category || 'Other';
      const amount = doc.metadata.debitAmount || 0;
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    });
    
    const topCategory = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
      insights.push({
        type: 'pattern',
        title: 'Top Spending Category',
        description: `You spend most on ${topCategory[0]} (${topCategory[1].toFixed(2)} OMR)`,
        confidence: 0.9,
        data: { category: topCategory[0], amount: topCategory[1] }
      });
    }
    
    return insights;
  }

  private analyzeTemporalPatterns(docs: SearchDocument[]): ContentInsight[] {
    const insights: ContentInsight[] = [];
    
    // Day of week analysis
    const dayActivity = new Map<number, number>();
    docs.forEach(doc => {
      const day = new Date(doc.timestamp).getDay();
      dayActivity.set(day, (dayActivity.get(day) || 0) + 1);
    });
    
    const mostActiveDay = Array.from(dayActivity.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostActiveDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        type: 'pattern',
        title: 'Most Active Day',
        description: `You're most active on ${days[mostActiveDay[0]]} with ${mostActiveDay[1]} activities`,
        confidence: 0.8,
        data: { day: mostActiveDay[0], count: mostActiveDay[1] }
      });
    }
    
    return insights;
  }

  private analyzeContentCorrelations(docs: SearchDocument[]): ContentInsight[] {
    const insights: ContentInsight[] = [];
    
    // Find frequently co-occurring tags
    const tagPairs = new Map<string, number>();
    docs.forEach(doc => {
      for (let i = 0; i < doc.tags.length; i++) {
        for (let j = i + 1; j < doc.tags.length; j++) {
          const pair = [doc.tags[i], doc.tags[j]].sort().join(' + ');
          tagPairs.set(pair, (tagPairs.get(pair) || 0) + 1);
        }
      }
    });
    
    const topPair = Array.from(tagPairs.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topPair && topPair[1] > 2) {
      insights.push({
        type: 'correlation',
        title: 'Related Tags',
        description: `Tags "${topPair[0]}" often appear together (${topPair[1]} times)`,
        confidence: 0.7,
        data: { tags: topPair[0].split(' + '), count: topPair[1] }
      });
    }
    
    return insights;
  }

  private detectAnomalies(docs: SearchDocument[]): ContentInsight[] {
    const insights: ContentInsight[] = [];
    
    // Detect unusual time patterns
    const hourCounts = new Map<number, number>();
    docs.forEach(doc => {
      const hour = new Date(doc.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    // Find hours with unusually high activity
    const avgCount = Array.from(hourCounts.values()).reduce((sum, count) => sum + count, 0) / hourCounts.size;
    
    for (const [hour, count] of hourCounts) {
      if (count > avgCount * 2) {
        insights.push({
          type: 'anomaly',
          title: 'Unusual Activity Time',
          description: `High activity at ${hour}:00 (${count} items, avg: ${Math.round(avgCount)})`,
          confidence: 0.6,
          data: { hour, count, average: avgCount }
        });
        break; // Only report one anomaly
      }
    }
    
    return insights;
  }

  // Helper methods
  private generatePatternKey(doc: SearchDocument): string {
    // Create a key for pattern matching based on document characteristics
    switch (doc.type) {
      case 'expense':
        return `${doc.type}_${doc.metadata.category}_${Math.floor((doc.metadata.debitAmount || 0) / 10) * 10}`;
      case 'contact':
        return `${doc.type}_${doc.metadata.company || 'unknown'}`;
      default:
        return `${doc.type}_${doc.tags.slice(0, 2).join('_')}`;
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private updateFilterUsage(filterId: string): void {
    const current = this.userPreferences.get(filterId) || 0;
    this.userPreferences.set(filterId, current + 0.1);
    this.saveUserPreferences();
  }

  private saveUserPreferences(): void {
    try {
      const preferences = Object.fromEntries(this.userPreferences);
      localStorage.setItem('searchFilterPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save filter preferences:', error);
    }
  }

  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('searchFilterPreferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.userPreferences = new Map(Object.entries(preferences));
      }
    } catch (error) {
      console.warn('Failed to load filter preferences:', error);
    }
  }

  // Record search for learning
  recordSearch(query: string, results: SearchResult[]): void {
    this.searchHistory.push({
      query,
      results,
      timestamp: Date.now()
    });
    
    // Keep only last 50 searches
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(-50);
    }
  }
}

// Global smart filter engine instance
export const smartFilterEngine = new SmartFilterEngine();