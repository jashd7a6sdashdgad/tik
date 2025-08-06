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

  // Load expenses (online + offline)
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let allExpenses: SyncedExpense[] = [];
      
      if (isOnline) {
        // Try to fetch from API first
        try {
          const response = await fetch('/api/sheets/expenses');
          const data = await response.json();
          
          if (data.success && data.data.expenses) {
            const apiExpenses: SyncedExpense[] = data.data.expenses.map((exp: any) => ({
              ...exp,
              lastModified: Date.now(),
              synced: true
            }));
            
            // Store in offline cache for later
            await Promise.all(
              apiExpenses.map(exp => storeOffline(exp))
            );
            
            allExpenses = apiExpenses;
          }
        } catch (apiError) {
          console.warn('API fetch failed, using offline data:', apiError);
        }
      }
      
      // Always include offline data
      const offlineExpenses = await getAllOffline();
      
      // Merge online and offline data, preferring newer versions
      const mergedExpenses = new Map<string, SyncedExpense>();
      
      // Add API expenses first
      allExpenses.forEach(expense => {
        mergedExpenses.set(expense.id, expense);
      });
      
      // Add offline expenses, preferring local changes
      offlineExpenses.forEach(expense => {
        const existing = mergedExpenses.get(expense.id);
        if (!existing || expense.lastModified > existing.lastModified) {
          mergedExpenses.set(expense.id, expense);
        }
      });
      
      const sortedExpenses = Array.from(mergedExpenses.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setExpenses(sortedExpenses);
      
      // Sync pending changes if online
      if (isOnline) {
        await syncPending();
      }
      
    } catch (error) {
      console.error('Error loading expenses:', error);
      setError('Failed to load expenses');
      
      // Fallback to offline data only
      const offlineExpenses = await getAllOffline();
      setExpenses(offlineExpenses);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getAllOffline, storeOffline, syncPending]);

  // Add new expense
  const addExpense = useCallback(async (expenseData: Omit<SyncedExpense, 'id' | 'lastModified' | 'synced'>) => {
    const newExpense: SyncedExpense = {
      ...expenseData,
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastModified: Date.now(),
      synced: false
    };

    try {
      // Store offline immediately
      await storeOffline(newExpense);
      
      // Add to local state
      setExpenses(prev => [newExpense, ...prev]);
      
      // Sync to other devices
      sync({
        type: 'expense',
        action: 'create',
        data: newExpense
      });
      
      // Try to sync to API if online
      if (isOnline) {
        try {
          const response = await fetch('/api/sheets/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense)
          });
          
          if (response.ok) {
            // Mark as synced
            const syncedExpense = { ...newExpense, synced: true };
            await storeOffline(syncedExpense);
            
            setExpenses(prev => 
              prev.map(exp => exp.id === newExpense.id ? syncedExpense : exp)
            );
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

  // Update expense
  const updateExpense = useCallback(async (id: string, updates: Partial<SyncedExpense>) => {
    const existingExpense = expenses.find(exp => exp.id === id);
    if (!existingExpense) {
      throw new Error('Expense not found');
    }

    const updatedExpense: SyncedExpense = {
      ...existingExpense,
      ...updates,
      id,
      lastModified: Date.now(),
      synced: false
    };

    try {
      // Store offline immediately
      await storeOffline(updatedExpense);
      
      // Update local state
      setExpenses(prev => 
        prev.map(exp => exp.id === id ? updatedExpense : exp)
      );
      
      // Sync to other devices
      sync({
        type: 'expense',
        action: 'update',
        data: updatedExpense
      });
      
      // Try to sync to API if online
      if (isOnline) {
        try {
          const response = await fetch('/api/sheets/expenses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedExpense)
          });
          
          if (response.ok) {
            // Mark as synced
            const syncedExpense = { ...updatedExpense, synced: true };
            await storeOffline(syncedExpense);
            
            setExpenses(prev => 
              prev.map(exp => exp.id === id ? syncedExpense : exp)
            );
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

  // Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    try {
      // Remove from offline storage
      await removeOffline(id);
      
      // Remove from local state
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      
      // Sync deletion to other devices
      sync({
        type: 'expense',
        action: 'delete',
        data: { id }
      });
      
      // Try to delete from API if online
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

  // Load expenses on mount and when online status changes
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus.pendingSync > 0) {
      console.log('🔄 Auto-syncing pending changes...');
      syncPending().then(() => {
        loadExpenses(); // Reload to reflect synced changes
      });
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