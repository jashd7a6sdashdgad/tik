// Personal Assistant Extension Options/Settings Script

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page loaded');
  
  // Initialize options page
  await initializeOptions();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load current settings
  await loadSettings();
});

// Initialize options page
async function initializeOptions() {
  try {
    // Set last updated date
    document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString();
    
    // Load settings
    await loadSettings();
    
  } catch (error) {
    console.error('Error initializing options:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Save and reset buttons
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  
  // Connection testing
  document.getElementById('testConnection').addEventListener('click', testConnection);
  
  // Auth token visibility toggle
  document.getElementById('toggleToken').addEventListener('click', toggleTokenVisibility);
  
  // Data management
  document.getElementById('clearData').addEventListener('click', clearAllData);
  
  // Import/Export
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importSettings);
  
  // Status message close
  document.getElementById('statusClose').addEventListener('click', hideStatusMessage);
  
  // Auto-save on input changes (debounced)
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (input.type !== 'file') {
          autoSaveSettings();
        }
      }, 1000); // Auto-save after 1 second of no changes
    });
  });
}

// Load current settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings', 'auth']);
    const settings = result.settings || {};
    const auth = result.auth || {};
    
    // Connection settings
    document.getElementById('apiUrl').value = settings.apiUrl || 'http://localhost:3000/api';
    document.getElementById('authToken').value = auth.token || '';
    
    // General settings
    document.getElementById('autoSync').checked = settings.autoSync !== false;
    document.getElementById('notifications').checked = settings.notifications !== false;
    document.getElementById('defaultCategory').value = settings.defaultCategory || 'miscellaneous';
    
    // Meeting notes settings
    document.getElementById('autoDetectMeetings').checked = settings.autoDetectMeetings !== false;
    document.getElementById('notesTemplate').value = settings.notesTemplate || getDefaultNotesTemplate();
    document.getElementById('captureParticipants').checked = settings.captureParticipants !== false;
    
    // Smart bookmarking settings
    document.getElementById('smartCategories').checked = settings.smartCategories !== false;
    document.getElementById('extractKeywords').checked = settings.extractKeywords !== false;
    document.getElementById('savePageContent').checked = settings.savePageContent !== false;
    
    // Privacy settings
    document.getElementById('encryptData').checked = settings.encryptData === true;
    document.getElementById('dataRetention').value = settings.dataRetention || '90';
    
    console.log('Settings loaded:', settings);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatusMessage('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings() {
  try {
    showStatusMessage('Saving settings...', 'info');
    
    // Collect settings from form
    const settings = {
      apiUrl: document.getElementById('apiUrl').value.trim(),
      autoSync: document.getElementById('autoSync').checked,
      notifications: document.getElementById('notifications').checked,
      defaultCategory: document.getElementById('defaultCategory').value,
      autoDetectMeetings: document.getElementById('autoDetectMeetings').checked,
      notesTemplate: document.getElementById('notesTemplate').value,
      captureParticipants: document.getElementById('captureParticipants').checked,
      smartCategories: document.getElementById('smartCategories').checked,
      extractKeywords: document.getElementById('extractKeywords').checked,
      savePageContent: document.getElementById('savePageContent').checked,
      encryptData: document.getElementById('encryptData').checked,
      dataRetention: parseInt(document.getElementById('dataRetention').value)
    };
    
    // Validate settings
    if (!settings.apiUrl) {
      throw new Error('API URL is required');
    }
    
    try {
      new URL(settings.apiUrl);
    } catch {
      throw new Error('Invalid API URL format');
    }
    
    // Save auth token separately
    const authToken = document.getElementById('authToken').value.trim();
    const auth = { token: authToken };
    
    // Save to storage
    await chrome.storage.local.set({ settings, auth });
    
    // Notify background script of settings change
    chrome.runtime.sendMessage({ action: 'settingsUpdated', settings, auth });
    
    showStatusMessage('Settings saved successfully!', 'success');
    console.log('Settings saved:', settings);
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatusMessage(`Error saving settings: ${error.message}`, 'error');
  }
}

// Auto-save settings (silent)
async function autoSaveSettings() {
  try {
    await saveSettings();
  } catch (error) {
    // Silent auto-save, don't show error messages
    console.warn('Auto-save failed:', error);
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }
  
  try {
    const defaultSettings = {
      apiUrl: 'http://localhost:3000/api',
      autoSync: true,
      notifications: true,
      defaultCategory: 'miscellaneous',
      autoDetectMeetings: true,
      notesTemplate: getDefaultNotesTemplate(),
      captureParticipants: true,
      smartCategories: true,
      extractKeywords: true,
      savePageContent: false,
      encryptData: false,
      dataRetention: 90
    };
    
    const defaultAuth = { token: '' };
    
    await chrome.storage.local.set({ 
      settings: defaultSettings, 
      auth: defaultAuth 
    });
    
    // Reload settings in form
    await loadSettings();
    
    showStatusMessage('Settings reset to defaults', 'success');
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatusMessage('Error resetting settings', 'error');
  }
}

