// Search Index Engine for Document Indexing and Retrieval

export interface SearchDocument {
  id: string;
  type: 'expense' | 'contact' | 'diary' | 'calendar' | 'shopping-list' | 'photo' | 'email';
  title: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: number;
  tags: string[];
  searchable: string; // Combined searchable text
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: string[];
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'tag';
}

export interface SearchQuery {
  query: string;
  type?: string | string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

class SearchIndex {
  private documents: Map<string, SearchDocument> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private wordIndex: Map<string, Set<string>> = new Map();
  private dateIndex: Map<string, Set<string>> = new Map();
  private stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);

  constructor() {
    this.loadFromStorage();
  }

  // Add document to search index
  addDocument(doc: SearchDocument): void {
    console.log(`🔍 Adding document to search index: ${doc.type}/${doc.id}`);
    
    // Store document
    this.documents.set(doc.id, doc);
    
    // Update type index
    if (!this.typeIndex.has(doc.type)) {
      this.typeIndex.set(doc.type, new Set());
    }
    this.typeIndex.get(doc.type)!.add(doc.id);
    
    // Update tag index
    doc.tags.forEach(tag => {
      if (!this.tagIndex.has(tag.toLowerCase())) {
        this.tagIndex.set(tag.toLowerCase(), new Set());
      }
      this.tagIndex.get(tag.toLowerCase())!.add(doc.id);
    });
    
    // Update word index
    this.indexWords(doc.searchable, doc.id);
    
    // Update date index
    const dateKey = new Date(doc.timestamp).toISOString().split('T')[0];
    if (!this.dateIndex.has(dateKey)) {
      this.dateIndex.set(dateKey, new Set());
    }
    this.dateIndex.get(dateKey)!.add(doc.id);
    
    this.saveToStorage();
  }

  // Remove document from search index
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;
    
    console.log(`🗑️ Removing document from search index: ${doc.type}/${id}`);
    
    // Remove from type index
    this.typeIndex.get(doc.type)?.delete(id);
    
    // Remove from tag index
    doc.tags.forEach(tag => {
      this.tagIndex.get(tag.toLowerCase())?.delete(id);
    });
    
    // Remove from word index
    this.removeFromWordIndex(doc.searchable, id);
    
    // Remove from date index
    const dateKey = new Date(doc.timestamp).toISOString().split('T')[0];
    this.dateIndex.get(dateKey)?.delete(id);
    
    // Remove document
    this.documents.delete(id);
    
