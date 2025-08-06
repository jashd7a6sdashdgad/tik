'use client';

import { useEffect, useCallback } from 'react';
import { SearchDocument, searchIndex } from '@/lib/search/searchIndex';

interface UseGlobalSearchOptions {
  enableAutoIndex?: boolean;
  indexInterval?: number; // in milliseconds
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const { enableAutoIndex = true, indexInterval = 30000 } = options;

  // Index data from various sources
  const indexData = useCallback(async () => {
    console.log('🔍 Starting global data indexing...');
    
    try {
      // Index expenses
      await indexExpenses();
      
      // Index contacts
      await indexContacts();
      
      // Index diary entries
      await indexDiaryEntries();
      
      // Index calendar events
      await indexCalendarEvents();
      
      // Index shopping lists
      await indexShoppingLists();
      
      // Index photos (metadata)
      await indexPhotos();
      
      // Index emails
      await indexEmails();
      
      console.log('✅ Global data indexing completed');
    } catch (error) {
      console.error('❌ Error during global indexing:', error);
    }
  }, []);

  // Index expenses
  const indexExpenses = async () => {
    try {
      const response = await fetch('/api/sheets/expenses');
      const data = await response.json();
      
      if (data.success && data.data.expenses) {
        data.data.expenses.forEach((expense: any) => {
          const doc: SearchDocument = {
            id: `expense_${expense.id}`,
            type: 'expense',
            title: `${expense.description} - ${expense.debitAmount ? expense.debitAmount : expense.creditAmount} OMR`,
            content: `${expense.description} ${expense.from} ${expense.category}`,
            metadata: {
              ...expense,
              debitAmount: expense.debitAmount || 0,
              creditAmount: expense.creditAmount || 0
            },
            timestamp: new Date(expense.date).getTime(),
            tags: [
              expense.category?.toLowerCase(),
              expense.from?.toLowerCase(),
              expense.debitAmount ? 'debit' : 'credit',
              ...(expense.tags || [])
            ].filter(Boolean),
            searchable: `${expense.description} ${expense.from} ${expense.category} ${expense.debitAmount || expense.creditAmount} OMR`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index expenses:', error);
    }
  };

  // Index contacts
  const indexContacts = async () => {
    try {
      const response = await fetch('/api/sheets/contacts');
      const data = await response.json();
      
      if (data.success && data.data.contacts) {
        data.data.contacts.forEach((contact: any) => {
          const doc: SearchDocument = {
            id: `contact_${contact.id}`,
            type: 'contact',
            title: contact.name,
            content: `${contact.name} ${contact.email || ''} ${contact.phone || ''} ${contact.company || ''} ${contact.notes || ''}`,
            metadata: contact,
            timestamp: new Date(contact.createdAt || Date.now()).getTime(),
            tags: [
              contact.company?.toLowerCase(),
              contact.category?.toLowerCase(),
              contact.email ? 'email' : null,
              contact.phone ? 'phone' : null,
              contact.isVIP ? 'vip' : null,
              ...(contact.tags || [])
            ].filter(Boolean),
            searchable: `${contact.name} ${contact.email || ''} ${contact.phone || ''} ${contact.company || ''} ${contact.notes || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index contacts:', error);
    }
  };

  // Index diary entries
  const indexDiaryEntries = async () => {
    try {
      const response = await fetch('/api/sheets/diary');
      const data = await response.json();
      
      if (data.success && data.data.entries) {
        data.data.entries.forEach((entry: any) => {
          const doc: SearchDocument = {
            id: `diary_${entry.id}`,
            type: 'diary',
            title: entry.title || `Diary Entry - ${new Date(entry.date).toLocaleDateString()}`,
            content: entry.content,
            metadata: entry,
            timestamp: new Date(entry.date).getTime(),
            tags: [
              entry.mood?.toLowerCase(),
              entry.category?.toLowerCase(),
              entry.isPrivate ? 'private' : 'public',
              ...(entry.tags || [])
            ].filter(Boolean),
            searchable: `${entry.title || ''} ${entry.content} ${entry.mood || ''} ${entry.category || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index diary entries:', error);
    }
  };

  // Index calendar events
  const indexCalendarEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events');
      const data = await response.json();
      
      if (data.success && data.events) {
        data.events.forEach((event: any) => {
          const doc: SearchDocument = {
            id: `calendar_${event.id}`,
            type: 'calendar',
            title: event.summary || event.title,
            content: `${event.summary || event.title} ${event.description || ''} ${event.location || ''}`,
            metadata: event,
            timestamp: new Date(event.start?.dateTime || event.start?.date || Date.now()).getTime(),
            tags: [
              event.attendees?.length > 0 ? 'meeting' : 'event',
              event.location ? 'location' : null,
              event.recurringEventId ? 'recurring' : null,
              ...(event.tags || [])
            ].filter(Boolean),
            searchable: `${event.summary || event.title} ${event.description || ''} ${event.location || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index calendar events:', error);
    }
  };

  // Index shopping lists
  const indexShoppingLists = async () => {
    try {
      const response = await fetch('/api/sheets/shopping-list');
      const data = await response.json();
      
      if (data.success && data.data.items) {
        data.data.items.forEach((item: any) => {
          const doc: SearchDocument = {
            id: `shopping_${item.id}`,
            type: 'shopping-list',
            title: item.name,
            content: `${item.name} ${item.category || ''} ${item.notes || ''}`,
            metadata: item,
            timestamp: new Date(item.createdAt || Date.now()).getTime(),
            tags: [
              item.category?.toLowerCase(),
              item.isCompleted ? 'completed' : 'pending',
              item.isUrgent ? 'urgent' : null,
              ...(item.tags || [])
            ].filter(Boolean),
            searchable: `${item.name} ${item.category || ''} ${item.notes || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index shopping list:', error);
    }
  };

  // Index photos (metadata only)
  const indexPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      const data = await response.json();
      
      if (data.success && data.photos) {
        data.photos.forEach((photo: any) => {
          const doc: SearchDocument = {
            id: `photo_${photo.id}`,
            type: 'photo',
            title: photo.name || photo.filename,
            content: `${photo.name || photo.filename} ${photo.description || ''} ${photo.location || ''}`,
            metadata: photo,
            timestamp: new Date(photo.createdTime || photo.modifiedTime || Date.now()).getTime(),
            tags: [
              photo.mimeType?.includes('image') ? 'image' : 'file',
              photo.location ? 'location' : null,
              photo.shared ? 'shared' : 'private',
              ...(photo.tags || [])
            ].filter(Boolean),
            searchable: `${photo.name || photo.filename} ${photo.description || ''} ${photo.location || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index photos:', error);
    }
  };

  // Index emails
  const indexEmails = async () => {
    try {
      const response = await fetch('/api/gmail/messages');
      const data = await response.json();
      
      if (data.success && data.messages) {
        data.messages.forEach((email: any) => {
          const doc: SearchDocument = {
            id: `email_${email.id}`,
            type: 'email',
            title: email.subject || 'No Subject',
            content: `${email.subject || ''} ${email.snippet || ''} ${email.from || ''} ${email.to || ''}`,
            metadata: email,
            timestamp: new Date(email.date || Date.now()).getTime(),
            tags: [
              email.isUnread ? 'unread' : 'read',
              email.isImportant ? 'important' : null,
              email.hasAttachments ? 'attachments' : null,
              email.labels?.includes('INBOX') ? 'inbox' : null,
              email.labels?.includes('SENT') ? 'sent' : null,
              ...(email.labels || []).map((label: string) => label.toLowerCase())
            ].filter(Boolean),
            searchable: `${email.subject || ''} ${email.snippet || ''} ${email.from || ''} ${email.to || ''}`
          };
          
          searchIndex.addDocument(doc);
        });
      }
    } catch (error) {
      console.warn('Failed to index emails:', error);
    }
  };

  // Remove document from index
  const removeFromIndex = useCallback((type: string, id: string) => {
    const documentId = `${type}_${id}`;
    searchIndex.removeDocument(documentId);
  }, []);

  // Update document in index
  const updateInIndex = useCallback(async (type: string, id: string, data: any) => {
    // Remove old document
    removeFromIndex(type, id);
    
    // Add updated document
    let doc: SearchDocument | null = null;
    
    switch (type) {
      case 'expense':
        doc = {
          id: `expense_${id}`,
          type: 'expense',
          title: `${data.description} - ${data.debitAmount ? data.debitAmount : data.creditAmount} OMR`,
          content: `${data.description} ${data.from} ${data.category}`,
          metadata: data,
          timestamp: new Date(data.date).getTime(),
          tags: [data.category?.toLowerCase(), data.from?.toLowerCase()].filter(Boolean),
          searchable: `${data.description} ${data.from} ${data.category} ${data.debitAmount || data.creditAmount} OMR`
        };
        break;
        
      case 'contact':
        doc = {
          id: `contact_${id}`,
          type: 'contact',
          title: data.name,
          content: `${data.name} ${data.email || ''} ${data.phone || ''} ${data.company || ''}`,
          metadata: data,
          timestamp: new Date(data.createdAt || Date.now()).getTime(),
          tags: [data.company?.toLowerCase(), data.category?.toLowerCase()].filter(Boolean),
          searchable: `${data.name} ${data.email || ''} ${data.phone || ''} ${data.company || ''}`
        };
        break;
        
      // Add other types as needed
    }
    
    if (doc) {
      searchIndex.addDocument(doc);
    }
  }, [removeFromIndex]);

  // Get search statistics
  const getSearchStats = useCallback(() => {
    return searchIndex.getStats();
  }, []);

  // Clear all search data
  const clearSearchIndex = useCallback(() => {
    searchIndex.clear();
  }, []);

  // Auto-indexing effect
  useEffect(() => {
    if (enableAutoIndex) {
      // Initial indexing
      indexData();
      
      // Set up periodic re-indexing
      const interval = setInterval(indexData, indexInterval);
      
      return () => clearInterval(interval);
    }
  }, [enableAutoIndex, indexInterval, indexData]);

  return {
    indexData,
    removeFromIndex,
    updateInIndex,
    getSearchStats,
    clearSearchIndex,
    indexExpenses,
    indexContacts,
    indexDiaryEntries,
    indexCalendarEvents,
    indexShoppingLists,
    indexPhotos,
    indexEmails
  };
}