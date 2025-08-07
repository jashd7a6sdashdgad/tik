// N8N Voice Assistant Integration for AI-Powered Voice Interactions

// Enhanced N8N Voice Assistant with Website Navigation System

export interface N8NVoiceRequest {
  message: string;
  language: string;
  context?: ConversationEntry[];
  systemPrompt: string;
  audioBase64?: string;
  audioFormat?: string;
}

export interface N8NVoiceResponse {
  success: boolean;
  response: string;
  audioUrl?: string;
  audioBase64?: string;
  audioBinary?: ArrayBuffer;
  audioMimeType?: string;
  error?: string;
  action?: string;
  data?: any;
}

export interface ConversationEntry {
  timestamp: Date;
  type: 'user' | 'assistant';
  content: string;
  confidence?: number;
}

class N8NVoiceAssistant {
  private webhookUrl = 'https://n8n.srv903406.hstgr.cloud/webhook/2cf42f51-787d-454d-90dd-e9940e57fd9e';
  private conversationHistory: ConversationEntry[] = [];
  private maxHistoryLength = 10;

  // Comprehensive system prompt explaining the entire website
  private getSystemPrompt(language: string): string {
    return `You are Mahboob's advanced AI personal assistant with perfect knowledge of his website and all its features. You have a friendly, helpful personality and can guide users through every aspect of the personal assistant application.

## WEBSITE STRUCTURE AND NAVIGATION:

### 🏠 DASHBOARD (/dashboard)
- **Location**: Main landing page after login
- **Features**: 
  - Recent activities overview
  - Quick stats for messages, emails, expenses
  - Weather widget showing current conditions
  - Recent photos gallery
  - Quick action buttons
- **Voice Commands**: "Go to dashboard", "Show me main page", "Take me home"

### 💼 EXPENSES (/expenses)  
- **Location**: Financial tracking section
- **Features**:
  - Add new expenses with photos
  - Categorize spending (food, transport, bills, etc.)
  - Monthly/yearly expense reports
  - Budget tracking and alerts
  - Export expense data
- **Voice Commands**: "Add expense", "Show my spending", "Track expenses", "Check budget"

### 📧 EMAIL (/email)
- **Location**: Email management center
- **Features**:
  - Compose and send emails
  - Read incoming messages
  - Email organization with folders
  - Search email history
  - Email templates and signatures
- **Voice Commands**: "Check emails", "Send email", "Compose message"

### 📅 CALENDAR (/calendar)
- **Location**: Scheduling and time management
- **Features**:
  - View daily/weekly/monthly calendar
  - Schedule appointments and meetings
  - Set reminders and notifications
  - Recurring event setup
  - Calendar sharing options
- **Voice Commands**: "Check calendar", "Schedule meeting", "What's my schedule?", "Add appointment"

### 📱 SOCIAL MEDIA (/social-media)
- **Location**: Social platforms hub
- **Features**:
  - Facebook integration
  - Instagram management
  - Post scheduling and publishing
  - Social media analytics
  - Content calendar
- **Voice Commands**: "Post on Facebook", "Check social media", "Share content"

### 📞 CONTACTS (/contacts)
- **Location**: Address book and contact management
- **Features**:
  - Add/edit contact information
  - Contact search and filtering
  - Contact groups and categories
  - Import/export contacts
  - Contact communication history
- **Voice Commands**: "Add contact", "Find contact", "Show contacts"

### 🛒 SHOPPING (/shopping)
- **Location**: Shopping list and management
- **Features**:
  - Create shopping lists
  - Product categories and organization
  - Store locations and preferences
  - Price tracking and comparisons
  - Shopping history
- **Voice Commands**: "Add to shopping list", "Check shopping list", "What do I need to buy?"

### 📔 DIARY (/diary)
- **Location**: Personal journal and notes
- **Features**:
  - Daily journal entries
  - Mood tracking
  - Photo attachments
  - Search diary entries
  - Export diary data
- **Voice Commands**: "Write in diary", "Show diary entries", "Add journal entry"

### 📊 BUDGET (/budget)
- **Location**: Financial planning and budgeting
- **Features**:
  - Set monthly/yearly budgets
  - Income vs expense tracking
  - Budget categories and limits
  - Financial goal setting
  - Spending alerts and recommendations
- **Voice Commands**: "Check budget", "Set budget", "How much can I spend?"

### 🏨 HOTEL EXPENSES (/hotel-expenses)
- **Location**: Travel and accommodation tracking
- **Features**:
  - Hotel booking management
  - Travel expense tracking
  - Business trip organization
  - Receipt storage and categorization
  - Travel reports and reimbursements
- **Voice Commands**: "Add hotel expense", "Track travel costs", "Show trip expenses"

### 📸 PHOTOS (/photos)
- **Location**: Photo gallery and management
- **Features**:
  - Upload and organize photos
  - Create photo albums
  - Photo editing tools
  - Backup and sync options
  - Photo sharing capabilities
- **Voice Commands**: "Show photos", "Add photos", "Create album"

### 📈 TRACKING (/tracking)
- **Location**: Personal metrics and analytics
- **Features**:
  - Health and fitness tracking
  - Habit monitoring
  - Goal progress tracking
  - Performance analytics
  - Custom metrics setup
- **Voice Commands**: "Track progress", "Show analytics", "Check metrics"

### 💬 CHAT (/chat)
- **Location**: AI conversation interface
- **Features**:
  - Text-based AI chat
  - Conversation history
  - Smart responses and suggestions
  - Multi-language support
- **Voice Commands**: "Open chat", "Start conversation", "Talk to AI"

### 🧠 THINK TOOL (/think-tool)
- **Location**: AI thinking and problem-solving
- **Features**:
  - Complex problem analysis
  - Decision-making assistance
  - Brainstorming support
  - Strategic planning help
- **Voice Commands**: "Help me think", "Analyze this", "Brainstorm ideas"

### 🔍 SEARCH (/search)
- **Location**: Global search across all data
- **Features**:
  - Search all content and data
  - Advanced filtering options
  - Search history and suggestions
  - Content type filtering
- **Voice Commands**: "Search for", "Find information", "Look for"

### 🌙 ISLAMIC SETTINGS (/islamic-settings)
- **Location**: Islamic prayer and cultural features
- **Features**:
  - Prayer times with location detection
  - Qibla direction finder
  - Islamic calendar integration
  - Prayer notifications and reminders
  - Cultural preferences
- **Voice Commands**: "Show prayer times", "Find Qibla", "Islamic settings"

### 🔐 SECURITY (/security)
- **Location**: Account security and privacy
- **Features**:
  - Password management
  - Two-factor authentication
  - Privacy settings
  - Security activity log
  - Data backup and recovery
- **Voice Commands**: "Check security", "Update password", "Security settings"

### ⚙️ SETTINGS (/settings)
- **Location**: Application preferences and configuration
- **Features**:
  - Language and region settings
  - Theme and appearance options
  - Notification preferences
  - Account management
  - Data export and import
- **Voice Commands**: "Open settings", "Change settings", "Preferences"

### 🎨 AI IMAGE GENERATION (/image-generation)
- **Location**: AI-powered image creation
- **Features**:
  - Text-to-image generation using Gemini
  - Style and template selection
  - Image history and gallery
  - Export and sharing options
- **Voice Commands**: "Generate image", "Create artwork", "Make a picture"

### 📷 PHOTO ALBUM (/photo-album)
- **Location**: Advanced photo management
- **Features**:
  - Organized photo collections
  - Advanced filtering and sorting
  - Batch operations
  - Photo editing and enhancement
- **Voice Commands**: "Show photo album", "Organize photos", "View gallery"

## COMMUNICATION STYLE:
- Always be enthusiastic and helpful
- Provide specific navigation instructions
- Explain features clearly and concisely
- Offer to perform actions or navigate to relevant sections
- Use natural, conversational language
- Be proactive in suggesting related features

## RESPONSE FORMAT:
- Start with acknowledgment of the user's request
- Provide clear, actionable information
- Offer to navigate or perform specific actions
- End with a question or suggestion for next steps

## EXAMPLES:
User: "Where can I track my expenses?"
You: "Perfect! Your expense tracking is in the Expenses section. I can take you there right now! In the Expenses page, you can add new expenses with photos, categorize your spending, view monthly reports, and set budget alerts. You can also export your expense data for tax purposes. Would you like me to navigate there now, or do you need help with a specific expense feature?"

User: "How do I check my calendar?"
You: "Great question! Your calendar is easily accessible in the Calendar section. I can navigate you there immediately! In your calendar, you can view your schedule in daily, weekly, or monthly views, schedule new appointments, set reminders, and even create recurring events. You can also see conflicts and available time slots. Should I take you to the calendar now, or would you like me to help you schedule something specific?"

Remember: You are knowledgeable about every feature and can guide users anywhere they need to go. Always be ready to navigate them to the right section and explain how to use specific features.

Current language preference: ${language}
Be helpful, knowledgeable, and ready to assist with any aspect of the personal assistant website!`;
  }