    this.saveToStorage();
  }

  // Update existing document
  updateDocument(doc: SearchDocument): void {
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }
    this.addDocument(doc);
  }

  // Search documents
  search(query: SearchQuery): SearchResult[] {
    console.log('🔍 Performing search:', query);
    
    let candidateIds: Set<string> = new Set();
    const results: SearchResult[] = [];
    
    // Start with all documents if no specific filters
    if (!query.type && !query.tags?.length && !query.dateRange && !query.query) {
      candidateIds = new Set(this.documents.keys());
    } else {
      candidateIds = this.getCandidateDocuments(query);
    }
    
    // Score and rank results
    for (const docId of candidateIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;
      
      const result = this.scoreDocument(doc, query);
      if (result.score > 0) {
        results.push(result);
      }
    }
    
    // Sort by score (descending) and timestamp (recent first)
    results.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        return b.document.timestamp - a.document.timestamp;
      }
      return b.score - a.score;
    });
    
    // Apply pagination
    const start = query.offset || 0;
    const limit = query.limit || 50;
    
    return results.slice(start, start + limit);
  }

  // Get candidate documents based on filters
  private getCandidateDocuments(query: SearchQuery): Set<string> {
    let candidates: Set<string> | null = null;
    
    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      const typeMatches = new Set<string>();
      
      types.forEach(type => {
        const typeResults = this.typeIndex.get(type);
        if (typeResults) {
          typeResults.forEach(id => typeMatches.add(id));
        }
      });
      
      candidates = this.intersectSets(candidates, typeMatches);
    }
    
    // Filter by tags
    if (query.tags?.length) {
      const tagMatches = new Set<string>();
      
      query.tags.forEach(tag => {
        const tagResults = this.tagIndex.get(tag.toLowerCase());
        if (tagResults) {
          tagResults.forEach(id => tagMatches.add(id));
        }
      });
      
      candidates = this.intersectSets(candidates, tagMatches);
    }
    
    // Filter by date range
    if (query.dateRange) {
      const dateMatches = new Set<string>();
      const startDate = query.dateRange.start;
      const endDate = query.dateRange.end;
      
      for (const [dateKey, docIds] of this.dateIndex) {
        const date = new Date(dateKey);
        if (date >= startDate && date <= endDate) {
          docIds.forEach(id => dateMatches.add(id));
        }
      }
      
      candidates = this.intersectSets(candidates, dateMatches);
    }
    
    // Text search
    if (query.query) {
      const textMatches = this.performTextSearch(query.query);
      candidates = this.intersectSets(candidates, textMatches);
    }
    
    return candidates || new Set();
  }

  // Perform text search
  private performTextSearch(queryText: string): Set<string> {
    const words = this.tokenize(queryText.toLowerCase());
    const matches = new Set<string>();
    
    // Exact phrase search
    if (queryText.includes('"')) {
      const phrases = queryText.match(/"([^"]+)"/g);
      if (phrases) {
        phrases.forEach(phrase => {
          const cleanPhrase = phrase.replace(/"/g, '');
          for (const [docId, doc] of this.documents) {
            if (doc.searchable.toLowerCase().includes(cleanPhrase)) {
              matches.add(docId);
            }
          }
        });
      }
    }
    
    // Word-based search
    words.forEach(word => {
      if (this.stopWords.has(word)) return;
      
      // Exact match
      const exactMatches = this.wordIndex.get(word);
      if (exactMatches) {
        exactMatches.forEach(id => matches.add(id));
      }
      
      // Fuzzy match (prefix)
      for (const [indexWord, docIds] of this.wordIndex) {
        if (indexWord.startsWith(word) || word.startsWith(indexWord)) {
          docIds.forEach(id => matches.add(id));
        }
      }
    });
    
    return matches;
  }

  // Score document relevance
  private scoreDocument(doc: SearchDocument, query: SearchQuery): SearchResult {
    let score = 0;
    const highlights: string[] = [];
    let matchType: SearchResult['matchType'] = 'fuzzy';
    
    if (query.query) {
      const queryLower = query.query.toLowerCase();
      const contentLower = doc.searchable.toLowerCase();
      
      // Exact title match (highest score)
      if (doc.title.toLowerCase().includes(queryLower)) {
        score += 100;
        highlights.push(doc.title);
        matchType = 'exact';
      }
      
      // Exact content match
      if (contentLower.includes(queryLower)) {
        score += 50;
        matchType = 'exact';
      }
      
      // Word matches
      const queryWords = this.tokenize(queryLower);
      const contentWords = this.tokenize(contentLower);
      
      queryWords.forEach(word => {
        if (this.stopWords.has(word)) return;
        
        // Count word frequency
        const wordCount = contentWords.filter(w => w === word).length;
        score += wordCount * 10;
        
        // Partial matches
        contentWords.forEach(contentWord => {
          if (contentWord.includes(word) || word.includes(contentWord)) {
            score += 5;
          }
        });
      });
    }
    
    // Tag matches
    if (query.tags?.length) {
      const matchingTags = doc.tags.filter(tag => 
        query.tags!.some(queryTag => 
          tag.toLowerCase().includes(queryTag.toLowerCase())
        )
      );
      score += matchingTags.length * 25;
      highlights.push(...matchingTags);
      matchType = 'tag';
    }
    
    // Metadata matches
    if (query.metadata) {
      Object.entries(query.metadata).forEach(([key, value]) => {
        if (doc.metadata[key] === value) {
          score += 30;
        }
      });
    }
    
    // Recency boost (newer documents get slight boost)
    const daysSinceCreated = (Date.now() - doc.timestamp) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 10 - daysSinceCreated * 0.1);
    score += recencyBoost;
    
    return {
      document: doc,
      score,
      highlights,
      matchType
    };
  }

  // Index words from text
  private indexWords(text: string, docId: string): void {
    const words = this.tokenize(text.toLowerCase());
    
    words.forEach(word => {
      if (this.stopWords.has(word) || word.length < 2) return;
      
      if (!this.wordIndex.has(word)) {
        this.wordIndex.set(word, new Set());
      }
      this.wordIndex.get(word)!.add(docId);
    });
  }

  // Remove words from index
  private removeFromWordIndex(text: string, docId: string): void {
    const words = this.tokenize(text.toLowerCase());
    
    words.forEach(word => {
      if (this.stopWords.has(word)) return;
      
      const wordSet = this.wordIndex.get(word);
      if (wordSet) {
        wordSet.delete(docId);
        if (wordSet.size === 0) {
          this.wordIndex.delete(word);
        }
      }
    });
  }

  // Tokenize text into words
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  // Intersect two sets
  private intersectSets(setA: Set<string> | null, setB: Set<string>): Set<string> {
    if (!setA) return setB;
    
    const intersection = new Set<string>();
    for (const item of setA) {
      if (setB.has(item)) {
        intersection.add(item);
      }
    }
    return intersection;
  }

  // Get search statistics
  getStats() {
    return {
      totalDocuments: this.documents.size,
      documentsByType: Object.fromEntries(
        Array.from(this.typeIndex.entries()).map(([type, ids]) => [type, ids.size])
      ),
      totalTags: this.tagIndex.size,
      totalWords: this.wordIndex.size,
      indexSize: this.getIndexSize()
    };
  }

  // Get suggestions for autocomplete
  getSuggestions(query: string, limit = 10): string[] {
    const queryLower = query.toLowerCase();
    const suggestions: Set<string> = new Set();
    
    // Word suggestions
    for (const word of this.wordIndex.keys()) {
      if (word.startsWith(queryLower)) {
        suggestions.add(word);
      }
    }
    
    // Tag suggestions
    for (const tag of this.tagIndex.keys()) {
      if (tag.startsWith(queryLower)) {
        suggestions.add(`#${tag}`);
      }
    }
    
    return Array.from(suggestions).slice(0, limit);
  }

  // Clear entire index
  clear(): void {
    this.documents.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.wordIndex.clear();
    this.dateIndex.clear();
    this.saveToStorage();
  }

  // Save index to localStorage
  private saveToStorage(): void {
    try {
      const indexData = {
        documents: Array.from(this.documents.entries()),
        typeIndex: Array.from(this.typeIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        tagIndex: Array.from(this.tagIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        wordIndex: Array.from(this.wordIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        dateIndex: Array.from(this.dateIndex.entries()).map(([k, v]) => [k, Array.from(v)])
      };
      
      localStorage.setItem('searchIndex', JSON.stringify(indexData));
    } catch (error) {
      console.warn('Failed to save search index to storage:', error);
    }
  }

  // Load index from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('searchIndex');
      if (!stored) return;
      
      const indexData = JSON.parse(stored);
      
      // Restore documents
      this.documents = new Map(indexData.documents || []);
      
      // Restore type index
      this.typeIndex = new Map(
        (indexData.typeIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );
      
      // Restore tag index
      this.tagIndex = new Map(
        (indexData.tagIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );
      
      // Restore word index
      this.wordIndex = new Map(
        (indexData.wordIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );
      
      // Restore date index
      this.dateIndex = new Map(
        (indexData.dateIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );
      
      console.log('🔍 Search index loaded from storage:', this.getStats());
    } catch (error) {
      console.warn('Failed to load search index from storage:', error);
    }
  }

  // Get approximate index size
  private getIndexSize(): string {
    try {
      const indexData = localStorage.getItem('searchIndex');
      if (!indexData) return '0 KB';
      
      const sizeKB = Math.round(indexData.length / 1024);
      return `${sizeKB} KB`;
    } catch {
      return 'Unknown';
    }
  }
}

// Global search index instance
export const searchIndex = new SearchIndex();