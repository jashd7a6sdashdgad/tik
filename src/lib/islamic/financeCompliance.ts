'use client';

export interface InvestmentCompliance {
  id: string;
  name: string;
  symbol?: string;
  category: 'stock' | 'etf' | 'fund' | 'bond' | 'cryptocurrency' | 'commodity' | 'real-estate';
  isHalal: boolean;
  complianceScore: number; // 0-100
  reasons: string[];
  prohibitedReasons?: string[];
  lastUpdated: number;
  source: string;
  shariaBoard?: string;
  alternatives?: string[];
}

export interface HalalInvestmentFilter {
  excludeRiba: boolean; // Interest-based investments
  excludeGharar: boolean; // Excessive uncertainty/gambling
  excludeHaram: boolean; // Prohibited industries (alcohol, gambling, pork, etc.)
  maxDebtRatio: number; // Maximum debt-to-market cap ratio (typically 33%)
  maxInterestIncomeRatio: number; // Maximum interest income ratio (typically 5%)
  requiresShariaCertification: boolean;
  acceptableUncertaintyLevel: 'low' | 'medium' | 'high';
}

export interface ShariaCertification {
  board: string;
  certificationDate: number;
  expiryDate?: number;
  certificateUrl?: string;
  remarks?: string;
}

class IslamicFinanceService {
  private halalDatabase: Map<string, InvestmentCompliance> = new Map();
  private prohibitedIndustries = [
    'alcohol',
    'gambling',
    'pork',
    'conventional-banking',
    'insurance',
    'adult-entertainment',
    'tobacco',
    'weapons',
    'conventional-finance'
  ];

  private shariaBoardsDatabase = [
    'AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions)',
    'Dow Jones Islamic Market Index',
    'FTSE Shariah Global Equity Index',
    'MSCI Islamic Index',
    'S&P Shariah Index',
    'Shariah Review Bureau',
    'Islamic Society of North America (ISNA)',
    'Amana Mutual Funds Trust'
  ];

  constructor() {
    this.loadComplianceData();
    this.initializeKnownHalalInvestments();
  }

  // Check if an investment is halal
  checkHalalCompliance(
    investmentData: {
      name: string;
      symbol?: string;
      industry?: string;
      debtRatio?: number;
      interestIncomeRatio?: number;
      businessActivities?: string[];
    },
    filters: HalalInvestmentFilter
  ): InvestmentCompliance {
    const compliance: InvestmentCompliance = {
      id: investmentData.symbol || investmentData.name.toLowerCase().replace(/\s+/g, '-'),
      name: investmentData.name,
      symbol: investmentData.symbol,
      category: this.determineCategory(investmentData),
      isHalal: true,
      complianceScore: 100,
      reasons: [],
      prohibitedReasons: [],
      lastUpdated: Date.now(),
      source: 'internal-analysis',
      alternatives: []
    };

    // Check for prohibited industries
    if (investmentData.industry) {
      const isProhibited = this.prohibitedIndustries.some(prohibited =>
        investmentData.industry!.toLowerCase().includes(prohibited)
      );
      
      if (isProhibited) {
        compliance.isHalal = false;
        compliance.complianceScore = 0;
        compliance.prohibitedReasons?.push(`Operates in prohibited industry: ${investmentData.industry}`);
      }
    }

    // Check business activities
    if (investmentData.businessActivities) {
      const prohibitedActivities = investmentData.businessActivities.filter(activity =>
        this.prohibitedIndustries.some(prohibited =>
          activity.toLowerCase().includes(prohibited)
        )
      );

      if (prohibitedActivities.length > 0) {
        compliance.isHalal = false;
        compliance.complianceScore = Math.max(0, compliance.complianceScore - 50);
        compliance.prohibitedReasons?.push(`Prohibited activities: ${prohibitedActivities.join(', ')}`);
      }
    }

    // Check debt ratio (max 33% typically)
    if (investmentData.debtRatio !== undefined) {
      if (investmentData.debtRatio > filters.maxDebtRatio) {
        compliance.isHalal = false;
        compliance.complianceScore = Math.max(0, compliance.complianceScore - 30);
        compliance.prohibitedReasons?.push(`Debt ratio too high: ${investmentData.debtRatio}% > ${filters.maxDebtRatio}%`);
      } else {
        compliance.reasons.push(`Acceptable debt ratio: ${investmentData.debtRatio}%`);
      }
    }

    // Check interest income ratio (max 5% typically)
    if (investmentData.interestIncomeRatio !== undefined) {
      if (investmentData.interestIncomeRatio > filters.maxInterestIncomeRatio) {
        compliance.isHalal = false;
        compliance.complianceScore = Math.max(0, compliance.complianceScore - 25);
        compliance.prohibitedReasons?.push(`Interest income too high: ${investmentData.interestIncomeRatio}% > ${filters.maxInterestIncomeRatio}%`);
      } else {
        compliance.reasons.push(`Acceptable interest income: ${investmentData.interestIncomeRatio}%`);
      }
    }

    // Add positive reasons if halal
    if (compliance.isHalal) {
      compliance.reasons.push('No prohibited business activities detected');
      compliance.reasons.push('Complies with Islamic finance principles');
      
      if (filters.excludeRiba) {
        compliance.reasons.push('Riba-free investment');
      }
      
      if (filters.excludeGharar) {
        compliance.reasons.push('Low uncertainty/speculation');
      }
    }

    // Suggest alternatives if not halal
    if (!compliance.isHalal) {
      compliance.alternatives = this.suggestHalalAlternatives(investmentData.industry || '');
    }

    return compliance;
  }

