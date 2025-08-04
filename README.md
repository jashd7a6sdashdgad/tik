# Mahboob Personal Assistant 🤖

A truly intelligent personal assistant application built with Next.js 15, featuring Google integrations, voice commands, and smart automation. Think of it as your personal JARVIS!

![Personal Assistant Dashboard](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### 🔐 Authentication System
- Simple login with hardcoded credentials (mahboob/mahboob123)
- JWT-based authentication with persistent sessions
- Secure httpOnly cookies

### 🎨 Beautiful Design
- **Custom Color Palette:**
  - Primary: #3D74B6 (Blue)
  - Background: #FBF5DE (Cream)
  - Secondary: #EAC8A6 (Tan)
  - Accent: #DC3C22 (Red)
- Glassmorphism effects and smooth animations
- Fully responsive (mobile-first design)
- Dark/light mode support

### 🗣️ Voice Integration
- **Web Speech API** for voice commands
- Natural language processing
- Smart command recognition:
  - "Schedule dentist next Thursday 3 PM"
  - "Send email to John about the project"
  - "Add $25 expense for lunch"
  - "Search for medical research on diabetes"

### 📅 Google Calendar Integration
- Natural language event scheduling
- View today's/week's schedule
- Create, update, delete events
- Smart conflict detection

### 📧 Gmail Integration
- Send emails via voice/text commands
- View unread email count
- Smart email search and filtering
- Auto-reply templates

### 📊 Google Sheets Integration (5 Sheets)
1. **Shopping List** - Add/remove items, calculate totals
2. **Expense Tracker** - Log expenses with analytics
3. **Contacts Sheet** - CRUD operations for contacts
4. **Hotel Expenses** - Business travel cost tracking
5. **Personal Diary** - Date-stamped entries with mood tracking

### 🎥 YouTube Integration
- Channel analytics and insights
- Recent uploads management
- Video metadata updates

### 🔗 N8n Workflow Integration
- Webhook endpoints for automation
- Structured data processing
- Workflow triggers

### 🔍 Advanced Search
- **Firecrawl Integration** - Web search and scraping
- **MCP (Model Context Protocol)** - Medical literature search
- Specialized knowledge base access

### 🎯 Smart Features
- Daily summary dashboard
- Smart notifications
- Data export (PDF/CSV)
- Keyboard shortcuts
- AI-powered insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Platform account
- Google Sheets created for data storage

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd mahboob-personal-assistant
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your actual credentials:

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-jwt-key
JWT_SECRET=your-jwt-secret-key-here

# Google OAuth2 & APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Google Sheets IDs (create these first)
SHOPPING_LIST_SHEET_ID=your-shopping-list-sheet-id
EXPENSES_SHEET_ID=your-expenses-sheet-id
CONTACTS_SHEET_ID=your-contacts-sheet-id
HOTEL_EXPENSES_SHEET_ID=your-hotel-expenses-sheet-id
DIARY_SHEET_ID=your-diary-sheet-id

# Optional integrations
N8N_WEBHOOK_URL=https://n8n.srv903406.hstgr.cloud/webhook/990e6a3a-6881-4ae3-a345-5d5ef28f5f58
FIRECRAWL_API_KEY=your-firecrawl-api-key
```

4. **Set up Google Cloud Platform:**

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Create a new project or select existing one
   
   c. Enable the following APIs:
   - Google Calendar API
   - Gmail API
   - Google Sheets API
   - YouTube Data API v3
   
   d. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret to `.env.local`

5. **Create Google Sheets:**
   
   Create 5 Google Sheets with these column headers:
   
   **Shopping List:**
   ```
   Name | Quantity | Price | Category | Purchased | Date
   ```
   
   **Expenses:**
   ```
   Date | Amount | Category | Description | Receipt | BusinessPurpose
   ```
   
   **Contacts:**
   ```
   Name | Email | Phone | Company | Notes | DateAdded
   ```
   
   **Hotel Expenses:**
   ```
   Date | Hotel | Amount | Category | Receipt | BusinessPurpose | Location
   ```
   
   **Personal Diary:**
   ```
   Date | Content | Mood | Tags | DateTime
   ```
   
   Copy each sheet ID from the URL and add to `.env.local`

6. **Run the development server:**
```bash
npm run dev
```

7. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

8. **Login:**
- Username: `mahboob`
- Password: `mahboob123`

## 🎮 Usage

### Voice Commands
Click the microphone button and try these commands:

- **Calendar:** "Schedule dentist appointment next Thursday at 3 PM"
- **Email:** "Send email to john@example.com about project update"
- **Expenses:** "Add $45 expense for lunch meeting"
- **Shopping:** "Add milk and bread to shopping list"
- **Search:** "Search for latest AI research papers"

### Dashboard Features
- **Quick Stats:** Today's events, unread emails, expenses
- **Voice Assistant:** Real-time command processing
- **Quick Actions:** One-click access to common tasks
- **Smart Notifications:** Context-aware alerts

### Navigation
- **Dashboard:** Overview and quick actions
- **Calendar:** Event management
- **Email:** Gmail integration
- **Expenses:** Financial tracking
- **Diary:** Personal journal
- **MCP Tools:** Medical literature search

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Custom CSS variables
- **Authentication:** JWT with httpOnly cookies
- **APIs:** Google APIs, RESTful endpoints
- **Voice:** Web Speech API
- **State Management:** React hooks, Context API

### File Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication
│   │   ├── calendar/      # Google Calendar
│   │   ├── gmail/         # Gmail integration
│   │   ├── sheets/        # Google Sheets
│   │   ├── youtube/       # YouTube API
│   │   ├── n8n/           # Workflow integration
│   │   └── search/        # Search functionality
│   ├── auth/              # Login page
│   ├── dashboard/         # Main dashboard
│   ├── mcp-tools/         # MCP search interface
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── features/         # Feature components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and integrations
├── types/                # TypeScript type definitions
└── styles/               # Additional styles
```

## 🧪 Testing

```bash
# Run type checking
npm run build

# Run linting
npm run lint

# Run development server
npm run dev
```

## 🔧 Advanced Configuration

### N8n Integration
Set up N8n workflows to automate tasks based on your assistant activities.

### MCP Server Setup
For medical literature search, set up MCP servers:
- Medical: PubMed, medical journals
- Research: Academic databases
- General: Wikipedia, knowledge bases

### Custom Voice Commands
Extend voice command patterns in `src/app/api/ai/process-command/route.ts`

## 🚨 Security Features

- **Authentication:** JWT tokens with httpOnly cookies
- **API Security:** Request validation and rate limiting
- **Input Sanitization:** All user inputs are sanitized
- **Error Handling:** Comprehensive error boundaries
- **Environment Variables:** Sensitive data in environment variables

## 📱 Mobile Support

Fully responsive design with:
- Mobile-first approach
- Touch-friendly interface
- Mobile navigation menu
- Voice commands on mobile browsers (where supported)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Next.js and React
- Google APIs for integrations
- Web Speech API for voice functionality
- Tailwind CSS for styling
- Icons by Lucide React

## 🆘 Support

For support and questions:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce

---

**Made with ❤️ by Claude Code** 

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com># mcp-web-agentUPD
# mcp-web-agentUPD
# mcp-web-agentupd2
# mcp-web-agent3
# mcp-web-agent3
# mcp-web-agent3
# mahboob-personal-assistant1
# mahboob-personal-assistant1
# mahboob-personal-assistant1
# man
# min
# mcp-web-agent3
# mahboobagent.fun