// Test connection to Personal Assistant API
async function testConnection() {
  const button = document.getElementById('testConnection');
  const statusDiv = document.getElementById('connectionStatus');
  
  try {
    button.disabled = true;
    button.textContent = 'Testing...';
    
    statusDiv.textContent = 'Testing connection...';
    statusDiv.className = 'connection-status loading';
    
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const authToken = document.getElementById('authToken').value.trim();
    
    if (!apiUrl) {
      throw new Error('API URL is required');
    }
    
    // Test basic connectivity
    const healthResponse = await fetch(`${apiUrl.replace('/api', '')}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!healthResponse.ok) {
      throw new Error(`Server returned ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    // Test authentication if token provided
    if (authToken) {
      const authResponse = await fetch(`${apiUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (authResponse.ok) {
        statusDiv.textContent = '✅ Connection successful! Authentication verified.';
        statusDiv.className = 'connection-status success';
      } else {
        statusDiv.textContent = '⚠️ Connection successful, but authentication failed. Check your token.';
        statusDiv.className = 'connection-status error';
      }
    } else {
      statusDiv.textContent = '✅ Connection successful! Add auth token to test authentication.';
      statusDiv.className = 'connection-status success';
    }
    
  } catch (error) {
    console.error('Connection test failed:', error);
    statusDiv.textContent = `❌ Connection failed: ${error.message}`;
    statusDiv.className = 'connection-status error';
  } finally {
    button.disabled = false;
    button.textContent = 'Test Connection';
  }
}

// Toggle auth token visibility
function toggleTokenVisibility() {
  const tokenInput = document.getElementById('authToken');
  const toggleButton = document.getElementById('toggleToken');
  
  if (tokenInput.type === 'password') {
    tokenInput.type = 'text';
    toggleButton.textContent = '🙈';
  } else {
    tokenInput.type = 'password';
    toggleButton.textContent = '👁️';
  }
}

// Clear all extension data
async function clearAllData() {
  const confirmText = 'I understand this will delete all my extension data';
  const userInput = prompt(
    `This will permanently delete all extension data including:\n\n` +
    `• All settings and preferences\n` +
    `• Authentication tokens\n` +
    `• Cached data\n` +
    `• Usage history\n\n` +
    `Type "${confirmText}" to confirm:`
  );
  
  if (userInput !== confirmText) {
    return;
  }
  
  try {
    showStatusMessage('Clearing all data...', 'info');
    
    // Clear all storage
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
    
    // Reset form
    document.querySelectorAll('input, select, textarea').forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else if (input.type !== 'file') {
        input.value = '';
      }
    });
    
    // Clear connection status
    document.getElementById('connectionStatus').textContent = '';
    document.getElementById('connectionStatus').className = 'connection-status';
    
    showStatusMessage('All extension data cleared successfully', 'success');
    
    // Reload settings after clearing
    setTimeout(() => {
      loadSettings();
    }, 1000);
    
  } catch (error) {
    console.error('Error clearing data:', error);
    showStatusMessage('Error clearing data', 'error');
  }
}

// Export settings
async function exportSettings() {
  try {
    const result = await chrome.storage.local.get(['settings', 'auth']);
    
    // Remove sensitive data from export
    const exportData = {
      settings: result.settings || {},
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // Don't export the auth token for security
    delete exportData.auth;
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personal-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    showStatusMessage('Settings exported successfully', 'success');
    
  } catch (error) {
    console.error('Error exporting settings:', error);
    showStatusMessage('Error exporting settings', 'error');
  }
}

// Import settings
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // Validate import data
    if (!importData.settings || !importData.version) {
      throw new Error('Invalid settings file format');
    }
    
    // Merge with current settings
    const currentResult = await chrome.storage.local.get(['settings']);
    const mergedSettings = { 
      ...currentResult.settings,
      ...importData.settings 
    };
    
    await chrome.storage.local.set({ settings: mergedSettings });
    
    // Reload settings in form
    await loadSettings();
    
    showStatusMessage('Settings imported successfully', 'success');
    
  } catch (error) {
    console.error('Error importing settings:', error);
    showStatusMessage(`Error importing settings: ${error.message}`, 'error');
  } finally {
    // Clear file input
    event.target.value = '';
  }
}

// Show status message
function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  const statusText = document.getElementById('statusText');
  
  statusText.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.classList.remove('hidden');
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      hideStatusMessage();
    }, 5000);
  }
}

// Hide status message
function hideStatusMessage() {
  document.getElementById('statusMessage').classList.add('hidden');
}

// Get default notes template
function getDefaultNotesTemplate() {
  return `# {title}

**Date:** {date}
**Platform:** {platform}

## Attendees
- 

## Agenda
- 

## Discussion
- 

## Decisions Made
- 

## Action Items
- [ ] 
- [ ] 

## Next Steps
- `;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Options received message:', message);
  
  switch (message.action) {
    case 'settingsRequest':
      loadSettings();
      break;
  }
  
  sendResponse({ success: true });
});