  // Get halal investment recommendations
  getHalalRecommendations(
    riskProfile: 'conservative' | 'moderate' | 'aggressive',
    investmentAmount: number,
    filters: HalalInvestmentFilter
  ): InvestmentCompliance[] {
    const recommendations: InvestmentCompliance[] = [];

    // Technology stocks (generally halal)
    recommendations.push({
      id: 'tech-sector',
      name: 'Technology Sector ETF (Shariah Compliant)',
      category: 'etf',
      isHalal: true,
      complianceScore: 95,
      reasons: [
        'Technology sector generally compliant',
        'Screened for Shariah compliance',
        'Low debt ratios',
        'No prohibited business activities'
      ],
      lastUpdated: Date.now(),
      source: 'recommendation-engine',
      shariaBoard: 'FTSE Shariah Global Equity Index'
    });

    // Healthcare (selective)
    recommendations.push({
      id: 'healthcare-halal',
      name: 'Halal Healthcare Fund',
      category: 'fund',
      isHalal: true,
      complianceScore: 90,
      reasons: [
        'Essential healthcare services',
        'Excludes pharmaceutical companies with non-halal products',
        'Shariah board approved'
      ],
      lastUpdated: Date.now(),
      source: 'recommendation-engine',
      shariaBoard: 'AAOIFI'
    });

    // Real Estate Investment Trusts (REITs)
    recommendations.push({
      id: 'halal-reit',
      name: 'Shariah Compliant REIT',
      category: 'real-estate',
      isHalal: true,
      complianceScore: 88,
      reasons: [
        'Real estate is permissible in Islam',
        'No conventional financing',
        'Excludes hotels with bars/casinos'
      ],
      lastUpdated: Date.now(),
      source: 'recommendation-engine'
    });

    // Commodities (Gold, Silver)
    if (riskProfile === 'conservative') {
      recommendations.push({
        id: 'gold-investment',
        name: 'Gold Investment (Physical/ETF)',
        category: 'commodity',
        isHalal: true,
        complianceScore: 100,
        reasons: [
          'Physical gold is explicitly halal',
          'Store of value',
          'No debt or interest involved'
        ],
        lastUpdated: Date.now(),
        source: 'recommendation-engine'
      });
    }

    // Filter based on investment amount and risk profile
    return recommendations.filter(rec => {
      if (riskProfile === 'conservative') {
        return rec.complianceScore >= 90;
      } else if (riskProfile === 'moderate') {
        return rec.complianceScore >= 80;
      } else {
        return rec.complianceScore >= 70;
      }
    });
  }

  // Check expense for halal compliance
  checkExpenseCompliance(expense: {
    description: string;
    category: string;
    amount: number;
    merchant?: string;
  }): {
    isHalal: boolean;
    concerns: string[];
    recommendations: string[];
  } {
    const result = {
      isHalal: true,
      concerns: [] as string[],
      recommendations: [] as string[]
    };

    const description = expense.description.toLowerCase();
    const category = expense.category.toLowerCase();

    // Check for prohibited expenses
    const prohibitedKeywords = [
      'alcohol', 'wine', 'beer', 'liquor', 'bar',
      'casino', 'gambling', 'lottery', 'betting',
      'nightclub', 'strip club',
      'interest', 'late fee', 'penalty fee',
      'pork', 'ham', 'bacon'
    ];

    const foundProhibited = prohibitedKeywords.filter(keyword =>
      description.includes(keyword) || category.includes(keyword)
    );

    if (foundProhibited.length > 0) {
      result.isHalal = false;
      result.concerns.push(`Potentially haram expense: ${foundProhibited.join(', ')}`);
    }

    // Check for interest-based transactions
    if (description.includes('interest') || description.includes('fee') && expense.amount > 0) {
      result.concerns.push('Possible interest-based fee - review transaction details');
    }

    // Recommendations for halal alternatives
    if (!result.isHalal) {
      if (foundProhibited.some(item => ['alcohol', 'wine', 'beer', 'liquor'].includes(item))) {
        result.recommendations.push('Consider halal beverages and restaurants');
      }
      
      if (foundProhibited.some(item => ['casino', 'gambling', 'lottery'].includes(item))) {
        result.recommendations.push('Seek halal entertainment alternatives');
      }
    }

    return result;
  }

