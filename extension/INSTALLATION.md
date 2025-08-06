# Personal Assistant Chrome Extension - Installation Guide

## Prerequisites

1. **Personal Assistant Dashboard**: Make sure your Personal Assistant is running at `http://localhost:3000`
2. **Chrome Browser**: Version 88 or later
3. **Authentication**: You'll need an API token from your Personal Assistant dashboard

## Installation Methods

### Method 1: Developer Mode Installation (Recommended for Development)

1. **Download the Extension**
   ```bash
   # If using the full Personal Assistant project
   cd mahboob-personal-assistant/extension
   
   # Or download just the extension folder
   ```

2. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → More tools → Extensions

3. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top right corner
   - This will show additional options

4. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `extension` folder
   - The extension should appear in your extensions list

5. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Personal Assistant" in the list
   - Click the pin icon to keep it visible

### Method 2: Chrome Web Store (Coming Soon)

Once published to the Chrome Web Store:
1. Visit the Chrome Web Store
2. Search for "Personal Assistant"
3. Click "Add to Chrome"
4. Confirm installation

## Initial Setup

### Step 1: Configure API Connection

1. **Click the Extension Icon**
   - Look for the Personal Assistant icon in your Chrome toolbar
   - Click it to open the popup

2. **Open Settings**
   - Click the gear icon (⚙️) in the popup header
   - This opens the settings page

3. **Enter API URL**
   - Default: `http://localhost:3000/api`
   - Change if your Personal Assistant runs on a different URL/port

4. **Get Authentication Token**
   - Open your Personal Assistant dashboard (`http://localhost:3000`)
   - Go to Settings → API or Profile → API Access
   - Copy your authentication token

5. **Enter Authentication Token**
   - Paste the token in the settings page
   - Click "Test Connection" to verify

### Step 2: Verify Connection

1. **Test Connection**
   - In the extension settings, click "Test Connection"
   - You should see: ✅ "Connection successful! Authentication verified."

2. **Check Popup Status**
   - Close settings and click the extension icon
   - The popup should show "Connected to Personal Assistant"

### Step 3: Customize Settings (Optional)

Configure the extension to your preferences:

**General Settings:**
- ✅ Auto-sync data
- ✅ Show notifications
- Set default expense category

**Meeting Notes:**
- ✅ Auto-detect meeting platforms
- Customize notes template
- ✅ Auto-capture participants

**Smart Bookmarking:**
- ✅ Enable AI categorization
- ✅ Auto-extract keywords
- ✅ Save page content preview

## Testing the Installation

### Test Quick Expense Entry

1. **Visit a Shopping Site**
   - Go to Amazon, eBay, or any online store
   - Select some text with a price (e.g., "$29.99")

2. **Use Quick Expense**
   - Right-click → "Add as Expense"
   - Or press `Ctrl+Shift+E`
   - Or click extension icon → "Quick Expense"

3. **Verify Form**
   - The expense form should appear
   - Amount and category should be auto-detected
   - Fill in details and click "Save Expense"

4. **Check Dashboard**
   - Go to your Personal Assistant dashboard
   - Check the Expenses section
   - Your new expense should appear

### Test Meeting Notes Capture

1. **Join a Meeting**
   - Go to Google Meet, Zoom, or Teams
   - Join any meeting (or create a test meeting)

2. **Capture Notes**
   - Right-click → "Capture Meeting Notes"
   - Or press `Ctrl+Shift+N`
   - The extension should detect the platform

3. **Fill Notes Form**
   - Meeting title should be auto-filled
   - Platform should be detected
   - Add your notes and save

4. **Check Dashboard**
   - Go to Diary/Notes section in dashboard
   - Your meeting notes should appear

### Test Smart Bookmarking

1. **Visit an Article**
   - Go to any news site or blog post
   - Read an interesting article

2. **Create Bookmark**
   - Right-click → "Smart Bookmark"
   - Or press `Ctrl+Shift+B`
   - The extension will analyze the page

