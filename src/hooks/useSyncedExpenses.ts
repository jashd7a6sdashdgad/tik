'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSync } from '@/lib/sync';
import { useOffline, OfflineCapableData } from '@/lib/offline';

export interface SyncedExpense extends OfflineCapableData {
  id: string;
  from: string;
  date: string;
  creditAmount: number;
  debitAmount: number;
  category: string;
  description: string;
  availableBalance?: number;
  receiptImage?: {
    fileName: string;
    fileSize: number;
    uploaded: boolean;
  };
  lastModified: number;
  synced: boolean;
}

type NewExpenseData = Omit<SyncedExpense, 'id' | 'lastModified' | 'synced'>;

export function useSyncedExpenses() {
  const { sync } = useSync();
  const { 
    isOnline, 
    syncStatus, 
    store: storeOffline, 
    getAll: getAllOffline, 
    remove: removeOffline,
    syncPending 
  } = useOffline<SyncedExpense>('expense');
  
  const [expenses, setExpenses] = useState<SyncedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let allExpenses: SyncedExpense[] = [];
      
      if (isOnline) {
        try {
          const response = await fetch('/api/sheets/expenses');
          const data = await response.json();
          
          if (data.success && data.data.expenses) {
            const apiExpenses: SyncedExpense[] = data.data.expenses.map((exp: any) => ({
              ...exp,
              lastModified: Date.now(),
              synced: true
            }));
            
            await Promise.all(apiExpenses.map(exp => storeOffline(exp)));
            
            allExpenses = apiExpenses;
          }
        } catch (apiError) {
          console.warn('API fetch failed, using offline data:', apiError);
        }
      }
      
      const offlineExpenses = await getAllOffline();
      const mergedExpenses = new Map<string, SyncedExpense>();
      
      allExpenses.forEach(expense => mergedExpenses.set(expense.id, expense));
      offlineExpenses.forEach(expense => {
        const existing = mergedExpenses.get(expense.id);
        if (!existing || expense.lastModified > existing.lastModified) {
          mergedExpenses.set(expense.id, expense);
        }
      });
      
      const sortedExpenses = Array.from(mergedExpenses.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setExpenses(sortedExpenses);
      
      if (isOnline) await syncPending();
      
    } catch (error) {
      console.error('Error loading expenses:', error);
      setError('Failed to load expenses');
      
      const offlineExpenses = await getAllOffline();
      setExpenses(offlineExpenses);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getAllOffline, storeOffline, syncPending]);

  const addExpense = useCallback(async (expenseData: NewExpenseData) => {
    const newExpense: SyncedExpense = {
      from: expenseData.from || 'unknown',
      date: expenseData.date || new Date().toISOString(),
      creditAmount: expenseData.creditAmount || 0,
      debitAmount: expenseData.debitAmount || 0,
      category: expenseData.category || 'uncategorized',
      description: expenseData.description || '',
      availableBalance: expenseData.availableBalance,
      receiptImage: expenseData.receiptImage,
      id: `expense_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      lastModified: Date.now(),
      synced: false
    };

    try {
      await storeOffline(newExpense);
      setExpenses(prev => [newExpense, ...prev]);
      sync({ type: 'expense', action: 'create', data: newExpense });
      
      if (isOnline) {
        try {
          const response = await fetch('/api/sheets/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense)
          });
          
          if (response.ok) {
            const syncedExpense = { ...newExpense, synced: true };
            await storeOffline(syncedExpense);
            setExpenses(prev => prev.map(exp => exp.id === newExpense.id ? syncedExpense : exp));
          }
        } catch (apiError) {
          console.warn('API sync failed, will retry when online:', apiError);
        }
      }
      
      return newExpense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }, [storeOffline, sync, isOnline]);

  const updateExpense = useCallback(async (id: string, updates: Partial<SyncedExpense>) => {
    const existingExpense = expenses.find(exp => exp.id === id);
    if (!existingExpense) throw new Error('Expense not found');

    const updatedExpense: SyncedExpense = {
      ...existingExpense,
      ...updates,
      id,
      lastModified: Date.now(),
      synced: false
    };

    try {
      await storeOffline(updatedExpense);
      setExpenses(prev => prev.map(exp => exp.id === id ? updatedExpense : exp));
      sync({ type: 'expense', action: 'update', data: updatedExpense });
      
      if (isOnline) {
        try {
          const response = await fetch('/api/sheets/expenses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedExpense)
          });
          
          if (response.ok) {
            const syncedExpense = { ...updatedExpense, synced: true };
            await storeOffline(syncedExpense);
            setExpenses(prev => prev.map(exp => exp.id === id ? syncedExpense : exp));
          }
        } catch (apiError) {
          console.warn('API sync failed, will retry when online:', apiError);
        }
      }
      
      return updatedExpense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }, [expenses, storeOffline, sync, isOnline]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await removeOffline(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      sync({ type: 'expense', action: 'delete', data: { id } });
      
      if (isOnline) {
        try {
          await fetch('/api/sheets/expenses', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
        } catch (apiError) {
          console.warn('API delete failed:', apiError);
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }, [removeOffline, sync, isOnline]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    if (isOnline && syncStatus.pendingSync > 0) {
      syncPending().then(() => loadExpenses());
    }
  }, [isOnline, syncStatus.pendingSync, syncPending, loadExpenses]);

  return {
    expenses,
    loading,
    error,
    isOnline,
    syncStatus,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses: loadExpenses
  };
}
