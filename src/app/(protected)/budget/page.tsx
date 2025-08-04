'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';

interface BudgetItem {
  id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  month: string;
  year: number;
  description?: string;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  categories: number;
}

export default function BudgetPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    categories: 0
  });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [spentAmount, setSpentAmount] = useState('0');
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');

  // Filters
  const [filterMonth, setFilterMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const categories = [
    'Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare',
    'Entertainment', 'Shopping', 'Travel', 'Education', 'Savings', 'Other'
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchBudgets();
  }, [filterMonth, filterYear]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      
      const response = await fetch(`/api/sheets/budget?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setBudgets(data.data.budgets || []);
        setSummary(data.data.summary || { totalBudget: 0, totalSpent: 0, remaining: 0, categories: 0 });
        setUsingMockData(false);
      } else {
        console.error('Failed to fetch budgets:', data.message);
        setUsingMockData(true);
        // Set empty state instead of mock data
        setBudgets([]);
        setSummary({
          totalBudget: 0,
          totalSpent: 0,
          remaining: 0,
          categories: 0
        });
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setUsingMockData(true);
      // Set empty state instead of mock data
      setBudgets([]);
      setSummary({
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        categories: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async () => {
    if (!category || !budgetAmount || !month || !year) {
      alert(t('settingsDescription'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/sheets/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          budgetAmount: parseFloat(budgetAmount),
          spentAmount: parseFloat(spentAmount || '0'),
          month,
          year: parseInt(year),
          description
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchBudgets();
        setShowAddForm(false);
        setCategory('');
        setBudgetAmount('');
        setSpentAmount('0');
        setDescription('');
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error adding budget:', error);
      alert(t('settingsError'));
    } finally {
      setAdding(false);
    }
  };

  const updateBudget = async (budgetId: string, updatedData: Partial<BudgetItem>) => {
    try {
      const response = await fetch('/api/sheets/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: budgetId,
          ...updatedData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchBudgets();
        setEditingId(null);
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error updating budget:', error);
      alert(t('settingsError'));
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!confirm(t('delete') + ' ' + t('budgetTitle') + '?')) {
      return;
    }

    setDeleting(budgetId);
    try {
      const response = await fetch('/api/sheets/budget', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: budgetId })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchBudgets();
      } else {
        alert(t('settingsError') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert(t('settingsError'));
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  const getBudgetStatus = (budgetAmount: number, spentAmount: number) => {
    const percentage = (spentAmount / budgetAmount) * 100;
    if (percentage > 100) return { status: 'over', color: 'text-red-600', icon: AlertTriangle };
    if (percentage > 80) return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'good', color: 'text-green-600', icon: CheckCircle };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">{t('budgetTitle')}</h1>
              <p className="text-black">{t('settingsDescription')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={fetchBudgets} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('loading')}
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add')} {t('budgetTitle')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('budgetTitle')}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalBudget)}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('expenses')}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalSpent)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('balance')}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(summary.remaining)}</p>
                </div>
                {summary.remaining >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="palette-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">{t('category')}</p>
                  <p className="text-2xl font-bold text-primary">{summary.categories}</p>
                </div>
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('date')}</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
                >
                  {months.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('date')}</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Budget Form */}
        {showAddForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{t('add')} {t('budgetTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
                  >
                    <option value="">{t('category')}</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('amount')}</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('expenses')}</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={spentAmount}
                    onChange={(e) => setSpentAmount(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('date')}</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('date')}</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
                  >
                    {[2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('description')}</label>
                <Input
                  placeholder={t('description')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-black"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addBudget} disabled={!category || !budgetAmount || adding}>
                  {adding ? t('saving') : t('add') + ' ' + t('budgetTitle')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black">{t('overview')}</CardTitle>
            <CardDescription>{t('settingsDescription')} {filterMonth} {filterYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-black">{t('loading')}...</p>
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-black">{t('budgetTitle')} {filterMonth} {filterYear}</p>
                <p className="text-gray-600 text-sm">{t('add')} {t('budgetTitle')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const remaining = budget.budgetAmount - budget.spentAmount;
                  const percentage = (budget.spentAmount / budget.budgetAmount) * 100;
                  const statusInfo = getBudgetStatus(budget.budgetAmount, budget.spentAmount);
                  const StatusIcon = statusInfo.icon;
                  const isEditing = editingId === budget.id;
                  
                  return (
                    <div key={budget.id} className="p-4 border border-border rounded-lg bg-white">
                      {isEditing ? (
                        <EditBudgetForm
                          budget={budget}
                          onSave={(updatedData) => updateBudget(budget.id, updatedData)}
                          onCancel={() => setEditingId(null)}
                          categories={categories}
                          months={months}
                        />
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-black">{budget.category}</span>
                                <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                              </div>
                              {budget.description && (
                                <p className="text-sm text-gray-600">{budget.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right mr-4">
                                <div className="text-lg font-bold text-black">
                                  {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.budgetAmount)}
                                </div>
                                <div className={`text-sm font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {remaining >= 0 ? t('balance') + ': ' : t('expenses') + ': '}{formatCurrency(Math.abs(remaining))}
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  onClick={() => setEditingId(budget.id)}
                                  variant="outline"
                                  size="sm"
                                  className="p-2"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteBudget(budget.id)}
                                  variant="outline"
                                  size="sm"
                                  className="p-2 text-red-600 hover:text-red-700"
                                  disabled={deleting === budget.id}
                                >
                                  {deleting === budget.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                percentage > 100 ? 'bg-red-600' : 
                                percentage > 80 ? 'bg-yellow-500' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{percentage.toFixed(1)}% {t('expenses')}</span>
                            <span>{budget.month} {budget.year}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Edit Budget Form Component
interface EditBudgetFormProps {
  budget: BudgetItem;
  onSave: (data: Partial<BudgetItem>) => void;
  onCancel: () => void;
  categories: string[];
  months: string[];
}

function EditBudgetForm({ budget, onSave, onCancel, categories, months }: EditBudgetFormProps) {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [editCategory, setEditCategory] = useState(budget.category);
  const [editBudgetAmount, setEditBudgetAmount] = useState(budget.budgetAmount.toString());
  const [editSpentAmount, setEditSpentAmount] = useState(budget.spentAmount.toString());
  const [editMonth, setEditMonth] = useState(budget.month);
  const [editYear, setEditYear] = useState(budget.year.toString());
  const [editDescription, setEditDescription] = useState(budget.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editCategory || !editBudgetAmount || !editMonth || !editYear) {
      alert(t('settingsDescription'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        category: editCategory,
        budgetAmount: parseFloat(editBudgetAmount),
        spentAmount: parseFloat(editSpentAmount),
        month: editMonth,
        year: parseInt(editYear),
        description: editDescription
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">{t('category')}</label>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">{t('amount')}</label>
          <Input
            type="number"
            step="0.001"
            value={editBudgetAmount}
            onChange={(e) => setEditBudgetAmount(e.target.value)}
            className="text-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">{t('expenses')}</label>
          <Input
            type="number"
            step="0.001"
            value={editSpentAmount}
            onChange={(e) => setEditSpentAmount(e.target.value)}
            className="text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">{t('date')}</label>
          <select
            value={editMonth}
            onChange={(e) => setEditMonth(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
          >
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">{t('date')}</label>
          <select
            value={editYear}
            onChange={(e) => setEditYear(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-1">{t('description')}</label>
        <Input
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          className="text-black"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('save')}
            </>
          )}
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="h-4 w-4 mr-2" />
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}