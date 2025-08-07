'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingItem } from '@/types';
import { 
  ShoppingCart, 
  Plus, 
  Check, 
  X,
  Mic,
  RefreshCw,
  DollarSign,
  Package
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

export default function ShoppingPage() {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('General');

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript, 
    isSupported 
  } = useVoiceInput();

  const categories = [
    'Groceries', 'Personal Care', 'Household', 'Electronics', 
    'Clothing', 'Books', 'Health', 'General'
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (transcript && !isListening) {
      parseVoiceItem(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sheets/shopping-list');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
      } else {
        console.error('Failed to fetch items:', data.message);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseVoiceItem = (voiceInput: string) => {
    const input = voiceInput.toLowerCase();
    
    // Try to parse "add milk to shopping list" or "buy 2 bottles of milk"
    const itemPattern = /(?:add|buy)\s+(?:(\d+)\s+)?(.+?)(?:\s+to\s+(?:shopping\s+)?list)?$/i;
    const match = input.match(itemPattern);
    
    if (match) {
      if (match[1]) {
        setQuantity(match[1]);
      }
      setName(match[2].trim());
      
      // Try to categorize automatically
      const itemName = match[2].toLowerCase();
      if (itemName.includes('milk') || itemName.includes('bread') || itemName.includes('egg') || 
          itemName.includes('cheese') || itemName.includes('meat') || itemName.includes('fruit')) {
        setCategory('Groceries');
      } else if (itemName.includes('soap') || itemName.includes('shampoo') || itemName.includes('toothpaste')) {
        setCategory('Personal Care');
      } else if (itemName.includes('clean') || itemName.includes('detergent') || itemName.includes('paper')) {
        setCategory('Household');
      }
      
      setShowAddForm(true);
    } else {
      setName(voiceInput);
      setShowAddForm(true);
    }
  };

  const addItem = async () => {
    if (!name) {
      alert(t('pleaseEnterItemName'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/sheets/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quantity: parseInt(quantity) || 1,
          price: price ? parseFloat(price) : 0,
          category
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchItems();
        setShowAddForm(false);
        setName('');
        setQuantity('1');
        setPrice('');
        setCategory('General');
      } else {
        alert(t('failedToAddItem') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert(t('errorAddingItem'));
    } finally {
      setAdding(false);
    }
  };

  const togglePurchased = async (item: ShoppingItem) => {
    try {
      const response = await fetch('/api/sheets/shopping-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          purchased: !item.purchased
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchItems();
      } else {
        alert(t('failedToUpdateItem') + ': ' + data.message);
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert(t('errorUpdatingItem'));
    }
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  };

  const getPendingItems = () => {
    return items.filter(item => !item.purchased);
  };

  const getPurchasedItems = () => {
    return items.filter(item => item.purchased);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Groceries': 'bg-green-100 text-green-800',
      'Personal Care': 'bg-blue-100 text-blue-800',
      'Household': 'bg-purple-100 text-purple-800',
      'Electronics': 'bg-orange-100 text-orange-800',
      'Clothing': 'bg-pink-100 text-pink-800',
      'Books': 'bg-yellow-100 text-yellow-800',
      'Health': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-black'
    };
    return colors[category as keyof typeof colors] || colors.General;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 mb-8 hover:shadow-3xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {t('shoppingTitle')}
                </h1>
                <p className="text-gray-600 font-medium mt-1">{t('manageShoppingItems')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('totalEstimate')}</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(getTotal())}</p>
              </div>
              <Button onClick={fetchItems} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addItem')}
              </Button>
            </div>
          </div>
        </div>

        {/* Voice Add Item */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('quickAddVoice')}</CardTitle>
            <CardDescription>{t('sayAddMilk')}</CardDescription>
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
                {isListening ? t('stopListening') : t('voiceAdd')}
              </Button>
              {transcript && (
                <p className="text-sm text-black italic">"{transcript}"</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Item Form */}
        {showAddForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle>{t('addNewItem')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('itemName')}</label>
                  <Input
                    placeholder={t('itemNamePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('quantity')}</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('priceOptional')}</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-black"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-black"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={addItem}
                  disabled={!name || adding}
                  loading={adding}
                >
                  {t('addItem')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('toBuy')} ({getPendingItems().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : getPendingItems().length > 0 ? (
                <div className="space-y-3">
                  {getPendingItems().map((item) => (
                    <div key={item.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-black">{item.name}</h4>
                            {item.category && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              Qty: {item.quantity}
                            </div>
                            {item.price && item.price > 0 && (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePurchased(item)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-black text-center py-8">{t('noItemsToBuy')}</p>
              )}
            </CardContent>
          </Card>

          {/* Purchased Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Check className="h-5 w-5 mr-2" />
                {t('purchased')} ({getPurchasedItems().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : getPurchasedItems().length > 0 ? (
                <div className="space-y-3">
                  {getPurchasedItems().map((item) => (
                    <div key={item.id} className="p-4 bg-muted rounded-lg opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-black line-through">{item.name}</h4>
                            {item.category && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              Qty: {item.quantity}
                            </div>
                            {item.price && item.price > 0 && (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePurchased(item)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-black text-center py-8">{t('noPurchasedItems')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}