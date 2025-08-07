// Natural Language Processor for Intelligent Query Parsing

import { SearchQuery } from './searchIndex';

export interface ParsedQuery {
  intent: 'search' | 'filter' | 'analyze' | 'compare';
  entities: {
    type?: string[];
    timeRange?: { start: Date; end: Date; description: string };
    amount?: { min?: number; max?: number; currency?: string };
    category?: string[];
    location?: string[];
    person?: string[];
    tags?: string[];
  };
  filters: {
    metadata?: Record<string, any>;
    sortBy?: 'date' | 'amount' | 'relevance';
    sortOrder?: 'asc' | 'desc';
  };
  originalQuery: string;
  confidence: number;
}

class NaturalLanguageProcessor {
  private patterns: Map<string, RegExp> = new Map();
  private entityPatterns: Map<string, RegExp> = new Map();
  private monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  private timeKeywords = {
    relative: ['today', 'yesterday', 'tomorrow', 'last week', 'this week', 'next week', 'last month', 'this month', 'next month', 'last year', 'this year'],
    periods: ['week', 'month', 'year', 'day', 'quarter'],
    modifiers: ['last', 'this', 'next', 'past', 'recent', 'previous', 'current']
  };

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Intent patterns
    this.patterns.set('search', /^(find|search|show|get|look for|where)/i);
    this.patterns.set('filter', /^(filter|only|just|limit)/i);
    this.patterns.set('analyze', /^(analyze|total|sum|count|how much|how many)/i);
    this.patterns.set('compare', /^(compare|versus|vs|between)/i);

    // Entity patterns
    this.entityPatterns.set('amount', /\$?(\d+(?:\.\d{2})?)\s*(dollars?|omr|rials?|usd)?/gi);
    this.entityPatterns.set('date', /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi);
    this.entityPatterns.set('category', /(food|restaurant|transport|business|medical|entertainment|shopping|utilities|travel|education|general|groceries|gas|fuel|coffee|lunch|dinner|breakfast)/gi);
    this.entityPatterns.set('person', /@([a-zA-Z0-9_]+)/gi);
    this.entityPatterns.set('tag', /#([a-zA-Z0-9_]+)/gi);
    this.entityPatterns.set('type', /(expense|expenses|contact|contacts|diary|entries|calendar|events|photos|emails|shopping|list)/gi);
  }

  // Parse natural language query
  parseQuery(query: string): ParsedQuery {
    console.log('🧠 Parsing natural language query:', query);
    
    const parsed: ParsedQuery = {
      intent: 'search',
      entities: {},
      filters: {},
      originalQuery: query,
      confidence: 0
    };

    const queryLower = query.toLowerCase();
    let confidence = 0;

    // Detect intent
    parsed.intent = this.detectIntent(queryLower);
    confidence += 20;

    // Extract entities
    parsed.entities = this.extractEntities(query);
    confidence += Object.keys(parsed.entities).length * 10;

    // Extract time range
    const timeRange = this.extractTimeRange(queryLower);
    if (timeRange) {
      parsed.entities.timeRange = timeRange;
      confidence += 25;
    }

    // Extract filters
    parsed.filters = this.extractFilters(queryLower);
    confidence += Object.keys(parsed.filters).length * 5;

    // Calculate final confidence
    parsed.confidence = Math.min(confidence, 100);

    console.log('🎯 Parsed query result:', parsed);
    return parsed;
  }

  // Convert parsed query to search query
  toSearchQuery(parsed: ParsedQuery): SearchQuery {
    const searchQuery: SearchQuery = {
      query: this.extractSearchTerms(parsed.originalQuery),
      limit: 20
    };

    // Set document types
    if (parsed.entities.type?.length) {
      searchQuery.type = this.normalizeTypes(parsed.entities.type);
    }

    // Set date range
    if (parsed.entities.timeRange) {
      searchQuery.dateRange = {
        start: parsed.entities.timeRange.start,
        end: parsed.entities.timeRange.end
      };
    }

    // Set tags
    if (parsed.entities.tags?.length) {
      searchQuery.tags = parsed.entities.tags;
    }

    // Set metadata filters
    const metadata: Record<string, any> = {};
    
    if (parsed.entities.category?.length) {
      metadata.category = parsed.entities.category;
    }
    
    if (parsed.entities.amount) {
      metadata.amount = parsed.entities.amount;
    }
    
    if (parsed.entities.location?.length) {
      metadata.location = parsed.entities.location;
    }

    if (Object.keys(metadata).length > 0) {
      searchQuery.metadata = metadata;
    }

    return searchQuery;
  }

