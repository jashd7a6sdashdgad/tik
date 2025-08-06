// Background service worker for Personal Assistant Chrome Extension

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const ASSISTANT_URL = 'http://localhost:3000';

// Install and setup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Personal Assistant Extension installed');
  
  // Create context menu items
  createContextMenus();
  
  // Initialize storage
  initializeStorage();
});

// Create context menu items
function createContextMenus() {
  // Quick expense entry
  chrome.contextMenus.create({
    id: 'quick-expense',
    title: 'Add as Expense',
    contexts: ['selection', 'page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // Meeting notes capture
  chrome.contextMenus.create({
    id: 'capture-notes',
    title: 'Capture Meeting Notes',
    contexts: ['page'],
    documentUrlPatterns: ['*://meet.google.com/*', '*://zoom.us/*', '*://teams.microsoft.com/*', '*://*.webex.com/*', 'http://*/*', 'https://*/*']
  });

  // Smart bookmark
  chrome.contextMenus.create({
    id: 'smart-bookmark',
    title: 'Smart Bookmark',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // Separator
  chrome.contextMenus.create({
    id: 'separator1',
    type: 'separator',
    contexts: ['page']
  });

  // Open dashboard
  chrome.contextMenus.create({
    id: 'open-dashboard',
    title: 'Open Personal Assistant',
    contexts: ['page']
  });
}

// Initialize storage with default settings
async function initializeStorage() {
  const defaults = {
    settings: {
      apiUrl: API_BASE_URL,
      autoSync: true,
      notifications: true,
      defaultCategory: 'miscellaneous',
      autoDetectMeetings: true,
      smartCategories: true
    },
    auth: {
      token: null,
      userId: null,
      lastSync: null
    },
    cache: {
      categories: [],
      recentExpenses: [],
      bookmarkCategories: []
    }
  };

  const stored = await chrome.storage.local.get(['settings', 'auth', 'cache']);
  
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: defaults.settings });
  }
  if (!stored.auth) {
    await chrome.storage.local.set({ auth: defaults.auth });
  }
  if (!stored.cache) {
    await chrome.storage.local.set({ cache: defaults.cache });
  }
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);

  switch (info.menuItemId) {
    case 'quick-expense':
      await handleQuickExpense(info, tab);
      break;
    case 'capture-notes':
      await handleCaptureNotes(info, tab);
      break;
    case 'smart-bookmark':
      await handleSmartBookmark(info, tab);
      break;
    case 'open-dashboard':
      chrome.tabs.create({ url: ASSISTANT_URL });
      break;
  }
});

// Handle quick expense entry
async function handleQuickExpense(info, tab) {
  const selectedText = info.selectionText || '';
  const url = tab.url;
  const title = tab.title;

  // Extract potential expense data from selected text or page
  const expenseData = await extractExpenseData(selectedText, url, title);

  // Send to content script to show expense form
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'showExpenseForm',
      data: expenseData
    });
  } catch (error) {
    console.error('Error showing expense form:', error);
    // Fallback: open popup
    chrome.action.openPopup();
  }
}

// Handle meeting notes capture
async function handleCaptureNotes(info, tab) {
  const url = tab.url;
  const title = tab.title;
  
  // Detect meeting platform
  const meetingPlatform = detectMeetingPlatform(url);
  
  // Get page content for notes extraction
  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractMeetingContent'
    });

    const notesData = {
      title: title,
      url: url,
      platform: meetingPlatform,
      content: result.content || '',
      timestamp: new Date().toISOString(),
      participants: result.participants || [],
      duration: result.duration || null
    };

    // Show notes capture form
    await chrome.tabs.sendMessage(tab.id, {
      action: 'showNotesForm',
      data: notesData
    });
  } catch (error) {
    console.error('Error capturing notes:', error);
    // Fallback: open popup with basic info
    chrome.action.openPopup();
  }
}

