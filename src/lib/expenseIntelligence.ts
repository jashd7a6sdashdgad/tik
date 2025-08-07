// src/lib/expenseIntelligence.ts

import { Expense } from '@/types';

export interface SmartExpense extends Expense {
  autoCategory?: string;
  confidence?: number;
  tags?: string[];
  merchant?: string;
  location?: string;
  recurringPattern?: 'weekly' | 'monthly' | 'yearly' | 'irregular';
  budgetStatus?: 'over_budget' | 'within_budget' | 'significant_expense';
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

// Define the analytics interface to be used by the component
export interface ExpenseAnalytics {
  totalExpenses: number;
  totalAmount: number;
  categoryBreakdown: Record<string, number>;
  averageExpense: number;
  budgetUtilization: Record<string, { used: number; budget: number; percentage: number }>;
  insights: ExpenseInsight[];
  anomalyCount: number;
  recurringExpenses: number;
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
      Food: {
        keywords: [
          'restaurant', 'cafe', 'food', 'dining', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger',
          'coffee', 'bakery', 'grocery', 'supermarket', 'market',
        ],
        patterns: [
          /\b(mcdonalds?|kfc|pizza hut|subway|starbucks)\b/i,
          /\b(restaurant|cafe|diner|bistro|eatery)\b/i,
          /\b(grocery|supermarket|foodstore)\b/i,
        ],
        priority: 1,
      },
      Transportation: {
        keywords: [
          'taxi', 'uber', 'lyft', 'bus', 'train', 'metro', 'fuel', 'gas', 'petrol', 'parking', 'toll',
          'airline', 'flight', 'car', 'vehicle',
        ],
        patterns: [
          /\b(uber|lyft|taxi|cab)\b/i,
          /\b(gas station|petrol|fuel)\b/i,
          /\b(airline|flight|airport)\b/i,
        ],
        priority: 1,
      },
      Shopping: {
        keywords: [
          'amazon', 'ebay', 'store', 'shop', 'retail', 'clothing', 'electronics', 'books', 'toys',
          'gift', 'mall', 'boutique',
        ],
        patterns: [
          /\b(amazon|ebay|walmart|target)\b/i,
          /\b(clothing|apparel|fashion)\b/i,
          /\b(electronics|computer|phone)\b/i,
        ],
        priority: 2,
      },
      Utilities: {
        keywords: [
          'electricity', 'water', 'gas', 'internet', 'phone', 'mobile', 'utility', 'electric', 'power',
          'telecom', 'broadband',
        ],
        patterns: [
          /\b(electric|electricity|power|utility)\b/i,
          /\b(internet|broadband|wifi)\b/i,
          /\b(phone|mobile|telecom)\b/i,
        ],
        priority: 3,
      },
      Medical: {
        keywords: [
          'hospital', 'clinic', 'doctor', 'pharmacy', 'medical', 'health', 'dentist', 'medicine',
          'prescription', 'checkup',
        ],
        patterns: [
          /\b(hospital|clinic|medical center)\b/i,
          /\b(pharmacy|drugstore)\b/i,
          /\b(doctor|dentist|physician)\b/i,
        ],
        priority: 1,
      },
      Entertainment: {
        keywords: [
          'movie', 'cinema', 'theater', 'concert', 'game', 'sports', 'gym', 'fitness', 'netflix',
          'spotify', 'entertainment',
        ],
        patterns: [
          /\b(cinema|theater|movie)\b/i,
          /\b(gym|fitness|sports)\b/i,
          /\b(netflix|spotify|streaming)\b/i,
        ],
        priority: 2,
      },
      Business: {
        keywords: [
          'office', 'supplies', 'software', 'license', 'subscription', 'meeting', 'conference',
          'business', 'professional', 'service',
        ],
        patterns: [
          /\b(office supplies|stationery)\b/i,
          /\b(software|license|subscription)\b/i,
          /\b(business|professional|corporate)\b/i,
        ],
        priority: 1,
      },
      Travel: {
        keywords: [
          'hotel', 'accommodation', 'booking', 'airbnb', 'vacation', 'trip', 'travel', 'tourism',
          'resort',
        ],
        patterns: [
          /\b(hotel|motel|resort|accommodation)\b/i,
          /\b(booking|reservation|travel)\b/i,
          /\b(airbnb|vacation rental)\b/i,
        ],
        priority: 1,
      },
      Education: {
        keywords: [
          'school', 'university', 'course', 'tuition', 'book', 'education', 'training', 'workshop',
          'seminar',
        ],
        patterns: [
          /\b(school|university|college)\b/i,
          /\b(course|training|education)\b/i,
          /\b(book|textbook|educational)\b/i,
        ],
        priority: 1,
      },
    };
  }

  private initializeMerchantDatabase(): void {
    this.merchantDatabase = {
      // Food & Dining
      "McDonald's": { category: 'Food', confidence: 0.95 },
      KFC: { category: 'Food', confidence: 0.95 },
      Starbucks: { category: 'Food', confidence: 0.9 },
      'Pizza Hut': { category: 'Food', confidence: 0.95 },
      Subway: { category: 'Food', confidence: 0.95 },

      // Transportation
      Uber: { category: 'Transportation', confidence: 0.98 },
      Lyft: { category: 'Transportation', confidence: 0.98 },
      Shell: { category: 'Transportation', confidence: 0.85 },
      BP: { category: 'Transportation', confidence: 0.85 },

      // Shopping
      Amazon: { category: 'Shopping', confidence: 0.8 },
      eBay: { category: 'Shopping', confidence: 0.8 },
      Walmart: { category: 'Shopping', confidence: 0.75 },
      Target: { category: 'Shopping', confidence: 0.75 },

      // Utilities
      Verizon: { category: 'Utilities', confidence: 0.9 },
      'AT&T': { category: 'Utilities', confidence: 0.9 },
      Comcast: { category: 'Utilities', confidence: 0.9 },

      // Entertainment
      Netflix: { category: 'Entertainment', confidence: 0.95 },
      Spotify: { category: 'Entertainment', confidence: 0.95 },
      'AMC Theaters': { category: 'Entertainment', confidence: 0.95 },

      // Medical
      'CVS Pharmacy': { category: 'Medical', confidence: 0.9 },
      Walgreens: { category: 'Medical', confidence: 0.9 },
    };
  }

  private initializeBudgetLimits(): void {
    // Default budget limits in OMR
    this.budgetLimits = {
      Food: 300,
      Transportation: 150,
      Shopping: 200,
      Utilities: 100,
      Entertainment: 100,
      Medical: 150,
      Business: 250,
      Travel: 500,
      Education: 200,
      General: 100,
    };
  }

  // Main classification method
  classifyExpense(expense: Expense): SmartExpense {
    const description = (expense.description || '').toLowerCase();
    const amount = expense.debitAmount || 0;

    // Auto-categorize using description and merchant info
    const { category, confidence } = this.autoCategorizeBest(description, expense.from);

    // Extract merchant information from description or 'from' field
    const merchant = this.extractMerchant(description, expense.from);

    // Generate tags based on expense details
    const tags = this.generateTags(expense);

    // Detect recurring pattern from description heuristics
    const recurringPattern = this.detectRecurringPattern(expense);

    // Calculate budget status for the expense
    const budgetStatus = this.calculateBudgetStatus(category, amount);

    // Suggest actions based on category and amount
    const suggestedActions = this.suggestActions(expense, category, amount);

    // Calculate anomaly score for unusual expenses
    const anomalyScore = this.calculateAnomalyScore(expense, category);

    return {
      ...expense,
      autoCategory: category,
      confidence,
      merchant,
      tags,
      recurringPattern,
      budgetStatus,
      suggestedActions,
      anomalyScore,
    };
  }

  private autoCategorizeBest(
    description: string,
    from?: string
  ): { category: string; confidence: number } {
    // Try merchant database first if 'from' is provided
    if (from) {
      const merchantMatch = this.findMerchantMatch(from);
      if (merchantMatch) {
        return { category: merchantMatch.category, confidence: merchantMatch.confidence };
      }
    }

    // Keyword and regex pattern matching fallback
    let bestMatch = { category: 'General', confidence: 0.3 };

    for (const [category, rules] of Object.entries(this.categoryRules)) {
      let score = 0;

      // Check keywords
      for (const keyword of rules.keywords) {
        if (description.includes(keyword)) {
          score += 1 / rules.priority;
        }
      }

      // Check regex patterns
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

  private findMerchantMatch(
    merchantName: string
  ): { category: string; confidence: number } | null {
    const lowerMerchant = merchantName.toLowerCase();

    // Exact match
    if (this.merchantDatabase[merchantName]) {
      return this.merchantDatabase[merchantName];
    }

    // Partial match (case-insensitive)
    for (const [merchant, data] of Object.entries(this.merchantDatabase)) {
      const lowerDBMerchant = merchant.toLowerCase();
      if (lowerMerchant.includes(lowerDBMerchant) || lowerDBMerchant.includes(lowerMerchant)) {
        return data;
      }
    }

    return null;
  }

  private extractMerchant(description: string, from?: string): string {
    // Prefer 'from' if it is a merchant and not generic bank names
    if (from && from !== 'Bank of Oman' && from !== 'Credit Card') {
      return from;
    }

    // Otherwise try to extract merchant from description using patterns
    const merchantPatterns = [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/, // Two capitalized words e.g. "Pizza Hut"
      /\b([A-Z]{2,})\b/, // All caps words e.g. "AMAZON"
      /\b(\w+\.com)\b/i, // Website domains
    ];

    for (const pattern of merchantPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: first two words of description
    return description.split(' ').slice(0, 2).join(' ');
  }

  private generateTags(expense: Expense): string[] {
    const tags: string[] = [];
    const description = (expense.description || '').toLowerCase();
    const amount = expense.debitAmount || 0;

    // Amount based tags
    if (amount > 100) tags.push('large-expense');
    if (amount < 5) tags.push('small-expense');

    // Date based tags
    const date = new Date(expense.date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) tags.push('weekend');
    else tags.push('weekday');

    // Time based tags
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) tags.push('morning');
    else if (hour >= 12 && hour < 17) tags.push('afternoon');
    else if (hour >= 17 && hour < 22) tags.push('evening');
    else tags.push('night');

    // Content based tags
    if (description.includes('online') || description.includes('internet')) tags.push('online-purchase');
    if (description.includes('cash') || description.includes('atm')) tags.push('cash-transaction');
    if (description.includes('subscription') || description.includes('monthly')) tags.push('subscription');

    return tags;
  }

  private detectRecurringPattern(expense: Expense): 'weekly' | 'monthly' | 'yearly' | 'irregular' {
    const description = (expense.description || '').toLowerCase();

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

  private calculateBudgetStatus(
    category: string,
    amount: number
  ): 'over_budget' | 'within_budget' | 'significant_expense' {
    const budgetLimit = this.budgetLimits[category] || 100;
    const percentage = (amount / budgetLimit) * 100;

    if (percentage > 100) return 'over_budget';
    if (percentage > 50) return 'significant_expense';
    return 'within_budget';
  }

  private suggestActions(expense: Expense, category: string, amount: number): string[] {
    const actions: string[] = [];

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

    if (amount > 100) {
      actions.push('Verify transaction details');
      actions.push('Update budget forecast');
    }

    actions.push('Review monthly category spending');

    return actions.slice(0, 3);
  }

  private calculateAnomalyScore(expense: Expense, category: string): number {
    const amount = expense.debitAmount || 0;
    const avgAmount = this.budgetLimits[category] || 100;

    // Simple anomaly detection as deviation ratio capped at 1
    const deviation = Math.abs(amount - avgAmount) / avgAmount;
    return Math.min(deviation, 1.0);
  }

  // New public method to generate the full analytics dashboard data
  public getAnalyticsDashboardData(expenses: SmartExpense[]): ExpenseAnalytics {
    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.debitAmount || 0), 0);
    const totalExpenses = expenses.length;
    const categoryBreakdown = this.calculateCategoryTotals(expenses);

    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    const budgetUtilization: Record<string, { used: number; budget: number; percentage: number }> = {};
    for (const [category, budget] of Object.entries(this.budgetLimits)) {
      const used = categoryBreakdown[category] || 0;
      const percentage = (used / budget) * 100;
      budgetUtilization[category] = { used, budget, percentage };
    }

    const insights = this.generateInsights(expenses);
    const anomalyCount = expenses.filter(exp => (exp.anomalyScore || 0) > 0.7).length;
    const recurringExpenses = expenses.filter(exp => exp.recurringPattern !== 'irregular').length;

    return {
      totalExpenses,
      totalAmount,
      categoryBreakdown,
      averageExpense,
      budgetUtilization,
      insights,
      anomalyCount,
      recurringExpenses,
    };
  }

  private generateInsights(expenses: SmartExpense[]): ExpenseInsight[] {
    const insights: ExpenseInsight[] = [];

    const categoryTotals = this.calculateCategoryTotals(expenses);

    // Budget alerts
    for (const [category, total] of Object.entries(categoryTotals)) {
      const budget = this.budgetLimits[category] || 100;
      const percentage = (total / budget) * 100;

      if (percentage > 80) {
        insights.push({
          type: 'budget_alert',
          title: `${category} Budget Alert`,
          description: `You've used ${percentage.toFixed(1)}% of your ${category} budget (${total.toFixed(
            2
          )} OMR of ${budget} OMR)`,
          impact: percentage > 100 ? 'negative' : 'neutral',
          confidence: 0.9,
          actionable: true,
          suggestedAction: 'Consider reducing spending in this category',
          data: { category, total, budget, percentage },
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
        suggestedAction: 'Review recent expenses and identify areas to cut back',
      });
    }

    // Anomaly detection
    const anomalies = expenses.filter((exp) => (exp.anomalyScore || 0) > 0.7);
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        title: 'Unusual Expenses Detected',
        description: `Found ${anomalies.length} unusual expense(s) that deviate from your normal spending patterns`,
        impact: 'neutral',
        confidence: 0.7,
        actionable: true,
        suggestedAction: 'Review these expenses for accuracy',
        data: { anomalies: anomalies.slice(0, 3) },
      });
    }

    // Saving opportunities
    const savingOpportunities = this.identifySavingOpportunities(expenses);
    if (savingOpportunities.length > 0) {
      insights.push({
        type: 'saving_opportunity',
        title: 'Potential Saving Opportunities',
        description: `You could save money by cutting back on ${savingOpportunities.join(', ')}`,
        impact: 'positive',
        confidence: 0.75,
        actionable: true,
        suggestedAction: 'Review subscriptions and discretionary spending',
      });
    }

    return insights;
  }

  private calculateCategoryTotals(expenses: SmartExpense[]): Record<string, number> {
    const totals: Record<string, number> = {};

    for (const expense of expenses) {
      const category = expense.autoCategory || 'General';
      totals[category] = (totals[category] || 0) + (expense.debitAmount || 0);
    }

    return totals;
  }

  private calculateMonthlyTrend(expenses: SmartExpense[]): { change: number } {
    // Dummy example: Compare this month's total with last month's total
    // Here you should implement real monthly aggregation and comparison logic

    // For demo, just return a fixed positive trend
    return { change: 25 };
  }

  private identifySavingOpportunities(expenses: SmartExpense[]): string[] {
    const categoriesToSave: Set<string> = new Set();

    for (const expense of expenses) {
      if (
        expense.tags?.includes('subscription') &&
        (expense.budgetStatus === 'over_budget' || expense.budgetStatus === 'significant_expense')
      ) {
        if (expense.autoCategory) {
          categoriesToSave.add(expense.autoCategory);
        }
      }
    }

    return Array.from(categoriesToSave);
  }
}