  // Get Shariah-compliant financial ratios
  getShariahRatios(): {
    maxDebtRatio: number;
    maxInterestIncomeRatio: number;
    maxNonHalalIncomeRatio: number;
    explanation: string;
  } {
    return {
      maxDebtRatio: 33, // 33% is commonly accepted
      maxInterestIncomeRatio: 5, // 5% is commonly accepted
      maxNonHalalIncomeRatio: 5, // 5% for non-halal income
      explanation: 'These ratios are based on commonly accepted Shariah screening criteria used by major Islamic indices and scholars.'
    };
  }

  // Get list of major Shariah boards
  getShariahBoards(): string[] {
    return [...this.shariaBoardsDatabase];
  }

  // Purification calculation (for disposing of haram income)
  calculatePurification(
    totalInvestment: number,
    halalIncomePercentage: number,
    holdingPeriod: number // in months
  ): {
    purificationAmount: number;
    purificationPercentage: number;
    recommendedCharity: string[];
  } {
    const haramPercentage = 100 - halalIncomePercentage;
    const purificationAmount = (totalInvestment * haramPercentage) / 100;

    return {
      purificationAmount,
      purificationPercentage: haramPercentage,
      recommendedCharity: [
        'Local mosque or Islamic center',
        'Islamic relief organizations',
        'Poor and needy in the community',
        'Educational institutions',
        'Healthcare for the underprivileged'
      ]
    };
  }

  private determineCategory(investmentData: any): InvestmentCompliance['category'] {
    const name = investmentData.name.toLowerCase();
    
    if (name.includes('etf') || name.includes('exchange traded')) return 'etf';
    if (name.includes('bond') || name.includes('treasury')) return 'bond';
    if (name.includes('fund') || name.includes('mutual')) return 'fund';
    if (name.includes('bitcoin') || name.includes('crypto')) return 'cryptocurrency';
    if (name.includes('gold') || name.includes('silver') || name.includes('commodity')) return 'commodity';
    if (name.includes('reit') || name.includes('real estate')) return 'real-estate';
    
    return 'stock';
  }

  private suggestHalalAlternatives(industry: string): string[] {
    const alternatives: { [key: string]: string[] } = {
      'banking': ['Islamic banking', 'Sukuk bonds', 'Murabaha financing'],
      'insurance': ['Takaful insurance', 'Islamic insurance products'],
      'alcohol': ['Halal beverage companies', 'Food and beverage (halal certified)'],
      'gambling': ['Halal entertainment', 'Sports and recreation', 'Educational services'],
      'conventional-finance': ['Islamic finance', 'Shariah-compliant funds', 'Sukuk investments']
    };

    return alternatives[industry.toLowerCase()] || ['Shariah-compliant alternatives in same sector'];
  }

  private initializeKnownHalalInvestments(): void {
    // Add some well-known halal investments
    const knownHalal = [
      {
        id: 'apple',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        category: 'stock' as const,
        isHalal: true,
        complianceScore: 95,
        reasons: ['Technology company', 'Low debt ratio', 'No prohibited activities'],
        source: 'multiple-shariah-boards'
      },
      {
        id: 'microsoft',
        name: 'Microsoft Corporation',
        symbol: 'MSFT',
        category: 'stock' as const,
        isHalal: true,
        complianceScore: 90,
        reasons: ['Technology services', 'Software development', 'Cloud computing'],
        source: 'shariah-screening'
      }
    ];

    knownHalal.forEach(investment => {
      this.halalDatabase.set(investment.id, {
        ...investment,
        lastUpdated: Date.now()
      });
    });
  }

  private loadComplianceData(): void {
    try {
      const stored = localStorage.getItem('islamicFinanceCompliance');
      if (stored) {
        const data = JSON.parse(stored);
        this.halalDatabase = new Map(data.investments || []);
      }
    } catch (error) {
      console.warn('Failed to load Islamic finance compliance data:', error);
    }
  }

  private saveComplianceData(): void {
    try {
      const data = {
        investments: Array.from(this.halalDatabase.entries()),
        lastUpdated: Date.now()
      };
      localStorage.setItem('islamicFinanceCompliance', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save Islamic finance compliance data:', error);
    }
  }
}

export const islamicFinanceService = new IslamicFinanceService();