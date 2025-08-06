// Personal Assistant Extension Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Initialize popup
  await initializePopup();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load current page info
  await loadPageInfo();
  
  // Check authentication status
  await checkAuthStatus();
});

// Initialize popup with current tab info and settings
async function initializePopup() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      // Update page info
      document.getElementById('pageTitle').textContent = tab.title || 'Untitled';
      document.getElementById('pageUrl').textContent = tab.url || '';
      
      // Analyze page
      analyzeCurrentPage(tab);
    }
    
    // Load settings
    const settings = await getSettings();
    if (settings) {
      console.log('Settings loaded:', settings);
    }
    
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Quick action buttons
  document.getElementById('quickExpenseBtn').addEventListener('click', handleQuickExpense);
  document.getElementById('captureNotesBtn').addEventListener('click', handleCaptureNotes);
  document.getElementById('smartBookmarkBtn').addEventListener('click', handleSmartBookmark);
  
  // Settings and dashboard
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('openDashboardBtn').addEventListener('click', openDashboard);
  
  // Login link
  document.getElementById('loginLink').addEventListener('click', handleLogin);
}

// Handle quick expense action
async function handleQuickExpense() {
  try {
    showLoading('Creating expense form...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'quickExpense',
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Error handling quick expense:', error);
    showError('Failed to create expense form');
  } finally {
    hideLoading();
  }
}

// Handle capture notes action
async function handleCaptureNotes() {
  try {
    showLoading('Preparing notes capture...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'captureNotes',
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Error handling capture notes:', error);
    showError('Failed to capture notes');
  } finally {
    hideLoading();
  }
}

// Handle smart bookmark action
async function handleSmartBookmark() {
  try {
    showLoading('Analyzing page for bookmarking...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'smartBookmark',
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Error handling smart bookmark:', error);
    showError('Failed to create bookmark');
  } finally {
    hideLoading();
  }
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

// Open dashboard
function openDashboard() {
  chrome.tabs.create({ url: 'http://localhost:3000' });
  window.close();
}

// Handle login
function handleLogin() {
  chrome.tabs.create({ url: 'http://localhost:3000/auth/login' });
  window.close();
}

// Load current page information
async function loadPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) return;
    
    // Update page details
    document.getElementById('pageTitle').textContent = tab.title || 'Untitled';
    document.getElementById('pageUrl').textContent = tab.url || '';
    
    // Analyze page content
    await analyzeCurrentPage(tab);
    
  } catch (error) {
    console.error('Error loading page info:', error);
  }
}

// Analyze current page
async function analyzeCurrentPage(tab) {
  try {
    const url = tab.url;
    const title = tab.title;
    
    // Detect page type
    const pageType = detectPageType(url, title);
    document.getElementById('pageType').textContent = pageType;
    
    // Check expense potential
    const expensePotential = checkExpensePotential(url, title);
    const expensePotentialEl = document.getElementById('expensePotential');
    expensePotentialEl.textContent = expensePotential.label;
    expensePotentialEl.className = `analysis-value ${expensePotential.class}`;
    
    // Check meeting platform
    const meetingPlatform = detectMeetingPlatform(url);
    document.getElementById('meetingPlatform').textContent = meetingPlatform || 'None';
    
    // Highlight relevant actions based on analysis
    highlightRelevantActions(pageType, expensePotential.potential, meetingPlatform);
    
  } catch (error) {
    console.error('Error analyzing page:', error);
  }
}

// Detect page type
function detectPageType(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // E-commerce and shopping
  if (urlLower.includes('amazon.com') || urlLower.includes('ebay.com') || 
      urlLower.includes('shop') || urlLower.includes('store') ||
      titleLower.includes('buy') || titleLower.includes('purchase')) {
    return 'Shopping';
  }
  
  // Meeting platforms
  if (urlLower.includes('meet.google.com') || urlLower.includes('zoom.us') ||
      urlLower.includes('teams.microsoft.com') || urlLower.includes('webex.com')) {
    return 'Meeting';
  }
  
  // Food delivery
  if (urlLower.includes('ubereats') || urlLower.includes('doordash') ||
      urlLower.includes('grubhub') || urlLower.includes('delivery')) {
    return 'Food Delivery';
  }
  
  // Financial
  if (urlLower.includes('bank') || urlLower.includes('paypal') ||
      urlLower.includes('stripe') || urlLower.includes('payment')) {
    return 'Financial';
  }
  
  // Travel
  if (urlLower.includes('booking.com') || urlLower.includes('airbnb') ||
      urlLower.includes('expedia') || urlLower.includes('hotel')) {
    return 'Travel';
  }
  
  // News and articles
  if (urlLower.includes('news') || urlLower.includes('article') ||
      urlLower.includes('blog') || urlLower.includes('medium.com')) {
    return 'Article/News';
  }
  
  // Documentation and learning
  if (urlLower.includes('docs') || urlLower.includes('tutorial') ||
      urlLower.includes('github.com') || urlLower.includes('stackoverflow')) {
    return 'Documentation';
  }
  
  return 'General';
}

// Check expense potential
function checkExpensePotential(url, title) {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // High potential keywords
  const highPotentialKeywords = [
    'amazon', 'ebay', 'shop', 'store', 'buy', 'purchase', 'cart', 'checkout',
    'ubereats', 'doordash', 'grubhub', 'delivery', 'restaurant', 'food',
    'booking', 'hotel', 'flight', 'travel', 'uber', 'lyft', 'taxi'
  ];
  
  // Medium potential keywords
  const mediumPotentialKeywords = [
    'payment', 'paypal', 'stripe', 'bill', 'invoice', 'subscription',
    'netflix', 'spotify', 'utility', 'service'
  ];
  
  const text = urlLower + ' ' + titleLower;
  
  if (highPotentialKeywords.some(keyword => text.includes(keyword))) {
    return { potential: 'high', label: 'High', class: 'high-potential' };
  }
  
  if (mediumPotentialKeywords.some(keyword => text.includes(keyword))) {
    return { potential: 'medium', label: 'Medium', class: 'medium-potential' };
  }
  
  return { potential: 'low', label: 'Low', class: 'low-potential' };
}

// Detect meeting platform
function detectMeetingPlatform(url) {
  if (url.includes('meet.google.com')) return '🟢 Google Meet';
  if (url.includes('zoom.us')) return '🔵 Zoom';
  if (url.includes('teams.microsoft.com')) return '🟣 Microsoft Teams';
  if (url.includes('webex.com')) return '⚪ Cisco Webex';
  if (url.includes('gotomeeting.com')) return '🟠 GoToMeeting';
  return null;
}

// Highlight relevant actions
function highlightRelevantActions(pageType, expensePotential, meetingPlatform) {
  // Reset all highlights
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.classList.remove('highlighted');
  });
  
  // Highlight expense button for shopping/financial pages
  if (expensePotential === 'high' || pageType === 'Shopping' || pageType === 'Food Delivery') {
    document.getElementById('quickExpenseBtn').classList.add('highlighted');
  }
  
  // Highlight notes button for meeting platforms
  if (meetingPlatform || pageType === 'Meeting') {
    document.getElementById('captureNotesBtn').classList.add('highlighted');
  }
  
  // Highlight bookmark button for documentation/articles
  if (pageType === 'Documentation' || pageType === 'Article/News') {
    document.getElementById('smartBookmarkBtn').classList.add('highlighted');
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    // Show loading
    showAuthStatus('loading');
    
    // Get auth info from storage
    const result = await chrome.storage.local.get(['auth']);
    const auth = result.auth;
    
    if (auth && auth.token) {
      // Verify token with API
      const response = await fetch('http://localhost:3000/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (response.ok) {
        showAuthStatus('success');
        await loadQuickStats();
      } else {
        showAuthStatus('error');
      }
    } else {
      showAuthStatus('error');
    }
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    showAuthStatus('error');
  }
}

