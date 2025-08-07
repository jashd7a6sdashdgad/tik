'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Brain,
  RefreshCw,
  Settings,
  Save,
  AlertTriangle,
  CheckCircle,
  PieChart,
  BarChart3,
  Calendar,
  Zap
} from 'lucide-react';
import BudgetAdvisorDashboard from '@/components/BudgetAdvisorDashboard';

interface BudgetLimit {
  category: string;
  monthlyLimit: number;
  weeklyLimit: number;
  currentSpent: number;
  remaining: number;
  status: 'safe' | 'warning' | 'danger';
}

export default function BudgetPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'advisor' | 'limits' | 'goals'>('advisor');

  const defaultCategories = [
    { category: 'Food', defaultMonthly: 300 },
    { category: 'Transportation', defaultMonthly: 150 },
    { category: 'Entertainment', defaultMonthly: 100 },
    { category: 'Shopping', defaultMonthly: 200 },
    { category: 'Medical', defaultMonthly: 100 },
    { category: 'Business', defaultMonthly: 500 },
    { category: 'Utilities', defaultMonthly: 120 },
    { category: 'Travel', defaultMonthly: 200 },
    { category: 'Education', defaultMonthly: 80 },
    { category: 'General', defaultMonthly: 150 }
  ];

  useEffect(() => {
    fetchExpensesAndBudgets();
  }, []);

  const fetchExpensesAndBudgets = async () => {
    setLoading(true);
    try {
      // Fetch expenses
      const expenseResponse = await fetch('/api/sheets/expenses');
      const expenseData = await expenseResponse.json();
      
      let currentExpenses: any[] = [];
      if (expenseData.success) {
        currentExpenses = expenseData.data.expenses || [];
      } else {
        // Use mock data
        currentExpenses = [
          {
            id: '1',
            from: 'Bank of Oman',
            date: new Date().toISOString().split('T')[0],
            creditAmount: 0,
            debitAmount: 15.500,
            category: 'Food',
            description: 'Lunch at restaurant',
            availableBalance: 984.500
          },
          {
            id: '2',
            from: 'Credit Card',
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            creditAmount: 0,
            debitAmount: 25.000,
            category: 'Transportation',
            description: 'Taxi to airport',
            availableBalance: 959.500
          },
          {
            id: '3',
            from: 'Business Account',
            date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
            creditAmount: 0,
            debitAmount: 120.750,
            category: 'Business',
            description: 'Office supplies',
            availableBalance: 838.750
          },
          {
            id: '4',
            from: 'Bank of Oman',
            date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
            creditAmount: 0,
            debitAmount: 45.200,
            category: 'Food',
            description: 'Grocery shopping',
            availableBalance: 793.550
          },
          {
            id: '5',
            from: 'Credit Card',
            date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
            creditAmount: 0,
            debitAmount: 80.000,
            category: 'Entertainment',
            description: 'Movie tickets and dinner',
            availableBalance: 713.550
          }
        ];
      }
      
      setExpenses(currentExpenses);

      // Load budget limits from localStorage or initialize with defaults
      const savedBudgets = localStorage.getItem('budget-limits');
      let budgets: BudgetLimit[] = [];
      
      if (savedBudgets) {
        budgets = JSON.parse(savedBudgets);
      } else {
        budgets = defaultCategories.map(cat => ({
          category: cat.category,
          monthlyLimit: cat.defaultMonthly,
          weeklyLimit: cat.defaultMonthly / 4.33, // weeks in month
          currentSpent: 0,
          remaining: cat.defaultMonthly,
          status: 'safe' as const
        }));
      }

      // Calculate current spending for each category
      const currentMonthExpenses = getCurrentMonthExpenses(currentExpenses);
      const categorySpending = calculateCategorySpending(currentMonthExpenses);

      budgets = budgets.map(budget => {
        const spent = categorySpending[budget.category] || 0;
        const remaining = budget.monthlyLimit - spent;
        const spentPercentage = (spent / budget.monthlyLimit) * 100;
        
        let status: 'safe' | 'warning' | 'danger' = 'safe';
        if (spentPercentage >= 100) status = 'danger';
        else if (spentPercentage >= 80) status = 'warning';

        return {
          ...budget,
          currentSpent: spent,
          remaining: Math.max(0, remaining),
          status
        };
      });

      setBudgetLimits(budgets);
    } catch (error) {
      console.error('Error fetching expenses and budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthExpenses = (expenses: any[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    });
  };

  const calculateCategorySpending = (expenses: any[]) => {
    return expenses.reduce((acc, expense) => {
      const amount = (expense.debitAmount || 0) - (expense.creditAmount || 0);
      acc[expense.category] = (acc[expense.category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const updateBudgetLimit = (category: string, monthlyLimit: number) => {
    setBudgetLimits(prev => prev.map(budget => {
      if (budget.category === category) {
        const remaining = monthlyLimit - budget.currentSpent;
        const spentPercentage = (budget.currentSpent / monthlyLimit) * 100;
        
        let status: 'safe' | 'warning' | 'danger' = 'safe';
        if (spentPercentage >= 100) status = 'danger';
        else if (spentPercentage >= 80) status = 'warning';

        return {
          ...budget,
          monthlyLimit,
          weeklyLimit: monthlyLimit / 4.33,
          remaining: Math.max(0, remaining),
          status
        };
      }
      return budget;
    }));
  };

  const saveBudgetLimits = async () => {
    setSaving(true);
    try {
      localStorage.setItem('budget-limits', JSON.stringify(budgetLimits));
      alert('Budget limits saved successfully!');
    } catch (error) {
      alert('Failed to save budget limits');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaultBudgets = defaultCategories.map(cat => ({
      category: cat.category,
      monthlyLimit: cat.defaultMonthly,
      weeklyLimit: cat.defaultMonthly / 4.33,
      currentSpent: 0,
      remaining: cat.defaultMonthly,
      status: 'safe' as const
    }));
    setBudgetLimits(defaultBudgets);
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'danger': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'danger': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalBudget = budgetLimits.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
  const totalSpent = budgetLimits.reduce((sum, budget) => sum + budget.currentSpent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgetLimits.filter(budget => budget.status === 'danger').length;
  const warningCount = budgetLimits.filter(budget => budget.status === 'warning').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Auto Budget Advisor
                </h1>
                <p className="text-gray-600 font-medium mt-1">AI-powered budget tracking and weekly spending recommendations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={fetchExpensesAndBudgets} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={saveBudgetLimits} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <main className="space-y-8">
        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Total Budget</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalBudget)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Remaining</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRemaining)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">{overBudgetCount + warningCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { id: 'advisor', label: 'AI Budget Advisor', icon: Brain },
                { id: 'limits', label: 'Budget Limits', icon: Settings },
                { id: 'goals', label: 'Savings Goals', icon: Target }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            {/* AI Budget Advisor Tab */}
            {activeTab === 'advisor' && (
              <div>
                <BudgetAdvisorDashboard 
                  expenses={expenses} 
                  onRefresh={fetchExpensesAndBudgets}
                />
              </div>
            )}

            {/* Budget Limits Tab */}
            {activeTab === 'limits' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Monthly Budget Limits</h3>
                  <Button onClick={resetToDefaults} variant="outline" size="sm">
                    Reset to Defaults
                  </Button>
                </div>

                <div className="space-y-4">
                  {budgetLimits.map((budget) => (
                    <div key={budget.category} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{budget.category}</h4>
                          {getStatusIcon(budget.status)}
                          <Badge className={getStatusColor(budget.status)}>
                            {budget.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {formatCurrency(budget.currentSpent)} / {formatCurrency(budget.monthlyLimit)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((budget.currentSpent / budget.monthlyLimit) * 100).toFixed(1)}% used
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all ${
                              budget.status === 'danger' ? 'bg-red-500' :
                              budget.status === 'warning' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((budget.currentSpent / budget.monthlyLimit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Limit (OMR)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={budget.monthlyLimit}
                            onChange={(e) => updateBudgetLimit(budget.category, parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weekly Limit
                          </label>
                          <Input
                            type="text"
                            value={formatCurrency(budget.weeklyLimit)}
                            disabled
                            className="text-sm bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Spent
                          </label>
                          <Input
                            type="text"
                            value={formatCurrency(budget.currentSpent)}
                            disabled
                            className="text-sm bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remaining
                          </label>
                          <Input
                            type="text"
                            value={formatCurrency(budget.remaining)}
                            disabled
                            className={`text-sm ${
                              budget.remaining <= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings Goals Tab */}
            {activeTab === 'goals' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Savings Goals</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Fund</CardTitle>
                      <CardDescription>Build 6 months of expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div className="bg-blue-500 h-4 rounded-full" style={{ width: '35%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>1,500 OMR</span>
                          <span>4,300 OMR</span>
                        </div>
                        <p className="text-sm text-gray-600">35% complete • 2,800 OMR remaining</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vacation Fund</CardTitle>
                      <CardDescription>Europe trip in 8 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div className="bg-green-500 h-4 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>1,200 OMR</span>
                          <span>2,000 OMR</span>
                        </div>
                        <p className="text-sm text-gray-600">60% complete • 800 OMR remaining</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Create New Goal</CardTitle>
                    <CardDescription>Set a new savings target</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Goal name" />
                      <Input type="number" placeholder="Target amount (OMR)" />
                      <Input type="date" placeholder="Target date" />
                    </div>
                    <Button className="mt-4" disabled>
                      <Target className="h-4 w-4 mr-2" />
                      Create Goal (Coming Soon)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  );
}