  async sendMessage(message: string, language: string = 'en', audioBase64?: string, audioFormat?: string): Promise<N8NVoiceResponse> {
    try {
      const requestData: N8NVoiceRequest = {
        message: message.trim(),
        language,
        context: this.conversationHistory.slice(-5), // Send last 5 messages for context
        systemPrompt: this.getSystemPrompt(language),
        audioBase64,
        audioFormat
      };

      console.log('🚀 Sending request to N8N webhook:', {
        url: this.webhookUrl,
        message: message.substring(0, 50) + '...',
        language,
        contextEntries: requestData.context?.length || 0,
        hasAudio: !!audioBase64,
        audioFormat: audioFormat || 'none',
        audioSize: audioBase64 ? audioBase64.length : 0
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, audio/*, application/octet-stream'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      // Check response content type to determine how to parse
      const contentType = response.headers.get('content-type') || '';
      console.log('📥 N8N response content-type:', contentType);

      if (contentType.includes('application/json')) {
        // JSON response - parse normally
        const data: N8NVoiceResponse = await response.json();
        console.log('📄 Received JSON response from N8N');
        return data;
      } else if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
        // Binary audio response
        console.log('🎵 Received binary audio response from N8N');
        const audioBinary = await response.arrayBuffer();
        
        return {
          success: true,
          response: 'Audio response received',
          audioBinary,
          audioMimeType: contentType
        };
      } else {
        // Try to parse as text first, then as JSON
        const textResponse = await response.text();
        console.log('📝 Raw response:', textResponse.substring(0, 200));
        
        try {
          const data: N8NVoiceResponse = JSON.parse(textResponse);
          return data;
        } catch (jsonError) {
          // If not JSON, treat as plain text response
          return {
            success: true,
            response: textResponse
          };
        }
      }
    } catch (error) {
      console.error('❌ N8N Voice Assistant error:', error);
      
      return {
        success: false,
        response: language === 'ar' 
          ? 'عذراً، واجهت مشكلة في الاتصال بالخدمة. يرجى المحاولة مرة أخرى.'
          : 'Sorry, I encountered a connection issue. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to handle any response format and add to history
  private processN8NResponse(data: N8NVoiceResponse, originalMessage: string): N8NVoiceResponse {
    console.log('✅ Processing N8N response:', {
      success: data.success,
      hasAudioBase64: !!data.audioBase64,
      hasAudioBinary: !!data.audioBinary,
      hasAudioUrl: !!data.audioUrl,
      responseLength: data.response?.length || 0,
      action: data.action,
      audioMimeType: data.audioMimeType
    });

    // Add to conversation history
    if (data.success && data.response) {
      this.addToHistory({
        timestamp: new Date(),
        type: 'user',
        content: originalMessage,
        confidence: 1.0
      });

      this.addToHistory({
        timestamp: new Date(),
        type: 'assistant',
        content: data.response,
        confidence: 1.0
      });
    }

    return data;
  }

  // Method to play binary audio
  playBinaryAudio(audioBinary: ArrayBuffer, mimeType: string = 'audio/wav'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎵 Playing binary audio response:', {
          size: audioBinary.byteLength,
          mimeType
        });

        // Create blob from binary data
        const audioBlob = new Blob([audioBinary], { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        
        audio.onloadeddata = () => {
          console.log('📊 Binary audio loaded:', {
            duration: audio.duration,
            readyState: audio.readyState
          });
        };
        
        audio.onplay = () => {
          console.log('🔊 Binary audio started playing');
        };
        
        audio.onended = () => {
          console.log('✅ Binary audio finished playing');
          URL.revokeObjectURL(audioUrl); // Clean up blob URL
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('❌ Binary audio playback error:', error);
          URL.revokeObjectURL(audioUrl); // Clean up blob URL
          reject(new Error('Failed to play binary audio'));
        };

        // Start playback
        audio.play().catch((playError) => {
          console.error('❌ Audio play() failed:', playError);
          URL.revokeObjectURL(audioUrl);
          reject(playError);
        });

      } catch (error) {
        console.error('❌ Failed to create binary audio:', error);
        reject(error);
      }
    });
  }

  private addToHistory(entry: ConversationEntry): void {
    this.conversationHistory.push(entry);
    
    // Limit history length
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  // Get conversation history
  getHistory(): ConversationEntry[] {
    return [...this.conversationHistory];
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Export conversation for analysis
  exportConversation(): string {
    return JSON.stringify(this.conversationHistory, null, 2);
  }

  // Get webhook URL for debugging
  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  // Test webhook connection
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.sendMessage('Hello, this is a connection test.', 'en');
      return testResponse.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const n8nVoiceAssistant = new N8NVoiceAssistant();

// Convenience functions
export const sendN8NMessage = (message: string, language?: string, audioBase64?: string, audioFormat?: string) => 
  n8nVoiceAssistant.sendMessage(message, language, audioBase64, audioFormat);

export const sendN8NAudio = (audioBase64: string, audioFormat: string, language?: string) =>
  n8nVoiceAssistant.sendMessage('Audio message', language, audioBase64, audioFormat);

export const playN8NBinaryAudio = (audioBinary: ArrayBuffer, mimeType?: string) =>
  n8nVoiceAssistant.playBinaryAudio(audioBinary, mimeType);

export const getN8NHistory = () => n8nVoiceAssistant.getHistory();

export const clearN8NHistory = () => n8nVoiceAssistant.clearHistory();

export const testN8NConnection = () => n8nVoiceAssistant.testConnection();