// Handle smart bookmarking
async function handleSmartBookmark(info, tab) {
  const url = tab.url;
  const title = tab.title;

  try {
    // Get page content for AI categorization
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractPageContent'
    });

    const bookmarkData = {
      title: title,
      url: url,
      content: result.content || '',
      description: result.description || '',
      keywords: result.keywords || [],
      timestamp: new Date().toISOString()
    };

    // Categorize with AI
    const category = await categorizeBookmark(bookmarkData);
    bookmarkData.suggestedCategory = category;

    // Show bookmark form
    await chrome.tabs.sendMessage(tab.id, {
      action: 'showBookmarkForm',
      data: bookmarkData
    });
  } catch (error) {
    console.error('Error creating smart bookmark:', error);
    chrome.action.openPopup();
  }
}

// Extract expense data from text/page
async function extractExpenseData(selectedText, url, title) {
  const expenseData = {
    description: '',
    amount: null,
    category: 'miscellaneous',
    source: url,
    sourceTitle: title
  };

  if (selectedText) {
    // Try to extract amount from selected text
    const amountMatch = selectedText.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      expenseData.amount = parseFloat(amountMatch[1]);
    }

    // Try to determine category from text
    expenseData.category = categorizePurchase(selectedText, url);
    expenseData.description = selectedText.length > 100 ? 
      selectedText.substring(0, 100) + '...' : selectedText;
  } else {
    // Extract from page title/URL
    expenseData.description = title;
    expenseData.category = categorizePurchase(title, url);
  }

  return expenseData;
}

// Categorize purchase based on text and URL
function categorizePurchase(text, url) {
  const categories = {
    'food': ['restaurant', 'food', 'pizza', 'coffee', 'dining', 'uber eats', 'doordash', 'grubhub'],
    'shopping': ['amazon', 'ebay', 'store', 'shop', 'buy', 'purchase', 'clothing', 'electronics'],
    'transport': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus'],
    'entertainment': ['movie', 'theater', 'netflix', 'spotify', 'game', 'concert', 'ticket'],
    'utilities': ['electric', 'water', 'internet', 'phone', 'cable', 'utility'],
    'health': ['pharmacy', 'doctor', 'medical', 'health', 'hospital', 'clinic'],
    'travel': ['hotel', 'flight', 'booking', 'airbnb', 'travel', 'vacation']
  };

  const textLower = (text + ' ' + url).toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'miscellaneous';
}

// Detect meeting platform from URL
function detectMeetingPlatform(url) {
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
  if (url.includes('webex.com')) return 'Cisco Webex';
  if (url.includes('gotomeeting.com')) return 'GoToMeeting';
  return 'Unknown';
}