  // Detect intent from query
  private detectIntent(queryLower: string): ParsedQuery['intent'] {
    for (const [intent, pattern] of this.patterns) {
      if (pattern.test(queryLower)) {
        return intent as ParsedQuery['intent'];
      }
    }

    // Default intent based on keywords
    if (queryLower.includes('total') || queryLower.includes('sum') || queryLower.includes('how much')) {
      return 'analyze';
    }
    
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      return 'compare';
    }
    
    if (queryLower.includes('only') || queryLower.includes('just') || queryLower.includes('filter')) {
      return 'filter';
    }

    return 'search';
  }

  // Extract entities from query
  private extractEntities(query: string): ParsedQuery['entities'] {
    const entities: ParsedQuery['entities'] = {};

    // Extract amounts
    const amounts = this.extractAmounts(query);
    if (amounts.min !== undefined || amounts.max !== undefined) {
      entities.amount = amounts;
    }

    // Extract categories
    const categories = this.extractMatches(query, this.entityPatterns.get('category')!);
    if (categories.length) {
      entities.category = categories.map(cat => this.normalizeCategory(cat));
    }

    // Extract types
    const types = this.extractMatches(query, this.entityPatterns.get('type')!);
    if (types.length) {
      entities.type = this.normalizeTypes(types);
    }

    // Extract people
    const people = this.extractMatches(query, this.entityPatterns.get('person')!);
    if (people.length) {
      entities.person = people.map(p => p.replace('@', ''));
    }

    // Extract tags
    const tags = this.extractMatches(query, this.entityPatterns.get('tag')!);
    if (tags.length) {
      entities.tags = tags.map(t => t.replace('#', ''));
    }

    // Extract locations (simple keyword matching)
    const locationKeywords = ['restaurant', 'store', 'mall', 'airport', 'hotel', 'office', 'home', 'work'];
    const locations = locationKeywords.filter(loc => query.toLowerCase().includes(loc));
    if (locations.length) {
      entities.location = locations;
    }

    return entities;
  }

  // Extract amounts with ranges
  private extractAmounts(query: string): { min?: number; max?: number; currency?: string } {
    const amounts: { min?: number; max?: number; currency?: string } = {};
    const amountMatches = Array.from(query.matchAll(this.entityPatterns.get('amount')!));
    
    if (amountMatches.length === 0) return amounts;

    // Look for range indicators
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('over') || queryLower.includes('above') || queryLower.includes('more than')) {
      amounts.min = parseFloat(amountMatches[0][1]);
    } else if (queryLower.includes('under') || queryLower.includes('below') || queryLower.includes('less than')) {
      amounts.max = parseFloat(amountMatches[0][1]);
    } else if (queryLower.includes('between') && amountMatches.length >= 2) {
      amounts.min = parseFloat(amountMatches[0][1]);
      amounts.max = parseFloat(amountMatches[1][1]);
    } else if (amountMatches.length === 1) {
      // Single amount - look for context
      const amount = parseFloat(amountMatches[0][1]);
      if (queryLower.includes('exactly') || queryLower.includes('equal')) {
        amounts.min = amount;
        amounts.max = amount;
      } else {
        amounts.min = amount;
      }
    }

    // Extract currency
    if (amountMatches[0][2]) {
      amounts.currency = amountMatches[0][2].toLowerCase();
    }

    return amounts;
  }

  // Extract time range from query
  private extractTimeRange(queryLower: string): { start: Date; end: Date; description: string } | null {
    const now = new Date();
    
    // Today
    if (queryLower.includes('today')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end, description: 'today' };
    }

    // Yesterday
    if (queryLower.includes('yesterday')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end, description: 'yesterday' };
    }

    // This week
    if (queryLower.includes('this week')) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end, description: 'this week' };
    }

    // Last week
    if (queryLower.includes('last week')) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end, description: 'last week' };
    }

    // This month
    if (queryLower.includes('this month')) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end, description: 'this month' };
    }

    // Last month
    if (queryLower.includes('last month')) {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end, description: 'last month' };
    }

    // Specific months
    for (let i = 0; i < this.monthNames.length; i++) {
      const month = this.monthNames[i];
      if (queryLower.includes(month)) {
        const year = queryLower.includes('last year') ? now.getFullYear() - 1 : now.getFullYear();
        const start = new Date(year, i, 1);
        const end = new Date(year, i + 1, 1);
        return { start, end, description: `${month} ${year}` };
      }
    }

    // Last X days
    const lastDaysMatch = queryLower.match(/last (\d+) days?/);
    if (lastDaysMatch) {
      const days = parseInt(lastDaysMatch[1]);
      const start = new Date(now);
      start.setDate(now.getDate() - days);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end, description: `last ${days} days` };
    }

    // This year
    if (queryLower.includes('this year')) {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start, end, description: 'this year' };
    }

    // Last year
    if (queryLower.includes('last year')) {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear(), 0, 1);
      return { start, end, description: 'last year' };
    }

    return null;
  }

  // Extract filters
  private extractFilters(queryLower: string): ParsedQuery['filters'] {
    const filters: ParsedQuery['filters'] = {};

    // Sort by
    if (queryLower.includes('recent') || queryLower.includes('newest') || queryLower.includes('latest')) {
      filters.sortBy = 'date';
      filters.sortOrder = 'desc';
    } else if (queryLower.includes('oldest') || queryLower.includes('earliest')) {
      filters.sortBy = 'date';
      filters.sortOrder = 'asc';
    } else if (queryLower.includes('highest') || queryLower.includes('most expensive') || queryLower.includes('largest')) {
      filters.sortBy = 'amount';
      filters.sortOrder = 'desc';
    } else if (queryLower.includes('lowest') || queryLower.includes('cheapest') || queryLower.includes('smallest')) {
      filters.sortBy = 'amount';
      filters.sortOrder = 'asc';
    }

    return filters;
  }

  // Extract matches using regex
  private extractMatches(text: string, regex: RegExp): string[] {
    const matches: string[] = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1] || match[0]);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  // Extract search terms (remove entities and stop words)
  private extractSearchTerms(query: string): string {
    let cleanQuery = query;
    
    // Remove entity matches
    for (const regex of this.entityPatterns.values()) {
      cleanQuery = cleanQuery.replace(regex, '');
    }
    
    // Remove common query prefixes
    cleanQuery = cleanQuery.replace(/^(find|search|show|get|look for|where|filter|only|just|limit|analyze|total|sum|count|how much|how many|compare|versus|vs|between)\s+/i, '');
    
    // Remove time expressions
    cleanQuery = cleanQuery.replace(/(today|yesterday|this week|last week|this month|last month|this year|last year|last \d+ days?)/gi, '');
    
    // Remove amount indicators
    cleanQuery = cleanQuery.replace(/(over|above|more than|under|below|less than|between|exactly|equal)/gi, '');
    
    // Clean up extra spaces
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
    
    return cleanQuery;
  }

  // Normalize document types
  private normalizeTypes(types: string[]): string[] {
    const typeMap: Record<string, string> = {
      'expense': 'expense',
      'expenses': 'expense',
      'contact': 'contact',
      'contacts': 'contact',
      'diary': 'diary',
      'entries': 'diary',
      'calendar': 'calendar',
      'events': 'calendar',
      'photos': 'photo',
      'emails': 'email',
      'shopping': 'shopping-list',
      'list': 'shopping-list'
    };

    return types.map(type => typeMap[type.toLowerCase()] || type).filter(Boolean);
  }

  // Normalize categories
  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'restaurant': 'Food',
      'restaurants': 'Food',
      'food': 'Food',
      'groceries': 'Food',
      'coffee': 'Food',
      'lunch': 'Food',
      'dinner': 'Food',
      'breakfast': 'Food',
      'transport': 'Transportation',
      'gas': 'Transportation',
      'fuel': 'Transportation',
      'business': 'Business',
      'medical': 'Medical',
      'entertainment': 'Entertainment',
      'shopping': 'Shopping',
      'utilities': 'Utilities',
      'travel': 'Travel',
      'education': 'Education',
      'general': 'General'
    };

    return categoryMap[category.toLowerCase()] || category;
  }

  // Get query suggestions based on patterns
  getSuggestions(partialQuery: string): string[] {
    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();

    // Common query templates
    const templates = [
      'show me expenses from {timeRange}',
      'find {category} expenses',
      'expenses over ${amount}',
      'total spent on {category}',
      'contacts from {company}',
      'diary entries about {topic}',
      'calendar events {timeRange}',
      'photos from {location}',
      'emails from {person}'
    ];

    // Add matching templates
    templates.forEach(template => {
      if (template.toLowerCase().includes(queryLower) && queryLower.length > 2) {
        suggestions.push(template);
      }
    });

    // Add entity-based suggestions
    if (queryLower.includes('expense')) {
      suggestions.push(
        'expenses last month',
        'expenses over $100',
        'restaurant expenses',
        'business expenses this year'
      );
    }

    if (queryLower.includes('contact')) {
      suggestions.push(
        'contacts from work',
        'recent contacts',
        'contacts with email'
      );
    }

    return suggestions.slice(0, 5);
  }
}

// Global natural language processor instance
export const nlProcessor = new NaturalLanguageProcessor();