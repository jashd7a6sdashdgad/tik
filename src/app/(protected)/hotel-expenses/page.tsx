'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  MapPin, 
  RefreshCw,
  Bed,
  Clock,
  Receipt,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';

interface HotelExpense {
  id: string;
  date: string;
  hotelName: string;
  roomType: string;
  nights: number;
  amount: number;
  city: string;
  notes: string;
  receipt: string;
}

interface HotelAnalytics {
  total: number;
  count: number;
  cityTotals: Record<string, number>;
  averageExpense: number;
  totalNights: number;
}

export default function HotelExpensesPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [expenses, setExpenses] = useState<HotelExpense[]>([]);
  const [analytics, setAnalytics] = useState<HotelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form fields
  const [hotelName, setHotelName] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [nights, setNights] = useState('1');
  const [amount, setAmount] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hotelFilter, setHotelFilter] = useState('');

  const roomTypes = [
    'Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential', 'Single', 'Double'
  ];

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate, hotelFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (hotelFilter) params.append('hotel', hotelFilter);
      
      const response = await fetch(`/api/sheets/hotel-expenses?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.data.expenses || []);
        setAnalytics(data.data.analytics || null);
        setUsingMockData(false);
      } else {
        console.error('Failed to fetch hotel expenses:', data.message);
        setUsingMockData(true);
        // Set empty state instead of mock data
        setExpenses([]);
        setAnalytics({
          total: 0,
          count: 0,
          cityTotals: {},
          averageExpense: 0,
          totalNights: 0
        });
      }
    } catch (error) {
      console.error('Error fetching hotel expenses:', error);
      setUsingMockData(true);
      // Set empty state instead of mock data
      setExpenses([]);
      setAnalytics({
        total: 0,
        count: 0,
        cityTotals: {},
        averageExpense: 0,
        totalNights: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!hotelName || !amount || !city || !nights) {
      alert(t('fillRequiredFields'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/sheets/hotel-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          roomType,
          nights: parseInt(nights),
          amount: parseFloat(amount),
          city,
          notes,
          receipt
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchExpenses();
        setShowAddForm(false);
        setHotelName('');
        setRoomType('Standard');
        setNights('1');
        setAmount('');
        setCity('');
        setNotes('');
        setReceipt('');
      } else {
        alert(t('failedToAddHotelExpense') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error adding hotel expense:', error);
      alert(t('errorAddingHotelExpense'));
    } finally {
      setAdding(false);
    }
  };

  const updateExpense = async (expenseId: string, updatedData: Partial<HotelExpense>) => {
    try {
      const response = await fetch('/api/sheets/hotel-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expenseId,
          ...updatedData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchExpenses();
        setEditingId(null);
      } else {
        alert(t('failedToUpdateHotelExpense') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error updating hotel expense:', error);
      alert(t('errorUpdatingHotelExpense'));
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm(t('areYouSureDelete'))) {
      return;
    }

    setDeleting(expenseId);
    try {
      const response = await fetch('/api/sheets/hotel-expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expenseId })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchExpenses();
      } else {
        alert(t('failedToDeleteHotelExpense') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting hotel expense:', error);
      alert(t('errorDeletingHotelExpense'));
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('hotelExpensesTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('trackHotelStays')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={fetchExpenses} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addHotelStay')}
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('totalSpent')}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(analytics.total)}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('hotelStays')}</p>
                    <p className="text-2xl font-bold text-primary">{analytics.count}</p>
                  </div>
                  <Bed className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('totalNights')}</p>
                    <p className="text-2xl font-bold text-primary">{analytics.totalNights}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('averageCost')}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(analytics.averageExpense)}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="palette-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">{t('cities')}</p>
                    <p className="text-2xl font-bold text-primary">{Object.keys(analytics.cityTotals).length}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-red-600" />
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
                <label className="block text-sm font-medium text-black mb-1">{t('startDate')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-black"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('endDate')}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-black"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('hotel')}</label>
                <Input
                  placeholder={t('filterByHotelName')}
                  value={hotelFilter}
                  onChange={(e) => setHotelFilter(e.target.value)}
                  className="text-black"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Hotel Stay Form */}
        {showAddForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{t('addHotelStay')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('hotelName')}</label>
                  <Input
                    placeholder={t('hotelName')}
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('city')}</label>
                  <Input
                    placeholder={t('city')}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('roomType')}</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black bg-white"
                  >
                    {roomTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('nights')}</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={nights}
                    onChange={(e) => setNights(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('totalAmountOmr')}</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('notesOptional')}</label>
                  <Input
                    placeholder={t('additionalNotes')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t('receiptOptional')}</label>
                  <Input
                    placeholder={t('receiptNumber')}
                    value={receipt}
                    onChange={(e) => setReceipt(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addExpense} disabled={!hotelName || !amount || !city || !nights || adding}>
                  {adding ? t('adding') : t('addHotelStayButton')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hotel Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black">{t('hotelStays')}</CardTitle>
            <CardDescription>{t('accommodationExpenses')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-black">{t('loadingHotelExpenses')}</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-black">{t('noHotelExpensesFound')}</p>
                <p className="text-gray-600 text-sm">{t('addFirstHotelStay')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div key={expense.id} className="p-4 border border-border rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-black">{expense.hotelName}</span>
                          <span className="px-2 py-1 bg-secondary text-black text-xs rounded-full">
                            {expense.roomType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {expense.city}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {expense.nights} {expense.nights === 1 ? t('night') : t('nights')}
                          </span>
                          {expense.date && <span>{new Date(expense.date).toLocaleDateString()}</span>}
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-gray-600 mb-2">{expense.notes}</p>
                        )}
                        {expense.receipt && (
                          <div className="text-sm text-gray-600">
                            Receipt: {expense.receipt}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(expense.amount)}
                        </span>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(expense.amount / expense.nights)}{t('perNight')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}