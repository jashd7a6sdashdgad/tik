// Content script for Personal Assistant Chrome Extension
// Runs on all web pages to enable expense entry, notes capture, and bookmarking

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.personalAssistantExtension) {
    return;
  }
  window.personalAssistantExtension = true;

  console.log('Personal Assistant Extension content script loaded');

  // Global variables
  let currentModal = null;
  let isModalOpen = false;

  // Initialize content script
  init();

  function init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Add keyboard shortcuts listener
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Auto-detect meeting platforms
    if (isMeetingPlatform()) {
      setupMeetingDetection();
    }
  }

  // Handle messages from background script
  function handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);

    switch (message.action) {
      case 'showExpenseForm':
        showExpenseForm(message.data);
        sendResponse({ success: true });
        break;

      case 'showNotesForm':
        showNotesForm(message.data);
        sendResponse({ success: true });
        break;

      case 'showBookmarkForm':
        showBookmarkForm(message.data);
        sendResponse({ success: true });
        break;

      case 'extractMeetingContent':
        const meetingContent = extractMeetingContent();
        sendResponse(meetingContent);
        break;

      case 'extractPageContent':
        const pageContent = extractPageContent();
        sendResponse(pageContent);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // Keep message channel open for async response
  }

  // Handle keyboard shortcuts
  function handleKeyboardShortcuts(event) {
    // Check for our custom shortcuts
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      switch (event.key) {
        case 'E':
          event.preventDefault();
          chrome.runtime.sendMessage({ action: 'quickExpense' });
          break;
        case 'N':
          event.preventDefault();
          chrome.runtime.sendMessage({ action: 'captureNotes' });
          break;
        case 'B':
          event.preventDefault();
          chrome.runtime.sendMessage({ action: 'smartBookmark' });
          break;
      }
    }
  }

  // Show expense entry form
  function showExpenseForm(expenseData) {
    if (isModalOpen) {
      closeCurrentModal();
    }

    const modal = createModal('expense-form', 'Quick Expense Entry');
    
    const form = document.createElement('form');
    form.className = 'pa-form';
    form.innerHTML = `
      <div class="pa-form-group">
        <label for="expense-description">Description:</label>
        <input type="text" id="expense-description" value="${escapeHtml(expenseData.description || '')}" required>
      </div>
      
      <div class="pa-form-group">
        <label for="expense-amount">Amount ($):</label>
        <input type="number" id="expense-amount" step="0.01" value="${expenseData.amount || ''}" required>
      </div>
      
      <div class="pa-form-group">
        <label for="expense-category">Category:</label>
        <select id="expense-category">
          <option value="food" ${expenseData.category === 'food' ? 'selected' : ''}>Food & Dining</option>
          <option value="shopping" ${expenseData.category === 'shopping' ? 'selected' : ''}>Shopping</option>
          <option value="transport" ${expenseData.category === 'transport' ? 'selected' : ''}>Transportation</option>
          <option value="entertainment" ${expenseData.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
          <option value="utilities" ${expenseData.category === 'utilities' ? 'selected' : ''}>Utilities</option>
          <option value="health" ${expenseData.category === 'health' ? 'selected' : ''}>Health</option>
          <option value="travel" ${expenseData.category === 'travel' ? 'selected' : ''}>Travel</option>
          <option value="miscellaneous" ${expenseData.category === 'miscellaneous' ? 'selected' : ''}>Miscellaneous</option>
        </select>
      </div>
      
      <div class="pa-form-group">
        <label for="expense-tags">Tags (comma-separated):</label>
        <input type="text" id="expense-tags" placeholder="shopping, online, electronics">
      </div>
      
      <div class="pa-form-actions">
        <button type="button" class="pa-btn pa-btn-secondary" onclick="window.personalAssistantExtension.closeModal()">Cancel</button>
        <button type="submit" class="pa-btn pa-btn-primary">Save Expense</button>
      </div>
    `;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveExpense({
        description: document.getElementById('expense-description').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        category: document.getElementById('expense-category').value,
        tags: document.getElementById('expense-tags').value.split(',').map(t => t.trim()).filter(t => t),
        source: expenseData.source,
        sourceTitle: expenseData.sourceTitle
      });
    });

    modal.appendChild(form);
    document.body.appendChild(modal);
    currentModal = modal;
    isModalOpen = true;

    // Focus first input
    setTimeout(() => {
      document.getElementById('expense-description').focus();
    }, 100);
  }

  // Show meeting notes form
  function showNotesForm(notesData) {
    if (isModalOpen) {
      closeCurrentModal();
    }

    const modal = createModal('notes-form', 'Capture Meeting Notes');
    
    const form = document.createElement('form');
    form.className = 'pa-form';
    form.innerHTML = `
      <div class="pa-form-group">
        <label for="notes-title">Meeting Title:</label>
        <input type="text" id="notes-title" value="${escapeHtml(notesData.title || '')}" required>
      </div>
      
      <div class="pa-form-group">
        <label for="notes-platform">Platform:</label>
        <input type="text" id="notes-platform" value="${escapeHtml(notesData.platform || '')}" readonly>
      </div>
      
      <div class="pa-form-group">
        <label for="notes-participants">Participants (comma-separated):</label>
        <input type="text" id="notes-participants" value="${(notesData.participants || []).join(', ')}" placeholder="John Doe, Jane Smith">
      </div>
      
      <div class="pa-form-group">
        <label for="notes-content">Notes:</label>
        <textarea id="notes-content" rows="6" placeholder="Meeting notes, key decisions, action items...">${escapeHtml(notesData.content || '')}</textarea>
      </div>
      
      <div class="pa-form-group">
        <label for="notes-action-items">Action Items:</label>
        <textarea id="notes-action-items" rows="3" placeholder="• Task 1\n• Task 2\n• Task 3"></textarea>
      </div>
      
      <div class="pa-form-actions">
        <button type="button" class="pa-btn pa-btn-secondary" onclick="window.personalAssistantExtension.closeModal()">Cancel</button>
        <button type="submit" class="pa-btn pa-btn-primary">Save Notes</button>
      </div>
    `;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const actionItems = document.getElementById('notes-action-items').value;
      const fullContent = document.getElementById('notes-content').value + 
        (actionItems ? '\n\nAction Items:\n' + actionItems : '');
      
      saveNotes({
        title: document.getElementById('notes-title').value,
        content: fullContent,
        platform: notesData.platform,
        url: notesData.url,
        participants: document.getElementById('notes-participants').value.split(',').map(p => p.trim()).filter(p => p),
        duration: notesData.duration,
        timestamp: notesData.timestamp
      });
    });

    modal.appendChild(form);
    document.body.appendChild(modal);
    currentModal = modal;
    isModalOpen = true;

    // Focus first input
    setTimeout(() => {
      document.getElementById('notes-title').focus();
    }, 100);
  }

  // Show smart bookmark form
  function showBookmarkForm(bookmarkData) {
    if (isModalOpen) {
      closeCurrentModal();
    }

    const modal = createModal('bookmark-form', 'Smart Bookmark');
    
    const form = document.createElement('form');
    form.className = 'pa-form';
    form.innerHTML = `
      <div class="pa-form-group">
        <label for="bookmark-title">Title:</label>
        <input type="text" id="bookmark-title" value="${escapeHtml(bookmarkData.title || '')}" required>
      </div>
      
      <div class="pa-form-group">
        <label for="bookmark-url">URL:</label>
        <input type="url" id="bookmark-url" value="${escapeHtml(bookmarkData.url || '')}" readonly>
      </div>
      
      <div class="pa-form-group">
        <label for="bookmark-category">AI Suggested Category:</label>
        <select id="bookmark-category">
          <option value="work" ${bookmarkData.suggestedCategory === 'work' ? 'selected' : ''}>Work</option>
          <option value="learning" ${bookmarkData.suggestedCategory === 'learning' ? 'selected' : ''}>Learning</option>
          <option value="news" ${bookmarkData.suggestedCategory === 'news' ? 'selected' : ''}>News</option>
          <option value="shopping" ${bookmarkData.suggestedCategory === 'shopping' ? 'selected' : ''}>Shopping</option>
          <option value="entertainment" ${bookmarkData.suggestedCategory === 'entertainment' ? 'selected' : ''}>Entertainment</option>
          <option value="finance" ${bookmarkData.suggestedCategory === 'finance' ? 'selected' : ''}>Finance</option>
          <option value="health" ${bookmarkData.suggestedCategory === 'health' ? 'selected' : ''}>Health</option>
          <option value="travel" ${bookmarkData.suggestedCategory === 'travel' ? 'selected' : ''}>Travel</option>
          <option value="miscellaneous" ${bookmarkData.suggestedCategory === 'miscellaneous' ? 'selected' : ''}>Miscellaneous</option>
        </select>
      </div>
      
      <div class="pa-form-group">
        <label for="bookmark-description">Description:</label>
        <textarea id="bookmark-description" rows="3" placeholder="Brief description of what this bookmark is about...">${escapeHtml(bookmarkData.description || '')}</textarea>
      </div>
      
      <div class="pa-form-group">
        <label for="bookmark-keywords">Keywords:</label>
        <input type="text" id="bookmark-keywords" value="${(bookmarkData.keywords || []).join(', ')}" placeholder="javascript, tutorial, react">
      </div>
      
      <div class="pa-form-actions">
        <button type="button" class="pa-btn pa-btn-secondary" onclick="window.personalAssistantExtension.closeModal()">Cancel</button>
        <button type="submit" class="pa-btn pa-btn-primary">Save Bookmark</button>
      </div>
    `;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBookmark({
        title: document.getElementById('bookmark-title').value,
        url: document.getElementById('bookmark-url').value,
        category: document.getElementById('bookmark-category').value,
        description: document.getElementById('bookmark-description').value,
        keywords: document.getElementById('bookmark-keywords').value.split(',').map(k => k.trim()).filter(k => k),
        suggestedCategory: bookmarkData.suggestedCategory,
        content: bookmarkData.content,
        timestamp: bookmarkData.timestamp
      });
    });

    modal.appendChild(form);
    document.body.appendChild(modal);
    currentModal = modal;
    isModalOpen = true;

    // Focus first input
    setTimeout(() => {
      document.getElementById('bookmark-title').focus();
    }, 100);
  }

  // Create modal base structure
  function createModal(id, title) {
    const modal = document.createElement('div');
    modal.className = 'pa-modal-overlay';
    modal.id = `pa-${id}`;
    
    modal.innerHTML = `
      <div class="pa-modal">
        <div class="pa-modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="pa-modal-close" onclick="window.personalAssistantExtension.closeModal()">×</button>
        </div>
        <div class="pa-modal-body">
          <!-- Form content will be inserted here -->
        </div>
      </div>
    `;

    // Close modal when clicking overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Handle ESC key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    return modal.querySelector('.pa-modal-body');
  }

  // Close current modal
  function closeModal() {
    if (currentModal) {
      currentModal.parentElement.remove();
      currentModal = null;
      isModalOpen = false;
    }
  }

  // Make closeModal available globally for onclick handlers
  window.personalAssistantExtension = {
    closeModal: closeModal
  };

  // Save expense
  function saveExpense(expenseData) {
    showLoadingState('Saving expense...');
    
    chrome.runtime.sendMessage({
      action: 'saveExpense',
      data: expenseData
    }, (response) => {
      hideLoadingState();
      
      if (response.success) {
        showSuccessMessage('Expense saved successfully!');
        closeModal();
      } else {
        showErrorMessage('Failed to save expense: ' + response.error);
      }
    });
  }

  // Save notes
  function saveNotes(notesData) {
    showLoadingState('Saving notes...');
    
    chrome.runtime.sendMessage({
      action: 'saveNotes',
      data: notesData
    }, (response) => {
      hideLoadingState();
      
      if (response.success) {
        showSuccessMessage('Meeting notes saved successfully!');
        closeModal();
      } else {
        showErrorMessage('Failed to save notes: ' + response.error);
      }
    });
  }

  // Save bookmark
  function saveBookmark(bookmarkData) {
    showLoadingState('Saving bookmark...');
    
    chrome.runtime.sendMessage({
      action: 'saveBookmark',
      data: bookmarkData
    }, (response) => {
      hideLoadingState();
      
      if (response.success) {
        showSuccessMessage('Smart bookmark saved successfully!');
        closeModal();
      } else {
        showErrorMessage('Failed to save bookmark: ' + response.error);
      }
    });
  }

  // Extract meeting content from page
  function extractMeetingContent() {
    const content = {
      content: '',
      participants: [],
      duration: null
    };

    // Try to extract meeting-specific content based on platform
    const url = window.location.href;
    
    if (url.includes('meet.google.com')) {
      content.content = extractGoogleMeetContent();
      content.participants = extractGoogleMeetParticipants();
    } else if (url.includes('zoom.us')) {
      content.content = extractZoomContent();
      content.participants = extractZoomParticipants();
    } else if (url.includes('teams.microsoft.com')) {
      content.content = extractTeamsContent();
      content.participants = extractTeamsParticipants();
    } else {
      // Generic content extraction
      content.content = extractGenericContent();
    }

    return content;
  }

  // Extract page content for bookmarking
  function extractPageContent() {
    const content = {
      content: '',
      description: '',
      keywords: []
    };

    // Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      content.description = metaDescription.getAttribute('content');
    }

    // Extract keywords from meta tags
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      content.keywords = metaKeywords.getAttribute('content').split(',').map(k => k.trim());
    }

    // Extract main content text
    const mainContent = document.querySelector('main, article, .content, #content, .post, .article');
    if (mainContent) {
      content.content = mainContent.innerText.substring(0, 1000); // First 1000 chars
    } else {
      content.content = document.body.innerText.substring(0, 1000);
    }

    // Extract keywords from headings
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
      const words = heading.innerText.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !content.keywords.includes(word)) {
          content.keywords.push(word);
        }
      });
    });

    return content;
  }

  // Platform-specific content extraction functions
  function extractGoogleMeetContent() {
    // Try to extract chat messages or any visible text content
    const chatMessages = document.querySelectorAll('[data-message-text]');
    let content = '';
    
    chatMessages.forEach(msg => {
      content += msg.textContent + '\n';
    });
    
    return content || 'Google Meet session';
  }

  function extractGoogleMeetParticipants() {
    const participants = [];
    const participantElements = document.querySelectorAll('[data-participant-id]');
    
    participantElements.forEach(el => {
      const name = el.getAttribute('aria-label') || el.textContent;
      if (name && !participants.includes(name)) {
        participants.push(name);
      }
    });
    
    return participants;
  }

  function extractZoomContent() {
    const chatPanel = document.querySelector('.chat-list');
    if (chatPanel) {
      return chatPanel.innerText;
    }
    return 'Zoom meeting session';
  }

  function extractZoomParticipants() {
    const participants = [];
    const participantElements = document.querySelectorAll('.participants-item__display-name');
    
    participantElements.forEach(el => {
      const name = el.textContent.trim();
      if (name && !participants.includes(name)) {
        participants.push(name);
      }
    });
    
    return participants;
  }

  function extractTeamsContent() {
    const messageElements = document.querySelectorAll('[data-tid="chat-message"]');
    let content = '';
    
    messageElements.forEach(msg => {
      content += msg.innerText + '\n';
    });
    
    return content || 'Microsoft Teams meeting session';
  }

  function extractTeamsParticipants() {
    const participants = [];
    const rosterElements = document.querySelectorAll('[data-tid="roster-participant-name"]');
    
    rosterElements.forEach(el => {
      const name = el.textContent.trim();
      if (name && !participants.includes(name)) {
        participants.push(name);
      }
    });
    
    return participants;
  }

  function extractGenericContent() {
    // Extract any text content that might be relevant
    const textContent = document.body.innerText;
    return textContent.substring(0, 500); // First 500 characters
  }

  // Check if current page is a meeting platform
  function isMeetingPlatform() {
    const url = window.location.href;
    return url.includes('meet.google.com') || 
           url.includes('zoom.us') || 
           url.includes('teams.microsoft.com') || 
           url.includes('webex.com');
  }

  // Setup meeting detection
  function setupMeetingDetection() {
    // Add visual indicator that meeting detection is active
    const indicator = document.createElement('div');
    indicator.id = 'pa-meeting-indicator';
    indicator.innerHTML = '📝 Meeting Notes Ready';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      cursor: pointer;
      font-family: Arial, sans-serif;
    `;
    
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'captureNotes' });
    });
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }

  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoadingState(message) {
    const loading = document.createElement('div');
    loading.id = 'pa-loading';
    loading.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        font-family: Arial, sans-serif;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span>${message}</span>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loading);
  }

  function hideLoadingState() {
    const loading = document.getElementById('pa-loading');
    if (loading) {
      loading.remove();
    }
  }

  function showSuccessMessage(message) {
    showNotification(message, 'success');
  }

  function showErrorMessage(message) {
    showNotification(message, 'error');
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10002;
      max-width: 300px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

})();