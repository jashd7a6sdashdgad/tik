// Intelligent Expense Management System with AI-powered categorization and insights

import { Expense } from '@/types';

export interface SmartExpense extends Expense {
  // AI-enhanced properties
  autoCategory?: string;
  confidence?: number;
  tags?: string[];
  merchant?: string;
  location?: string;
  recurringPattern?: 'weekly' | 'monthly' | 'yearly' | 'irregular' | null;
  budgetImpact?: 'over_budget' | 'within_budget' | 'significant_expense';
  suggestedActions?: string[];
  anomalyScore?: number;
  predictedNextOccurrence?: Date;
}

export interface ExpensePattern {
  merchant: string;
  category: string;
  averageAmount: number;
  frequency: number;
  lastSeen: Date;
  confidence: number;
}

export interface BudgetAlert {
  category: string;
  budgetLimit: number;
  currentSpending: number;
  percentageUsed: number;
  daysRemaining: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface ExpenseInsight {
  type: 'trend' | 'anomaly' | 'saving_opportunity' | 'budget_alert' | 'recurring_payment';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
  data?: any;
}

export class ExpenseIntelligence {
  private categoryRules: Record<string, { keywords: string[]; patterns: RegExp[]; priority: number }> = {};
  private merchantDatabase: Record<string, { category: string; confidence: number }> = {};
  private budgetLimits: Record<string, number> = {};
  private userPatterns: ExpensePattern[] = [];

  constructor() {
    this.initializeCategoryRules();
    this.initializeMerchantDatabase();
    this.initializeBudgetLimits();
  }

  private initializeCategoryRules(): void {
    this.categoryRules = {
      'Food': {
        keywords: ['restaurant', 'cafe', 'food', 'dining', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'coffee', 'bakery', 'grocery', 'supermarket', 'market'],
        patterns: [
          /\b(mcdonalds?|kfc|pizza hut|subway|starbucks)\b/i,
          /\b(restaurant|cafe|diner|bistro|eatery)\b/i,
          /\b(grocery|supermarket|foodstore)\b/i
        ],
        priority: 1
      },
      'Transportation': {
        keywords: ['taxi', 'uber', 'lyft', 'bus', 'train', 'metro', 'fuel', 'gas', 'petrol', 'parking', 'toll', 'airline', 'flight', 'car', 'vehicle'],
        patterns: [
          /\b(uber|lyft|taxi|cab)\b/i,
          /\b(gas station|petrol|fuel)\b/i,
          /\b(airline|flight|airport)\b/i
        ],
        priority: 1
      },
      'Shopping': {
        keywords: ['amazon', 'ebay', 'store', 'shop', 'retail', 'clothing', 'electronics', 'books', 'toys', 'gift', 'mall', 'boutique'],
        patterns: [
          /\b(amazon|ebay|walmart|target)\b/i,
          /\b(clothing|apparel|fashion)\b/i,
          /\b(electronics|computer|phone)\b/i
        ],
        priority: 2
      },
      'Utilities': {
        keywords: ['electricity', 'water', 'gas', 'internet', 'phone', 'mobile', 'utility', 'electric', 'power', 'telecom', 'broadband'],
        patterns: [
          /\b(electric|electricity|power|utility)\b/i,
          /\b(internet|broadband|wifi)\b/i,
          /\b(phone|mobile|telecom)\b/i
        ],
        priority: 3
      },
      'Medical': {
        keywords: ['hospital', 'clinic', 'doctor', 'pharmacy', 'medical', 'health', 'dentist', 'medicine', 'prescription', 'checkup'],
        patterns: [
          /\b(hospital|clinic|medical center)\b/i,
          /\b(pharmacy|drugstore)\b/i,
          /\b(doctor|dentist|physician)\b/i
        ],
        priority: 1
      },
      'Entertainment': {
        keywords: ['movie', 'cinema', 'theater', 'concert', 'game', 'sports', 'gym', 'fitness', 'netflix', 'spotify', 'entertainment'],
        patterns: [
          /\b(cinema|theater|movie)\b/i,
          /\b(gym|fitness|sports)\b/i,
          /\b(netflix|spotify|streaming)\b/i
        ],
        priority: 2
      },
      'Business': {
        keywords: ['office', 'supplies', 'software', 'license', 'subscription', 'meeting', 'conference', 'business', 'professional', 'service'],
        patterns: [
          /\b(office supplies|stationery)\b/i,
          /\b(software|license|subscription)\b/i,
          /\b(business|professional|corporate)\b/i
        ],
        priority: 1
      },
      'Travel': {
        keywords: ['hotel', 'accommodation', 'booking', 'airbnb', 'vacation', 'trip', 'travel', 'tourism', 'resort'],
        patterns: [
          /\b(hotel|motel|resort|accommodation)\b/i,
          /\b(booking|reservation|travel)\b/i,
          /\b(airbnb|vacation rental)\b/i
        ],
        priority: 1
      },
      'Education': {
        keywords: ['school', 'university', 'course', 'tuition', 'book', 'education', 'training', 'workshop', 'seminar'],
        patterns: [
          /\b(school|university|college)\b/i,
          /\b(course|training|education)\b/i,
          /\b(book|textbook|educational)\b/i
        ],
        priority: 1
      }
    };
  }