// Show authentication status
function showAuthStatus(status) {
  const elements = {
    loading: document.getElementById('authLoading'),
    success: document.getElementById('authSuccess'),
    error: document.getElementById('authError')
  };
  
  // Hide all
  Object.values(elements).forEach(el => el.classList.add('hidden'));
  
  // Show relevant status
  if (elements[status]) {
    elements[status].classList.remove('hidden');
  }
}

// Load quick stats
async function loadQuickStats() {
  try {
    const result = await chrome.storage.local.get(['auth']);
    const auth = result.auth;
    
    if (!auth || !auth.token) return;
    
    // Get today's stats (mock data for now)
    const today = new Date().toISOString().split('T')[0];
    
    // This would normally come from the API
    const stats = {
      expenses: Math.floor(Math.random() * 10),
      notes: Math.floor(Math.random() * 5),
      bookmarks: Math.floor(Math.random() * 8)
    };
    
    // Update UI
    document.getElementById('expenseCount').textContent = stats.expenses;
    document.getElementById('notesCount').textContent = stats.notes;
    document.getElementById('bookmarkCount').textContent = stats.bookmarks;
    
    // Show stats section
    document.getElementById('quickStats').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading quick stats:', error);
  }
}

// Get settings from storage
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
}

// Show loading overlay
function showLoading(message) {
  const overlay = document.getElementById('loadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  
  messageEl.textContent = message;
  overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// Show error message
function showError(message) {
  console.error('Popup error:', message);
  // Could implement a toast notification here
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message);
  
  switch (message.action) {
    case 'updateStats':
      loadQuickStats();
      break;
    case 'authChanged':
      checkAuthStatus();
      break;
  }
  
  sendResponse({ success: true });
});