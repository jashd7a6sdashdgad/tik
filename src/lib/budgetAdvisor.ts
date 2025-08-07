// AI-Powered Budget Advisor with Smart Financial Recommendations

export interface BudgetAnalysis {
  totalSpent: number;
  weeklyAverage: number;
  monthlyProjection: number;
  categoryBreakdown: CategoryAnalysis[];
  recommendations: BudgetRecommendation[];
  trends: SpendingTrend[];
  alerts: BudgetAlert[];
  score: BudgetScore;
}

export interface CategoryAnalysis {
  category: string;
  currentSpending: number;
  previousPeriodSpending: number;
  budgetLimit?: number;
  percentageOfTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  isOverBudget: boolean;
  projectedMonthlySpend: number;
}

export interface BudgetRecommendation {
  type: 'cut' | 'increase' | 'maintain' | 'reallocate';
  category: string;
  currentAmount: number;
  suggestedAmount: number;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  actionItems: string[];
}

export interface SpendingTrend {
  period: string;
  totalSpending: number;
  categorySpending: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface BudgetAlert {
  type: 'warning' | 'danger' | 'info' | 'success';
  category?: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export interface BudgetScore {
  overall: number; // 0-100
  categoryScores: Record<string, number>;
  factors: {
    spending_control: number;
    budget_adherence: number;
    trend_stability: number;
    category_balance: number;
  };
}

export interface Expense {
  id?: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  category: string;
  date: string;
  from?: string;
  availableBalance?: number;
}

class BudgetAdvisor {
  private defaultBudgets: Record<string, number> = {
    'Food': 300,
    'Transportation': 150,
    'Entertainment': 100,
    'Shopping': 200,
    'Medical': 100,
    'Business': 500,
    'Utilities': 120,
    'Travel': 200,
    'Education': 80,
    'General': 150
  };

  private getWeeklyExpenses(expenses: Expense[], weeksBack: number = 0): Expense[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - (weeksBack * 7));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
    });
  }

  private calculateCategorySpending(expenses: Expense[]): Record<string, number> {
    return expenses.reduce((acc, expense) => {
      const amount = (expense.debitAmount || 0) - (expense.creditAmount || 0);
      acc[expense.category] = (acc[expense.category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeCategoryTrends(
    currentWeek: Record<string, number>,
    previousWeek: Record<string, number>,
    lastMonth: Record<string, number>
  ): CategoryAnalysis[] {
    const allCategories = new Set([
      ...Object.keys(currentWeek),
      ...Object.keys(previousWeek),
      ...Object.keys(lastMonth)
    ]);

    const totalCurrentSpending = Object.values(currentWeek).reduce((sum, val) => sum + val, 0);

    return Array.from(allCategories).map(category => {
      const currentSpending = currentWeek[category] || 0;
      const previousSpending = previousWeek[category] || 0;
      const monthlyAverage = (lastMonth[category] || 0) / 4; // Approximate weekly average from monthly data

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (previousSpending > 0) {
        trendPercentage = ((currentSpending - previousSpending) / previousSpending) * 100;
        if (Math.abs(trendPercentage) > 10) {
          trend = trendPercentage > 0 ? 'increasing' : 'decreasing';
        }
      } else if (currentSpending > 0) {
        trend = 'increasing';
        trendPercentage = 100;
      }

      const budgetLimit = this.defaultBudgets[category];
      const projectedMonthlySpend = currentSpending * 4.33; // weeks in month
      const isOverBudget = budgetLimit ? projectedMonthlySpend > budgetLimit : false;

      return {
        category,
        currentSpending,
        previousPeriodSpending: previousSpending,
        budgetLimit,
        percentageOfTotal: totalCurrentSpending > 0 ? (currentSpending / totalCurrentSpending) * 100 : 0,
        trend,
        trendPercentage,
        isOverBudget,
        projectedMonthlySpend
      };
    }).sort((a, b) => b.currentSpending - a.currentSpending);
  }

  private generateRecommendations(
    categoryAnalysis: CategoryAnalysis[],
    totalSpending: number,
    weeklyAverage: number
  ): BudgetRecommendation[] {
    const recommendations: BudgetRecommendation[] = [];
    const highSpendingCategories = categoryAnalysis.filter(cat => cat.percentageOfTotal > 25);
    const increasingCategories = categoryAnalysis.filter(cat => 
      cat.trend === 'increasing' && cat.trendPercentage > 20
    );
    const overBudgetCategories = categoryAnalysis.filter(cat => cat.isOverBudget);

    // Recommend cuts for over-budget categories
    overBudgetCategories.forEach((category, index) => {
      const suggestedReduction = Math.min(
        category.currentSpending * 0.15, // 15% reduction
        category.projectedMonthlySpend - (category.budgetLimit || 0)
      );

      recommendations.push({
        type: 'cut',
        category: category.category,
        currentAmount: category.currentSpending,
        suggestedAmount: category.currentSpending - suggestedReduction,
        reasoning: `You're projected to overspend by ${((category.projectedMonthlySpend - (category.budgetLimit || 0))).toFixed(2)} OMR this month in ${category.category}.`,
        impact: category.percentageOfTotal > 30 ? 'high' : 'medium',
        priority: index + 1,
        actionItems: this.getCutActionItems(category.category, suggestedReduction)
      });
    });

    // Recommend cuts for rapidly increasing categories
    increasingCategories.forEach((category, index) => {
      if (!overBudgetCategories.some(c => c.category === category.category)) {
        recommendations.push({
          type: 'cut',
          category: category.category,
          currentAmount: category.currentSpending,
          suggestedAmount: category.previousPeriodSpending * 1.1, // 10% increase max
          reasoning: `Your ${category.category} spending increased by ${category.trendPercentage.toFixed(1)}% this week. Consider moderating this trend.`,
          impact: category.percentageOfTotal > 20 ? 'high' : 'medium',
          priority: overBudgetCategories.length + index + 1,
          actionItems: this.getModerationActionItems(category.category)
        });
      }
    });

    // Recommend maintaining good categories
    const stableCategories = categoryAnalysis.filter(cat => 
      cat.trend === 'stable' && !cat.isOverBudget && cat.currentSpending > 0
    );

    stableCategories.slice(0, 2).forEach((category, index) => {
      recommendations.push({
        type: 'maintain',
        category: category.category,
        currentAmount: category.currentSpending,
        suggestedAmount: category.currentSpending,
        reasoning: `Your ${category.category} spending is well-controlled and within budget. Keep up the good work!`,
        impact: 'low',
        priority: 100 + index,
        actionItems: [`Continue current spending habits for ${category.category}`, 'Monitor for any unexpected changes']
      });
    });

    // Recommend reallocation if total spending is high
    if (totalSpending > weeklyAverage * 1.2) {
      const highestCategory = categoryAnalysis[0];
      if (highestCategory.currentSpending > 0) {
        recommendations.push({
          type: 'reallocate',
          category: highestCategory.category,
          currentAmount: highestCategory.currentSpending,
          suggestedAmount: highestCategory.currentSpending * 0.8,
          reasoning: `Consider reallocating 20% of your ${highestCategory.category} budget to savings or emergency fund.`,
          impact: 'medium',
          priority: 50,
          actionItems: [
            `Reduce ${highestCategory.category} spending by 20%`,
            'Move saved amount to emergency fund',
            'Track the impact over the next 2 weeks'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private getCutActionItems(category: string, amount: number): string[] {
    const actionMap: Record<string, string[]> = {
      'Food': [
        'Cook more meals at home instead of dining out',
        'Plan weekly meals and create a shopping list',
        'Look for grocery discounts and bulk buying opportunities',
        'Reduce expensive takeout orders'
      ],
      'Transportation': [
        'Use public transport or carpooling more often',
        'Combine errands into single trips',
        'Consider walking or cycling for short distances',
        'Review fuel-efficient driving habits'
      ],
      'Entertainment': [
        'Look for free or low-cost entertainment options',
        'Take advantage of happy hours and discounts',
        'Consider streaming services instead of cinema',
        'Organize home-based social activities'
      ],
      'Shopping': [
        'Create a shopping list and stick to it',
        'Wait 24 hours before non-essential purchases',
        'Compare prices across different stores',
        'Unsubscribe from promotional emails'
      ],
      'Business': [
        'Review recurring business subscriptions',
        'Negotiate better rates with suppliers',
        'Optimize office supply purchases',
        'Consider co-working spaces if applicable'
      ]
    };

    const defaultActions = [
      `Reduce ${category} spending by ${amount.toFixed(2)} OMR per week`,
      'Track daily expenses in this category',
      'Set weekly spending alerts',
      'Review and adjust at the end of the week'
    ];

    return actionMap[category] || defaultActions;
  }

  private getModerationActionItems(category: string): string[] {
    return [
      `Monitor ${category} spending more closely`,
      'Set daily spending limits for this category',
      'Review what caused the recent increase',
      'Return to previous week\'s spending level'
    ];
  }

  private generateAlerts(categoryAnalysis: CategoryAnalysis[], totalSpending: number): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];

    // Over-budget alerts
    categoryAnalysis.filter(cat => cat.isOverBudget).forEach(category => {
      alerts.push({
        type: 'danger',
        category: category.category,
        message: `⚠️ You're on track to overspend ${((category.projectedMonthlySpend - (category.budgetLimit || 0))).toFixed(2)} OMR in ${category.category} this month!`,
        severity: 'high',
        actionRequired: true
      });
    });

    // Rapid increase alerts
    categoryAnalysis.filter(cat => cat.trendPercentage > 50).forEach(category => {
      alerts.push({
        type: 'warning',
        category: category.category,
        message: `📈 Your ${category.category} spending spiked ${category.trendPercentage.toFixed(1)}% this week`,
        severity: 'medium',
        actionRequired: true
      });
    });

    // High total spending alert
    if (totalSpending > 500) { // Threshold for high weekly spending
      alerts.push({
        type: 'warning',
        message: `💰 Your total weekly spending of ${totalSpending.toFixed(2)} OMR is higher than usual`,
        severity: 'medium',
        actionRequired: true
      });
    }

    // Good behavior alerts
    const wellControlledCategories = categoryAnalysis.filter(cat => 
      !cat.isOverBudget && cat.trend === 'stable' && cat.currentSpending > 0
    );

    if (wellControlledCategories.length >= 3) {
      alerts.push({
        type: 'success',
        message: `🎉 Great job! You're maintaining good control over ${wellControlledCategories.length} spending categories`,
        severity: 'low',
        actionRequired: false
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private calculateBudgetScore(
    categoryAnalysis: CategoryAnalysis[],
    totalSpending: number,
    weeklyAverage: number
  ): BudgetScore {
    // Spending control score (0-25)
    const spendingControlScore = Math.max(0, 25 - (totalSpending - weeklyAverage) / weeklyAverage * 25);
    
    // Budget adherence score (0-25)
    const overBudgetCount = categoryAnalysis.filter(cat => cat.isOverBudget).length;
    const budgetAdherenceScore = Math.max(0, 25 - (overBudgetCount * 5));
    
    // Trend stability score (0-25)
    const unstableCategories = categoryAnalysis.filter(cat => 
      cat.trend !== 'stable' && Math.abs(cat.trendPercentage) > 30
    ).length;
    const trendStabilityScore = Math.max(0, 25 - (unstableCategories * 5));
    
    // Category balance score (0-25)
    const highConcentrationCategories = categoryAnalysis.filter(cat => cat.percentageOfTotal > 40).length;
    const categoryBalanceScore = Math.max(0, 25 - (highConcentrationCategories * 10));
    
    const overallScore = spendingControlScore + budgetAdherenceScore + trendStabilityScore + categoryBalanceScore;
    
    // Category-specific scores
    const categoryScores: Record<string, number> = {};
    categoryAnalysis.forEach(category => {
      let score = 100;
      if (category.isOverBudget) score -= 30;
      if (category.trend === 'increasing' && category.trendPercentage > 20) score -= 20;
      if (category.percentageOfTotal > 40) score -= 15;
      categoryScores[category.category] = Math.max(0, score);
    });

    return {
      overall: Math.round(overallScore),
      categoryScores,
      factors: {
        spending_control: Math.round(spendingControlScore),
        budget_adherence: Math.round(budgetAdherenceScore),
        trend_stability: Math.round(trendStabilityScore),
        category_balance: Math.round(categoryBalanceScore)
      }
    };
  }

  public analyzeWeeklyBudget(expenses: Expense[]): BudgetAnalysis {
    // Get current week, previous week, and last month expenses
    const currentWeekExpenses = this.getWeeklyExpenses(expenses, 0);
    const previousWeekExpenses = this.getWeeklyExpenses(expenses, 1);
    const lastMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return expenseDate >= thirtyDaysAgo;
    });

    // Calculate spending by category
    const currentWeekSpending = this.calculateCategorySpending(currentWeekExpenses);
    const previousWeekSpending = this.calculateCategorySpending(previousWeekExpenses);
    const lastMonthSpending = this.calculateCategorySpending(lastMonthExpenses);

    const totalSpent = Object.values(currentWeekSpending).reduce((sum, amount) => sum + amount, 0);
    const weeklyAverage = expenses.length > 0 
      ? Object.values(this.calculateCategorySpending(expenses)).reduce((sum, amount) => sum + amount, 0) / 
        Math.max(1, Math.ceil((new Date().getTime() - new Date(expenses[expenses.length - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : totalSpent;

    // Analyze categories
    const categoryBreakdown = this.analyzeCategoryTrends(
      currentWeekSpending,
      previousWeekSpending,
      lastMonthSpending
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(categoryBreakdown, totalSpent, weeklyAverage);

    // Generate trends (simplified for last 4 weeks)
    const trends: SpendingTrend[] = [];
    for (let week = 0; week < 4; week++) {
      const weekExpenses = this.getWeeklyExpenses(expenses, week);
      const weekSpending = this.calculateCategorySpending(weekExpenses);
      const weekTotal = Object.values(weekSpending).reduce((sum, amount) => sum + amount, 0);
      
      const previousWeekTotal = week < 3 
        ? Object.values(this.calculateCategorySpending(this.getWeeklyExpenses(expenses, week + 1)))
            .reduce((sum, amount) => sum + amount, 0)
        : weekTotal;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;
      
      if (previousWeekTotal > 0) {
        trendPercentage = ((weekTotal - previousWeekTotal) / previousWeekTotal) * 100;
        if (Math.abs(trendPercentage) > 5) {
          trend = trendPercentage > 0 ? 'up' : 'down';
        }
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (week * 7) - weekStart.getDay());
      
      trends.push({
        period: `Week of ${weekStart.toLocaleDateString()}`,
        totalSpending: weekTotal,
        categorySpending: weekSpending,
        trend,
        trendPercentage
      });
    }

    // Generate alerts
    const alerts = this.generateAlerts(categoryBreakdown, totalSpent);

    // Calculate budget score
    const score = this.calculateBudgetScore(categoryBreakdown, totalSpent, weeklyAverage);

    return {
      totalSpent,
      weeklyAverage,
      monthlyProjection: totalSpent * 4.33, // weeks in month
      categoryBreakdown,
      recommendations,
      trends: trends.reverse(), // Show chronologically
      alerts,
      score
    };
  }

  public getWeeklyInsights(expenses: Expense[]): string[] {
    const analysis = this.analyzeWeeklyBudget(expenses);
    const insights: string[] = [];

    // Top spending insight
    if (analysis.categoryBreakdown.length > 0) {
      const topCategory = analysis.categoryBreakdown[0];
      insights.push(`💡 Your biggest spending category this week is ${topCategory.category} at ${topCategory.currentSpending.toFixed(2)} OMR (${topCategory.percentageOfTotal.toFixed(1)}% of total)`);
    }

    // Budget performance
    if (analysis.score.overall >= 80) {
      insights.push('🎯 Excellent budget control! You\'re staying within limits across most categories');
    } else if (analysis.score.overall >= 60) {
      insights.push('⚖️ Good budget management with room for improvement in a few areas');
    } else {
      insights.push('⚠️ Your budget needs attention - several categories are over their limits');
    }

    // Trend insight
    const increasingCategories = analysis.categoryBreakdown.filter(cat => cat.trend === 'increasing').length;
    if (increasingCategories > 2) {
      insights.push(`📈 ${increasingCategories} spending categories are trending upward - consider reviewing these areas`);
    }

    // Best performing category
    const bestCategory = analysis.categoryBreakdown.find(cat => 
      !cat.isOverBudget && cat.trend !== 'increasing' && cat.currentSpending > 0
    );
    if (bestCategory) {
      insights.push(`✅ Great control over your ${bestCategory.category} spending - keep it up!`);
    }

    return insights;
  }
}

export const budgetAdvisor = new BudgetAdvisor();