  private initializeMerchantDatabase(): void {
    this.merchantDatabase = {
      // Food & Dining
      "McDonald's": { category: 'Food', confidence: 0.95 },
      "KFC": { category: 'Food', confidence: 0.95 },
      "Starbucks": { category: 'Food', confidence: 0.90 },
      "Pizza Hut": { category: 'Food', confidence: 0.95 },
      "Subway": { category: 'Food', confidence: 0.95 },
      
      // Transportation
      "Uber": { category: 'Transportation', confidence: 0.98 },
      "Lyft": { category: 'Transportation', confidence: 0.98 },
      "Shell": { category: 'Transportation', confidence: 0.85 },
      "BP": { category: 'Transportation', confidence: 0.85 },
      
      // Shopping
      "Amazon": { category: 'Shopping', confidence: 0.80 },
      "eBay": { category: 'Shopping', confidence: 0.80 },
      "Walmart": { category: 'Shopping', confidence: 0.75 },
      "Target": { category: 'Shopping', confidence: 0.75 },
      
      // Utilities
      "Verizon": { category: 'Utilities', confidence: 0.90 },
      "AT&T": { category: 'Utilities', confidence: 0.90 },
      "Comcast": { category: 'Utilities', confidence: 0.90 },
      
      // Entertainment
      "Netflix": { category: 'Entertainment', confidence: 0.95 },
      "Spotify": { category: 'Entertainment', confidence: 0.95 },
      "AMC Theaters": { category: 'Entertainment', confidence: 0.95 },
      
      // Medical
      "CVS Pharmacy": { category: 'Medical', confidence: 0.90 },
      "Walgreens": { category: 'Medical', confidence: 0.90 }
    };
  }

  private initializeBudgetLimits(): void {
    // Default budget limits in OMR
    this.budgetLimits = {
      'Food': 300,
      'Transportation': 150,
      'Shopping': 200,
      'Utilities': 100,
      'Entertainment': 100,
      'Medical': 150,
      'Business': 250,
      'Travel': 500,
      'Education': 200,
      'General': 100
    };
  }

  // Main classification method
  classifyExpense(expense: Expense): SmartExpense {
    const description = expense.description.toLowerCase();
    const amount = expense.debitAmount || 0;

    // Auto-categorize
    const { category, confidence } = this.autoCategorizeBest(description, expense.from);
    
    // Extract merchant information
    const merchant = this.extractMerchant(description, expense.from);
    
    // Generate tags
    const tags = this.generateTags(expense);
    
    // Detect recurring pattern
    const recurringPattern = this.detectRecurringPattern(expense);
    
    // Calculate budget impact
    const budgetImpact = this.calculateBudgetImpact(category, amount);
    
    // Suggest actions
    const suggestedActions = this.suggestActions(expense, category, amount);
    
    // Calculate anomaly score
    const anomalyScore = this.calculateAnomalyScore(expense, category);

    return {
      ...expense,
      autoCategory: category,
      confidence,
      merchant,
      tags,
      recurringPattern,
      budgetImpact,
      suggestedActions,
      anomalyScore
    };
  }

