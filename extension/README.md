# Personal Assistant Chrome Extension

A powerful Chrome extension that enables quick expense entry, meeting notes capture, and smart bookmarking with AI categorization directly from any webpage.

## Features

### 🚀 Quick Actions
- **💰 Quick Expense Entry**: Add expenses from any website with automatic categorization
- **📝 Meeting Notes Capture**: Capture and save meeting notes from video conferencing platforms
- **🔖 Smart Bookmarking**: AI-powered bookmark categorization and keyword extraction

### 🎯 Smart Detection
- **Auto-detect** shopping sites and extract expense information
- **Meeting platform recognition** (Google Meet, Zoom, Teams, Webex)
- **AI categorization** for expenses and bookmarks
- **Participant extraction** from meeting platforms

### ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+E` - Quick expense entry
- `Ctrl+Shift+N` - Capture meeting notes
- `Ctrl+Shift+B` - Smart bookmark

### 🔧 Platform Integration
- Seamless integration with Personal Assistant dashboard
- Real-time sync with your expense tracking
- Automatic data categorization and tagging
- Context-aware suggestions

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Personal Assistant"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension will appear in your toolbar

## Setup

### 1. Configure Connection
1. Click the extension icon in your toolbar
2. Click the settings gear icon
3. Enter your Personal Assistant API URL (default: `http://localhost:3000/api`)
4. Add your authentication token from the Personal Assistant dashboard

### 2. Test Connection
1. In the settings page, click "Test Connection"
2. Verify that both connection and authentication are successful
3. Adjust settings as needed

### 3. Customize Settings
- Set default expense categories
- Configure meeting notes templates
- Enable/disable AI features
- Set up notification preferences

## Usage

### Quick Expense Entry
1. **Right-click method**: Right-click on any page → "Add as Expense"
2. **Keyboard shortcut**: Press `Ctrl+Shift+E`
3. **Extension popup**: Click the extension icon → "Quick Expense"

The extension will:
- Auto-detect expense information from the page
- Suggest appropriate categories
- Extract amounts from selected text
- Save directly to your Personal Assistant

### Meeting Notes Capture
1. **During a meeting**: The extension auto-detects meeting platforms
2. **Right-click method**: Right-click → "Capture Meeting Notes"
3. **Keyboard shortcut**: Press `Ctrl+Shift+N`

Features:
- Extract participant names automatically
- Save meeting platform information
- Use customizable templates
- Organize with automatic tagging

### Smart Bookmarking
1. **Right-click method**: Right-click on any page → "Smart Bookmark"
2. **Keyboard shortcut**: Press `Ctrl+Shift+B`
3. **Extension popup**: Click "Smart Bookmark"

AI Features:
- Automatic categorization (work, learning, news, etc.)
- Keyword extraction from page content
- Description generation
- Duplicate detection

## Supported Platforms

### Meeting Platforms
- 🟢 Google Meet
- 🔵 Zoom
- 🟣 Microsoft Teams
- ⚪ Cisco Webex
- 🟠 GoToMeeting

### E-commerce Sites
- Amazon, eBay, and major online stores
- Food delivery platforms (UberEats, DoorDash, etc.)
- Travel booking sites
- Subscription services
- And many more...

## Privacy & Security

### Data Handling
- All data is sent directly to your Personal Assistant instance
- No data is stored on external servers
- Authentication tokens are encrypted locally
- Sensitive information is never logged

### Permissions
The extension requires the following permissions:
- `activeTab`: To interact with the current webpage
- `storage`: To save settings and cache data
- `contextMenus`: To add right-click menu options
- `notifications`: To show success/error messages

## Troubleshooting

### Connection Issues
1. Verify your Personal Assistant is running
2. Check the API URL in settings
3. Ensure your authentication token is valid
4. Try the "Test Connection" button

### Features Not Working
1. Refresh the webpage and try again
2. Check if the extension has necessary permissions
3. Clear extension data and reconfigure
4. Check browser console for error messages

### Meeting Detection Issues
1. Ensure you're on a supported meeting platform
2. Check that auto-detection is enabled in settings
3. Try using the manual capture methods

## Development

### Project Structure
```
extension/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for webpage interaction
├── content.css           # Styles for content script elements
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styles
├── options.html          # Settings page
├── options.js            # Settings functionality
├── options.css           # Settings styles
├── icons/                # Extension icons
└── README.md             # This file
```

### Building for Production
1. Update version in `manifest.json`
2. Minify JavaScript and CSS files
3. Optimize images
4. Test in multiple Chrome versions
5. Package for Chrome Web Store

### API Integration
The extension communicates with the Personal Assistant API:
- `POST /api/sheets/expenses` - Save expenses
- `POST /api/sheets/diary` - Save notes and bookmarks
- `GET /api/auth/verify` - Verify authentication
- `GET /health` - Check API health

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This extension is part of the Personal Assistant project. See the main project license for details.

## Support

For support, please:
1. Check this README for common issues
2. Visit the Personal Assistant documentation
3. Create an issue in the main repository
4. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: Chrome 88+, Edge 88+