3. **Review Categorization**
   - The form should show AI-suggested category
   - Keywords should be extracted
   - Description should be generated

4. **Save and Verify**
   - Save the bookmark
   - Check dashboard for the saved bookmark

## Troubleshooting

### Extension Not Loading

**Issue**: Extension doesn't appear in chrome://extensions/
- ✅ Make sure you're in Developer Mode
- ✅ Check that you selected the correct folder
- ✅ Look for error messages in red

**Issue**: Extension loads but shows errors
- ✅ Check Chrome DevTools console (F12)
- ✅ Verify all files are present in the extension folder
- ✅ Try disabling and re-enabling the extension

### Connection Problems

**Issue**: "Connection failed" error
- ✅ Verify Personal Assistant is running (`http://localhost:3000`)
- ✅ Check the API URL in settings
- ✅ Try the health endpoint directly: `http://localhost:3000/health`

**Issue**: "Authentication failed" error
- ✅ Verify your API token is correct and not expired
- ✅ Check token permissions in dashboard
- ✅ Try generating a new token

### Feature Issues

**Issue**: Quick expense form doesn't appear
- ✅ Make sure you're on a webpage (not chrome:// pages)
- ✅ Check if content script loaded (F12 → Console)
- ✅ Try refreshing the page

**Issue**: Meeting platform not detected
- ✅ Verify you're on a supported platform
- ✅ Check auto-detection is enabled in settings
- ✅ Try manual capture instead

**Issue**: Bookmarks not categorizing
- ✅ Ensure AI categorization is enabled
- ✅ Check if page has enough content to analyze
- ✅ Try with different types of pages

### Permission Issues

**Issue**: Extension requests too many permissions
- All permissions are necessary for functionality
- Review the permissions list in the README
- Permissions are only used for stated features

**Issue**: Extension can't access certain sites
- Some sites may block extension content scripts
- Try the extension popup method instead
- Corporate networks may have restrictions

### Performance Issues

**Issue**: Extension slows down browsing
- ✅ Check if auto-sync is causing issues
- ✅ Reduce data retention period in settings
- ✅ Clear extension data if cache is too large

**Issue**: Extension uses too much memory
- ✅ Disable unused features in settings
- ✅ Clear cached data regularly
- ✅ Restart Chrome if needed

## Getting Help

### Debug Information

When reporting issues, please include:

1. **Chrome Version**: `chrome://version/`
2. **Extension Version**: Check in `chrome://extensions/`
3. **Personal Assistant Version**: Check dashboard
4. **Console Errors**: F12 → Console tab
5. **Extension Logs**: Background page console

### Support Channels

1. **Documentation**: Check the main README.md
2. **GitHub Issues**: Create an issue in the repository
3. **Community**: Ask in project discussions
4. **Email**: Contact the development team

### Logs and Debugging

**Enable Extension Debugging:**
1. Go to `chrome://extensions/`
2. Find Personal Assistant extension
3. Click "Inspect views: background page"
4. Check console for background script logs

**Content Script Debugging:**
1. Go to any webpage where extension should work
2. Press F12 to open DevTools
3. Check Console tab for content script logs
4. Look for extension-related messages

**Network Debugging:**
1. Open DevTools → Network tab
2. Try using extension features
3. Check for API calls to your Personal Assistant
4. Verify request/response data

## Uninstallation

### Remove Extension

1. **Via Chrome Extensions**
   - Go to `chrome://extensions/`
   - Find Personal Assistant
   - Click "Remove"
   - Confirm removal

2. **Clean Up Data**
   - Extension data is automatically removed
   - Your Personal Assistant dashboard data remains intact
   - Settings and cache are cleared

### Backup Data

Before uninstalling:
1. Export settings from extension settings page
2. Ensure all data is synced to your dashboard
3. Note any custom templates or configurations

---

**Need Help?** Check the troubleshooting section above or create an issue in the project repository.