  private autoCategorizeBest(description: string, from?: string): { category: string; confidence: number } {
    // First, check merchant database
    if (from) {
      const merchantMatch = this.findMerchantMatch(from);
      if (merchantMatch) {
        return { category: merchantMatch.category, confidence: merchantMatch.confidence };
      }
    }

    // Then, use keyword and pattern matching
    let bestMatch = { category: 'General', confidence: 0.3 };
    
    for (const [category, rules] of Object.entries(this.categoryRules)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of rules.keywords) {
        if (description.includes(keyword)) {
          score += 1 / rules.priority;
        }
      }
      
      // Check patterns
      for (const pattern of rules.patterns) {
        if (pattern.test(description)) {
          score += 2 / rules.priority;
        }
      }
      
      if (score > 0) {
        const confidence = Math.min(score * 0.2, 0.9);
        if (confidence > bestMatch.confidence) {
          bestMatch = { category, confidence };
        }
      }
    }

    return bestMatch;
  }

  private findMerchantMatch(merchantName: string): { category: string; confidence: number } | null {
    // Exact match first
    if (this.merchantDatabase[merchantName]) {
      return this.merchantDatabase[merchantName];
    }

    // Partial match
    for (const [merchant, data] of Object.entries(this.merchantDatabase)) {
      if (merchantName.toLowerCase().includes(merchant.toLowerCase()) || 
          merchant.toLowerCase().includes(merchantName.toLowerCase())) {
        return data;
      }
    }

    return null;
  }

  private extractMerchant(description: string, from?: string): string {
    // Try to extract merchant name from description or from field
    if (from && from !== 'Bank of Oman' && from !== 'Credit Card') {
      return from;
    }

    // Look for common merchant patterns in description
    const merchantPatterns = [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/, // Two capitalized words
      /\b([A-Z]{2,})\b/, // ALL CAPS words
      /\b(\w+\.com)\b/i // Website domains
    ];

    for (const pattern of merchantPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return description.split(' ').slice(0, 2).join(' ');
  }

  private generateTags(expense: Expense): string[] {
    const tags: string[] = [];
    const description = expense.description.toLowerCase();
    const amount = expense.debitAmount || 0;

    // Amount-based tags
    if (amount > 100) tags.push('large-expense');
    if (amount < 5) tags.push('small-expense');

    // Date-based tags
    const date = new Date(expense.date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) tags.push('weekend');
    else tags.push('weekday');

    // Time-based tags
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) tags.push('morning');
    else if (hour >= 12 && hour < 17) tags.push('afternoon');
    else if (hour >= 17 && hour < 22) tags.push('evening');
    else tags.push('night');

    // Content-based tags
    if (description.includes('online') || description.includes('internet')) tags.push('online-purchase');
    if (description.includes('cash') || description.includes('atm')) tags.push('cash-transaction');
    if (description.includes('subscription') || description.includes('monthly')) tags.push('subscription');

    return tags;
  }

  private detectRecurringPattern(expense: Expense): 'weekly' | 'monthly' | 'yearly' | 'irregular' | null {
    // This would typically analyze historical data
    // For now, use description heuristics
    const description = expense.description.toLowerCase();
    
    if (description.includes('monthly') || description.includes('subscription')) {
      return 'monthly';
    }
    if (description.includes('weekly')) {
      return 'weekly';
    }
    if (description.includes('annual') || description.includes('yearly')) {
      return 'yearly';
    }
    
    return 'irregular';
  }