// AI-powered bookmark categorization
async function categorizeBookmark(bookmarkData) {
  const { title, url, content, description, keywords } = bookmarkData;
  
  // Simple rule-based categorization (can be enhanced with AI API)
  const categories = {
    'work': ['github', 'stackoverflow', 'linkedin', 'work', 'business', 'professional', 'code', 'development'],
    'learning': ['tutorial', 'course', 'education', 'learn', 'documentation', 'guide', 'how-to'],
    'news': ['news', 'article', 'blog', 'medium', 'techcrunch', 'reuters', 'bbc'],
    'shopping': ['amazon', 'ebay', 'shop', 'store', 'buy', 'product', 'review'],
    'entertainment': ['youtube', 'netflix', 'movie', 'music', 'game', 'social', 'reddit'],
    'finance': ['bank', 'finance', 'money', 'investment', 'trading', 'crypto', 'stock'],
    'health': ['health', 'medical', 'fitness', 'nutrition', 'exercise', 'wellness'],
    'travel': ['travel', 'hotel', 'flight', 'booking', 'vacation', 'tourism']
  };

  const textToAnalyze = (title + ' ' + url + ' ' + description + ' ' + keywords.join(' ')).toLowerCase();
  
  for (const [category, categoryKeywords] of Object.entries(categories)) {
    const matches = categoryKeywords.filter(keyword => textToAnalyze.includes(keyword));
    if (matches.length > 0) {
      return category;
    }
  }
  
  return 'miscellaneous';
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command triggered:', command);
  
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  switch (command) {
    case 'quick-expense':
      await handleQuickExpense({ selectionText: '' }, activeTab);
      break;
    case 'capture-notes':
      await handleCaptureNotes({}, activeTab);
      break;
    case 'smart-bookmark':
      await handleSmartBookmark({}, activeTab);
      break;
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.action) {
    case 'saveExpense':
      handleSaveExpense(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response

    case 'saveNotes':
      handleSaveNotes(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'saveBookmark':
      handleSaveBookmark(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getSettings':
      chrome.storage.local.get(['settings'])
        .then(result => sendResponse({ success: true, data: result.settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'updateSettings':
      chrome.storage.local.set({ settings: message.data })
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Save expense to Personal Assistant
async function handleSaveExpense(expenseData) {
  try {
    const { auth, settings } = await chrome.storage.local.get(['auth', 'settings']);
    
    if (!auth.token) {
      throw new Error('Not authenticated. Please login to your Personal Assistant account.');
    }

    const response = await fetch(`${settings.apiUrl}/sheets/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        description: expenseData.description,
        debitAmount: expenseData.amount,
        category: expenseData.category,
        date: new Date().toISOString().split('T')[0],
        from: expenseData.source || 'Browser Extension',
        tags: expenseData.tags || []
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save expense: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Expense Saved',
      message: `${expenseData.description} - $${expenseData.amount}`
    });

    return result;
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
}

// Save notes to Personal Assistant
async function handleSaveNotes(notesData) {
  try {
    const { auth, settings } = await chrome.storage.local.get(['auth', 'settings']);
    
    if (!auth.token) {
      throw new Error('Not authenticated. Please login to your Personal Assistant account.');
    }

    const response = await fetch(`${settings.apiUrl}/sheets/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        title: notesData.title,
        content: notesData.content,
        date: new Date().toISOString().split('T')[0],
        category: 'meeting-notes',
        tags: ['meeting', notesData.platform?.toLowerCase()].filter(Boolean),
        metadata: {
          url: notesData.url,
          platform: notesData.platform,
          participants: notesData.participants,
          duration: notesData.duration
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save notes: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Meeting Notes Saved',
      message: `Notes captured for: ${notesData.title}`
    });

    return result;
  } catch (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
}

// Save bookmark to Personal Assistant
async function handleSaveBookmark(bookmarkData) {
  try {
    const { auth, settings } = await chrome.storage.local.get(['auth', 'settings']);
    
    if (!auth.token) {
      throw new Error('Not authenticated. Please login to your Personal Assistant account.');
    }

    // For now, we'll save bookmarks as diary entries with a special category
    // In the future, this could be a dedicated bookmarks API endpoint
    const response = await fetch(`${settings.apiUrl}/sheets/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        title: bookmarkData.title,
        content: `Bookmark: ${bookmarkData.url}\n\nDescription: ${bookmarkData.description}\n\nKeywords: ${bookmarkData.keywords.join(', ')}`,
        date: new Date().toISOString().split('T')[0],
        category: bookmarkData.category || 'bookmark',
        tags: ['bookmark', bookmarkData.suggestedCategory, ...bookmarkData.keywords].filter(Boolean),
        metadata: {
          url: bookmarkData.url,
          type: 'bookmark',
          category: bookmarkData.category,
          keywords: bookmarkData.keywords
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save bookmark: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Smart Bookmark Saved',
      message: `${bookmarkData.title} categorized as ${bookmarkData.suggestedCategory}`
    });

    return result;
  } catch (error) {
    console.error('Error saving bookmark:', error);
    throw error;
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup, but we can add additional logic here if needed
  console.log('Extension icon clicked');
});