'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Expense } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  RefreshCw,
  PieChart,
  BarChart3,
  Mic,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Brain,
  Camera,
  Zap,
  Target,
  Eye
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import AddExpenseForm from '@/components/AddExpenseForm';
import { expenseIntelligence, SmartExpense } from '@/lib/expenseIntelligence';
import ExpenseInsightsDashboard from '@/components/ExpenseInsightsDashboard';
import BudgetAdvisorDashboard from '@/components/BudgetAdvisorDashboard';

interface ExpenseAnalytics {
  total: number;
  count: number;
  categoryTotals: Record<string, number>;
  averageExpense: number;
}


export default function ExpensesPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);


  // Form fields for voice input
  const [description, setDescription] = useState('');
  const [debitAmount, setDebitAmount] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [showBudgetAdvisor, setShowBudgetAdvisor] = useState(false);
  const [smartExpenses, setSmartExpenses] = useState<SmartExpense[]>([]);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  const categories = [
    { value: 'Food', label: t('food') },
    { value: 'Transportation', label: t('transportation') },
    { value: 'Business', label: t('business') },
    { value: 'Medical', label: t('medical') },
    { value: 'Entertainment', label: t('entertainment') },
    { value: 'Shopping', label: t('shopping') },
    { value: 'Utilities', label: t('utilities') },
    { value: 'Travel', label: t('travel') },
    { value: 'Education', label: t('education') },
    { value: 'General', label: t('general') }
  ];

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (categoryFilter) params.append('category', categoryFilter);
      
      const response = await fetch(`/api/sheets/expenses?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const rawExpenses = data.data.expenses || [];
        setExpenses(rawExpenses);
        
        // Apply AI intelligence to classify expenses
        const enhancedExpenses = expenseIntelligence.batchClassifyExpenses(rawExpenses);
        setSmartExpenses(enhancedExpenses);
        
        setAnalytics(data.data.analytics || null);
      } else {
        console.error('Failed to fetch expenses:', data.message);
        setUsingMockData(true);
        // Use mock data as fallback when API is not available
        const mockExpenses = [
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
          }
        ];
        
        setExpenses(mockExpenses);
        
        // Apply AI intelligence to mock data too
        const enhancedMockExpenses = expenseIntelligence.batchClassifyExpenses(mockExpenses);
        setSmartExpenses(enhancedMockExpenses);
        
        setAnalytics({
          total: mockExpenses.reduce((sum, exp) => sum + ((exp.debitAmount || 0) - (exp.creditAmount || 0)), 0),
          count: mockExpenses.length,
          categoryTotals: mockExpenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + ((exp.debitAmount || 0) - (exp.creditAmount || 0));
            return acc;
          }, {} as Record<string, number>),
          averageExpense: mockExpenses.reduce((sum, exp) => sum + ((exp.debitAmount || 0) - (exp.creditAmount || 0)), 0) / mockExpenses.length
        });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setUsingMockData(true);
      // Use mock data as fallback when there's a network error
      const mockExpenses = [
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
        }
      ];
      
      setExpenses(mockExpenses);
      
      // Apply AI intelligence to fallback data
      const enhancedFallbackExpenses = expenseIntelligence.batchClassifyExpenses(mockExpenses);
      setSmartExpenses(enhancedFallbackExpenses);
      
      setAnalytics({
        total: mockExpenses.reduce((sum, exp) => sum + ((exp.debitAmount || 0) - (exp.creditAmount || 0)), 0),
        count: mockExpenses.length,
        categoryTotals: mockExpenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + ((exp.debitAmount || 0) - (exp.creditAmount || 0));
          return acc;
        }, {} as Record<string, number>),
        averageExpense: mockExpenses.reduce((sum, exp) => sum + ((exp.debitAmount || 0) - (exp.creditAmount || 0)), 0) / mockExpenses.length
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (transcript && !isListening) {
      parseVoiceExpense(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const parseVoiceExpense = (voiceInput: string) => {
    const input = voiceInput.toLowerCase();
    const expensePattern = /(?:add|spent)\s+(\d+(?:\.\d{1,3})?)\s+(?:omr\s+)?(?:expense\s+)?(?:for|on)\s+(.+)/i;
    const match = input.match(expensePattern);
    
    if (match) {
      setDebitAmount(match[1]);
      setDescription(match[2].trim());
      setShowAddForm(true);
    } else {
      setDescription(voiceInput);
      setShowAddForm(true);
    }
  };


  const deleteExpense = async (expenseId: string) => {
    if (!confirm(t('delete') + ' ' + t('expenses') + '?')) {
      return;
    }

    setDeleting(expenseId);
    try {
      const response = await fetch('/api/sheets/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expenseId })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchExpenses();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert(t('settingsError'));
    } finally {
      setDeleting(null);
    }
  };

  const clearForm = () => {
    setShowAddForm(false);
    setDescription('');
    setDebitAmount('');
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  const getPaginatedExpenses = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return expenses.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(expenses.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('expensesTitle')}</h1>
              <p className="text-black">{t('profileDescription')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={fetchExpenses} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
              <Button 
                onClick={() => setShowInsights(!showInsights)} 
                variant="outline" 
                size="sm"
                className={showInsights ? 'bg-blue-50 text-blue-700' : ''}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </Button>
              <Button 
                onClick={() => setShowBudgetAdvisor(!showBudgetAdvisor)} 
                variant="outline" 
                size="sm"
                className={showBudgetAdvisor ? 'bg-green-50 text-green-700' : ''}
              >
                <Target className="h-4 w-4 mr-2" />
                Budget Advisor
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addExpense')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budget Advisor Dashboard */}
        {showBudgetAdvisor && (
          <div className="mb-8">
            <BudgetAdvisorDashboard 
              expenses={expenses} 
              onRefresh={fetchExpenses}
            />
          </div>
        )}

        {/* AI Insights Dashboard */}
        {showInsights && (
          <div className="mb-8">
            <ExpenseInsightsDashboard 
              expenses={smartExpenses} 
              onRefresh={fetchExpenses}
            />
          </div>
        )}
        {/* API Status Banner */}
        {usingMockData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>{t('demoMode')}:</strong> Google Sheets API is not available. Showing sample data. 
                  <a href="https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=573350886841" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="underline ml-1">
                    {t('enableSheetsApi')}
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Voice Add Expense */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('voiceInput')}</CardTitle>
            <CardDescription>{t('voiceDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={isListening ? stopListening : startListening}
                className={isListening ? 'voice-active bg-accent text-accent-foreground' : ''}
                disabled={!isSupported}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isListening ? t('stopRecording') : t('voiceInput')}
              </Button>
              {transcript && (
                <p className="text-sm text-black italic">"{transcript}"</p>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('expenses')}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(analytics.total)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('expenses')}</p>
                    <p className="text-2xl font-bold text-primary">{analytics.count}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('statistics')}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(analytics.averageExpense)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('category')}</p>
                    <p className="text-2xl font-bold text-primary">{Object.keys(analytics.categoryTotals).length}</p>
                  </div>
                  <PieChart className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('startTime')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-black"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('endTime')}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-black"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('category')}</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
                >
                  <option value="">{t('category')}</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="mb-8">
            <AddExpenseForm onAdded={() => {
              fetchExpenses();
              setShowAddForm(false);
            }} />
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={clearForm}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black">{t('expenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-black">{t('loading')}</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-black">No expenses found</p>
                <p className="text-gray-600 text-sm">Start by adding your first expense or upload receipt images</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={() => setShowAddForm(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button onClick={() => setShowInsights(true)} variant="outline">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getPaginatedExpenses().map((expense) => {
                    // Find corresponding smart expense data
                    const smartExpense = smartExpenses.find(se => se.id === expense.id) || expense;
                    const isSmartExpense = smartExpense !== expense;
                    
                    return (
                      <div key={expense.id} className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                        smartExpense.budgetImpact === 'over_budget' ? 'border-red-200 bg-red-50' :
                        smartExpense.budgetImpact === 'significant_expense' ? 'border-orange-200 bg-orange-50' :
                        smartExpense.anomalyScore && smartExpense.anomalyScore > 0.7 ? 'border-purple-200 bg-purple-50' :
                        'border-border bg-white'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <span className="font-medium text-black">{expense.description}</span>
                              
                              {/* Original category */}
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {expense.category}
                              </span>
                              
                              {/* AI-suggested category if different */}
                              {isSmartExpense && smartExpense.autoCategory && smartExpense.autoCategory !== expense.category && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                  <Brain className="h-3 w-3" />
                                  AI: {smartExpense.autoCategory}
                                  {smartExpense.confidence && (
                                    <span className="text-xs">({Math.round(smartExpense.confidence * 100)}%)</span>
                                  )}
                                </span>
                              )}
                              
                              {/* Budget impact indicator */}
                              {smartExpense.budgetImpact === 'over_budget' && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Over Budget
                                </span>
                              )}
                              
                              {smartExpense.budgetImpact === 'significant_expense' && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Large Expense
                                </span>
                              )}
                              
                              {/* Anomaly indicator */}
                              {smartExpense.anomalyScore && smartExpense.anomalyScore > 0.7 && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Unusual
                                </span>
                              )}
                              
                              {/* Recurring pattern */}
                              {smartExpense.recurringPattern && smartExpense.recurringPattern !== 'irregular' && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  {smartExpense.recurringPattern}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              {expense.date && <span>{new Date(expense.date).toLocaleDateString()}</span>}
                              {smartExpense.merchant && smartExpense.merchant !== expense.from && (
                                <span className="ml-2">• Merchant: {smartExpense.merchant}</span>
                              )}
                              {expense.from && (
                                <span className="ml-2">• From: {expense.from}</span>
                              )}
                            </div>
                            
                            {/* AI-generated tags */}
                            {smartExpense.tags && smartExpense.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {smartExpense.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {/* AI suggestions */}
                            {smartExpense.suggestedActions && smartExpense.suggestedActions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {smartExpense.suggestedActions.slice(0, 2).map((action, idx) => (
                                  <span key={idx} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200">
                                    💡 {action}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {expense.availableBalance && (
                              <div className="text-sm text-gray-600 mt-1">
                                Available Balance: {formatCurrency(expense.availableBalance)}
                              </div>
                            )}
                            
                            {expense.id && (
                              <div className="text-sm text-gray-600 mt-1">
                                ID: {expense.id.startsWith('http') ? (
                                  <a 
                                    href={expense.id} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                                  >
                                    {expense.id}
                                  </a>
                                ) : (
                                  <span className="ml-1">{expense.id}</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="text-right mr-4">
                              {expense.creditAmount && expense.creditAmount > 0 && (
                                <div className="text-sm text-green-600">+{formatCurrency(expense.creditAmount)}</div>
                              )}
                              {expense.debitAmount && expense.debitAmount > 0 && (
                                <div className="text-sm text-red-600">-{formatCurrency(expense.debitAmount)}</div>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => expense.id && deleteExpense(expense.id)}
                              disabled={deleting === expense.id}
                            >
                              <Trash2 className={`h-4 w-4 ${deleting === expense.id ? 'animate-spin' : 'text-red-500'}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {t('showingEntries', { 
                        start: String(((currentPage - 1) * itemsPerPage) + 1), 
                        end: String(Math.min(currentPage * itemsPerPage, expenses.length)), 
                        total: String(expenses.length) 
                      })}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('previous')}
                      </Button>
                      <span className="flex items-center px-3 py-2 text-sm">
                        {currentPage} / {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        {t('next')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