  private calculateBudgetImpact(category: string, amount: number): 'over_budget' | 'within_budget' | 'significant_expense' {
    const budgetLimit = this.budgetLimits[category] || 100;
    const percentage = (amount / budgetLimit) * 100;

    if (percentage > 50) return 'significant_expense';
    if (percentage > 100) return 'over_budget';
    return 'within_budget';
  }

  private suggestActions(expense: Expense, category: string, amount: number): string[] {
    const actions: string[] = [];
    
    // Category-specific actions
    switch (category) {
      case 'Food':
        if (amount > 50) actions.push('Consider cooking at home more often');
        actions.push('Track restaurant spending');
        break;
      case 'Transportation':
        actions.push('Compare with public transport costs');
        if (amount > 30) actions.push('Consider carpooling options');
        break;
      case 'Shopping':
        actions.push('Check if purchase was necessary');
        actions.push('Look for better deals next time');
        break;
      case 'Utilities':
        actions.push('Monitor usage patterns');
        break;
      case 'Medical':
        actions.push('Keep receipt for insurance');
        actions.push('Add to health records');
        break;
    }

    // Amount-based actions
    if (amount > 100) {
      actions.push('Verify transaction details');
      actions.push('Update budget forecast');
    }

    // General actions
    actions.push('Review monthly category spending');
    
    return actions.slice(0, 3); // Limit to 3 actions
  }

  private calculateAnomalyScore(expense: Expense, category: string): number {
    const amount = expense.debitAmount || 0;
    const avgAmount = this.budgetLimits[category] || 100;
    
    // Simple anomaly detection based on amount deviation
    const deviation = Math.abs(amount - avgAmount) / avgAmount;
    return Math.min(deviation, 1.0);
  }

  // Generate insights from expense data
  generateInsights(expenses: SmartExpense[]): ExpenseInsight[] {
    const insights: ExpenseInsight[] = [];
    
    // Category spending analysis
    const categoryTotals = this.calculateCategoryTotals(expenses);
    
    // Budget alerts
    for (const [category, total] of Object.entries(categoryTotals)) {
      const budget = this.budgetLimits[category] || 100;
      const percentage = (total / budget) * 100;
      
      if (percentage > 80) {
        insights.push({
          type: 'budget_alert',
          title: `${category} Budget Alert`,
          description: `You've used ${percentage.toFixed(1)}% of your ${category} budget (${total.toFixed(2)} OMR of ${budget} OMR)`,
          impact: percentage > 100 ? 'negative' : 'neutral',
          confidence: 0.9,
          actionable: true,
          suggestedAction: 'Consider reducing spending in this category',
          data: { category, total, budget, percentage }
        });
      }
    }

    // Spending trends
    const monthlyTrend = this.calculateMonthlyTrend(expenses);
    if (monthlyTrend.change > 20) {
      insights.push({
        type: 'trend',
        title: 'Increased Spending Trend',
        description: `Your spending has increased by ${monthlyTrend.change.toFixed(1)}% this month`,
        impact: 'negative',
        confidence: 0.8,
        actionable: true,
        suggestedAction: 'Review recent expenses and identify areas to cut back'
      });
    }

    // Anomaly detection
    const anomalies = expenses.filter(exp => (exp.anomalyScore || 0) > 0.7);
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        title: 'Unusual Expenses Detected',
        description: `Found ${anomalies.length} unusual expense(s) that deviate from your normal spending patterns`,
        impact: 'neutral',
        confidence: 0.7,
        actionable: true,
        suggestedAction: 'Review these expenses for accuracy',
        data: { anomalies: anomalies.slice(0, 3) }
      });
    }

    // Saving opportunities
    const savingOpportunities = this.identifySavingOpportunities(expenses);
    insights.push(...savingOpportunities);

    return insights.slice(0, 10); // Limit to 10 insights
  }

  private calculateCategoryTotals(expenses: SmartExpense[]): Record<string, number> {
    return expenses.reduce((totals, expense) => {
      const category = expense.autoCategory || expense.category || 'General';
      const amount = expense.debitAmount || 0;
      totals[category] = (totals[category] || 0) + amount;
      return totals;
    }, {} as Record<string, number>);
  }

  private calculateMonthlyTrend(expenses: SmartExpense[]): { change: number; direction: 'up' | 'down' | 'stable' } {
    const now = new Date();
    const currentMonth = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });
    
    const lastMonth = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return expDate.getMonth() === lastMonthDate.getMonth() && expDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const currentTotal = currentMonth.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0);
    const lastTotal = lastMonth.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0);
    
    if (lastTotal === 0) return { change: 0, direction: 'stable' };
    
    const change = ((currentTotal - lastTotal) / lastTotal) * 100;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    
    return { change: Math.abs(change), direction };
  }

  private identifySavingOpportunities(expenses: SmartExpense[]): ExpenseInsight[] {
    const opportunities: ExpenseInsight[] = [];
    
    // High-frequency small expenses
    const smallExpenses = expenses.filter(exp => (exp.debitAmount || 0) < 10 && (exp.debitAmount || 0) > 0);
    if (smallExpenses.length > 20) {
      const total = smallExpenses.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0);
      opportunities.push({
        type: 'saving_opportunity',
        title: 'Small Expenses Add Up',
        description: `You have ${smallExpenses.length} small expenses totaling ${total.toFixed(2)} OMR. Consider combining purchases to reduce transaction fees.`,
        impact: 'positive',
        confidence: 0.7,
        actionable: true,
        suggestedAction: 'Plan purchases in advance to reduce small transactions'
      });
    }

    // Subscription analysis
    const subscriptions = expenses.filter(exp => 
      exp.tags?.includes('subscription') || 
      exp.recurringPattern === 'monthly'
    );
    
    if (subscriptions.length > 0) {
      const subscriptionTotal = subscriptions.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0);
      opportunities.push({
        type: 'saving_opportunity',
        title: 'Subscription Review',
        description: `You have ${subscriptions.length} subscription(s) costing ${subscriptionTotal.toFixed(2)} OMR monthly. Review if all are still needed.`,
        impact: 'positive',
        confidence: 0.8,
        actionable: true,
        suggestedAction: 'Cancel unused subscriptions to save money'
      });
    }

    return opportunities;
  }

  // Public methods
  setBudgetLimit(category: string, limit: number): void {
    this.budgetLimits[category] = limit;
  }

  getBudgetLimits(): Record<string, number> {
    return { ...this.budgetLimits };
  }

  addMerchantRule(merchant: string, category: string, confidence: number): void {
    this.merchantDatabase[merchant] = { category, confidence };
  }

  // Batch processing
  batchClassifyExpenses(expenses: Expense[]): SmartExpense[] {
    return expenses.map(expense => this.classifyExpense(expense));
  }

  // Export analytics
  exportExpenseAnalytics(expenses: SmartExpense[]) {
    return {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0),
      categoryBreakdown: this.calculateCategoryTotals(expenses),
      averageExpense: expenses.length > 0 ? 
        expenses.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0) / expenses.length : 0,
      budgetUtilization: this.calculateBudgetUtilization(expenses),
      insights: this.generateInsights(expenses),
      anomalyCount: expenses.filter(exp => (exp.anomalyScore || 0) > 0.7).length,
      recurringExpenses: expenses.filter(exp => exp.recurringPattern && exp.recurringPattern !== 'irregular').length
    };
  }

  private calculateBudgetUtilization(expenses: SmartExpense[]): Record<string, { used: number; budget: number; percentage: number }> {
    const categoryTotals = this.calculateCategoryTotals(expenses);
    const utilization: Record<string, { used: number; budget: number; percentage: number }> = {};

    for (const [category, total] of Object.entries(categoryTotals)) {
      const budget = this.budgetLimits[category] || 100;
      utilization[category] = {
        used: total,
        budget,
        percentage: (total / budget) * 100
      };
    }

    return utilization;
  }
}

// Create singleton instance
export const expenseIntelligence = new ExpenseIntelligence();