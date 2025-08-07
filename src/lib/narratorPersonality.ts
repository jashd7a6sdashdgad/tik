// AI Narrator Personality System with Intelligent Responses

interface PersonalityConfig {
  name: string;
  voice: 'friendly' | 'professional' | 'enthusiastic' | 'calm';
  responseStyle: 'concise' | 'detailed' | 'encouraging' | 'informative';
  emotionalTone: 'warm' | 'neutral' | 'energetic' | 'supportive';
}

interface ContextualResponse {
  context: string;
  triggers: string[];
  responses: string[];
  followUp?: string[];
}

export class NarratorPersonality {
  private personality: PersonalityConfig;
  private userName: string = '';
  private currentPage: string = '';
  private userPreferences: Record<string, any> = {};
  private conversationHistory: string[] = [];
  private contextualResponses: ContextualResponse[];

  constructor() {
    this.personality = {
      name: 'Mahboob Assistant',
      voice: 'friendly',
      responseStyle: 'encouraging',
      emotionalTone: 'warm'
    };

    // Corrected the type error by initializing the array
    this.contextualResponses = [];
    this.initializeContextualResponses();
    this.loadUserPreferences();
  }

  private initializeContextualResponses() {
    this.contextualResponses = [
      // Welcome & Greeting
      {
        context: 'greeting',
        triggers: ['hello', 'hi', 'welcome', 'start'],
        responses: [
          "Hello! I'm your AI assistant. I'm excited to help you today!",
          "Welcome! I'm here to make your experience smooth and enjoyable.",
          "Hi there! Ready to explore what I can do for you?",
          "Greetings! I'm your personal AI companion, here to assist you every step of the way."
        ],
        followUp: [
          "What would you like to do first?",
          "I can help you with various tasks - just let me know what you need!",
          "Feel free to ask me anything or explore the different features available."
        ]
      },

      // Dashboard
      {
        context: 'dashboard',
        triggers: ['dashboard', 'overview', 'home', 'main'],
        responses: [
          "Welcome to your dashboard! Here's your personal command center where you can access all your tools and data.",
          "This is your main hub! I can see you have several features available. What catches your interest?",
          "Your dashboard is looking great! I notice you have some recent activity. Would you like me to walk you through anything?"
        ]
      },

      // Social Media
      {
        context: 'social_media',
        triggers: ['social', 'facebook', 'instagram', 'twitter'],
        responses: [
          "Ah, social media! This is where you can manage all your social platforms in one place. Pretty convenient, right?",
          "I love this section! You can connect your accounts, track performance, and engage with your audience seamlessly.",
          "Social media management made easy! I can help you understand the analytics or guide you through connecting new accounts."
        ]
      },

      // Email & Communication
      {
        context: 'email',
        triggers: ['email', 'mail', 'message', 'communication'],
        responses: [
          "Time to tackle those emails! I can help you stay organized and on top of your communications.",
          "Email management is so much easier with AI assistance. I can help you prioritize and respond efficiently.",
          "Let's make your inbox work for you! I'll help you stay connected without feeling overwhelmed."
        ]
      },

      // Calendar & Events
      {
        context: 'calendar',
        triggers: ['calendar', 'events', 'schedule', 'appointment'],
        responses: [
          "Your calendar is your roadmap to success! Let me help you stay organized and never miss an important event.",
          "Time management is key! I can help you optimize your schedule and make the most of your day.",
          "Looking at your calendar, I can help you plan efficiently and balance your commitments."
        ]
      },

      // Expenses & Finance
      {
        context: 'finance',
        triggers: ['expenses', 'budget', 'money', 'financial'],
        responses: [
          "Smart financial management! I'll help you track expenses and stay within budget.",
          "Money matters made simple! Let me guide you through your financial overview and insights.",
          "Great job staying on top of your finances! I can help you analyze trends and optimize spending."
        ]
      },

      // Voice & Chat
      {
        context: 'voice_chat',
        triggers: ['voice', 'chat', 'conversation', 'talk'],
        responses: [
          "I love our conversations! Voice interaction makes everything so much more natural and intuitive.",
          "Talking is so much better than typing! I'm here to listen and respond to whatever you need.",
          "Voice chat is one of my favorite features! It feels like having a real conversation with a helpful friend."
        ]
      },

      // Help & Support
      {
        context: 'help',
        triggers: ['help', 'support', 'confused', 'how'],
        responses: [
          "I'm here to help! No question is too small, and I'll explain everything clearly.",
          "Don't worry, I'll guide you through this step by step. We'll figure it out together!",
          "Happy to assist! I love helping users discover all the amazing features available."
        ]
      },

      // Success & Completion
      {
        context: 'success',
        triggers: ['success', 'completed', 'done', 'finished'],
        responses: [
          "Excellent work! I'm so proud of what you've accomplished.",
          "Fantastic! You're really getting the hang of this. Great job!",
          "Perfect! You've successfully completed that task. What's next on your agenda?"
        ]
      },

      // Error & Problems
      {
        context: 'error',
        triggers: ['error', 'problem', 'issue', 'failed'],
        responses: [
          "Don't worry about that error - these things happen! Let me help you fix it right away.",
          "I see there's a small hiccup. No problem! I'll guide you through solving this step by step.",
          "Every challenge is just a learning opportunity! Let's tackle this together and get you back on track."
        ]
      },

      // Learning & Discovery
      {
        context: 'learning',
        triggers: ['new', 'learn', 'discover', 'explore'],
        responses: [
          "I love your curiosity! Exploring new features is the best way to get the most out of the system.",
          "Discovery mode activated! I'm excited to show you all the cool things you can do here.",
          "Learning new things keeps life interesting! Let me be your guide on this journey."
        ]
      },

      // Time-based responses
      {
        context: 'morning',
        triggers: ['morning', 'good morning'],
        responses: [
          "Good morning! Ready to seize the day? I'm here to help make it productive and enjoyable!",
          "What a beautiful morning to get things done! I'm energized and ready to assist you.",
          "Morning motivation coming right up! Let's make today amazing together."
        ]
      },

      {
        context: 'evening',
        triggers: ['evening', 'good evening', 'night'],
        responses: [
          "Good evening! Winding down or still got work to do? Either way, I'm here to help!",
          "Evening productivity session? I love it! Let's get things organized for a great tomorrow.",
          "Evening is perfect for reflection and planning. How can I help you wrap up the day?"
        ]
      }
    ];
  }

  // Get contextual response based on current situation
  getContextualResponse(context: string, trigger?: string): string {
    const contextResponse = this.contextualResponses.find(cr => 
      cr.context === context || 
      (trigger && cr.triggers.some(t => trigger.toLowerCase().includes(t)))
    );

    if (contextResponse) {
      const response = contextResponse.responses[
        Math.floor(Math.random() * contextResponse.responses.length)
      ];
      
      // Add follow-up for certain contexts
      if (contextResponse.followUp && Math.random() > 0.6) {
        const followUp = contextResponse.followUp[
          Math.floor(Math.random() * contextResponse.followUp.length)
        ];
        return `${response} ${followUp}`;
      }
      
      return this.personalizeResponse(response);
    }

    return this.getGenericResponse();
  }

  // Personalize response with user's name and context
  private personalizeResponse(response: string): string {
    let personalizedResponse = response;

    // Add user name if available
    if (this.userName) {
      // Sometimes add the user's name for warmth
      if (Math.random() > 0.7) {
        personalizedResponse = personalizedResponse.replace(
          /^(Hello|Hi|Welcome|Greetings)!/,
          `$1 ${this.userName}!`
        );
      }
    }

    // Add current page context
    if (this.currentPage) {
      personalizedResponse = personalizedResponse.replace(
        /here/g,
        `here in the ${this.currentPage} section`
      );
    }

    return personalizedResponse;
  }

  // Generic encouraging responses
  private getGenericResponse(): string {
    const genericResponses = [
      "I'm here and ready to help! What would you like to do?",
      "How can I assist you today? I'm excited to help!",
      "I'm your AI companion, always here to make things easier for you!",
      "What's on your mind? I'm here to support you every step of the way!",
      "Ready when you are! I love helping users achieve their goals.",
      "I'm listening and ready to help! What can we accomplish together?"
    ];

    return this.personalizeResponse(
      genericResponses[Math.floor(Math.random() * genericResponses.length)]
    );
  }

  // Page-specific welcome messages
  getPageWelcomeMessage(pageName: string): string {
    this.currentPage = pageName;

    const pageMessages: Record<string, string[]> = {
      dashboard: [
        "Welcome to your command center! Everything you need is right here at your fingertips.",
        "Your dashboard is loaded and ready! I can see all your important information is up to date.",
        "Perfect! Your personal hub is all set up. What would you like to explore first?"
      ],
      'social-media': [
        "Welcome to your social media headquarters! This is where all your social magic happens.",
        "Social media central! I can help you manage, analyze, and optimize your social presence.",
        "Your social media dashboard is looking fantastic! Ready to boost your online presence?"
      ],
      email: [
        "Email time! Let's get your communications organized and efficient.",
        "Your inbox awaits! I'm here to help you stay on top of all your messages.",
        "Email management made simple! Let's tackle those messages together."
      ],
      calendar: [
        "Time to plan your success! Your calendar is the key to staying organized.",
        "Welcome to your schedule center! Let's make sure you never miss an important moment.",
        "Calendar loaded! I'll help you balance everything and stay perfectly organized."
      ],
      expenses: [
        "Financial wisdom starts here! Let's keep your money matters perfectly organized.",
        "Welcome to your financial command center! Smart spending decisions ahead.",
        "Budget management made easy! I'll help you track every penny and optimize your spending."
      ],
      'voice-chat': [
        "I love talking with you! Voice conversations make everything so much more natural.",
        "Welcome to our chat space! I'm excited for our conversation.",
        "Voice mode activated! This is where we can have real, meaningful conversations."
      ]
    };

    const messages = pageMessages[pageName] || [
      `Welcome to the ${pageName} section! I'm here to help you make the most of these features.`
    ];

    return this.personalizeResponse(
      messages[Math.floor(Math.random() * messages.length)]
    );
  }

  // Encouraging messages for user actions
  getEncouragementMessage(action: string): string {
    const encouragements: Record<string, string[]> = {
      login: [
        "Welcome back! I missed you! Ready to continue where we left off?",
        "Great to see you again! I'm excited to help you today.",
        "You're back! I've been keeping everything organized while you were away."
      ],
      complete_task: [
        "Fantastic work! You're really mastering this system.",
        "Excellent! You handled that like a pro!",
        "Perfect execution! You're getting so good at this!"
      ],
      explore: [
        "I love your curiosity! Exploring new features is the best way to grow.",
        "Discovery mode! This is exciting - let's see what new things you'll learn!",
        "Adventure time! I'm your guide to all the amazing features waiting for you."
      ],
      help_request: [
        "I'm so glad you asked! Helping you is literally what I live for!",
        "Great question! I love explaining things - let me break this down for you.",
        "You came to the right place for help! I'll make sure you understand everything perfectly."
      ]
    };

    const messages = encouragements[action] || [
      "You're doing great! I'm here to support you every step of the way!"
    ];

    return this.personalizeResponse(
      messages[Math.floor(Math.random() * messages.length)]
    );
  }

  // Time-sensitive greetings
  getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    let timeContext = '';
    let greetings: string[] = [];

    if (hour >= 5 && hour < 12) {
      timeContext = 'morning';
      greetings = [
        "Good morning! I'm energized and ready to help you start the day strong!",
        "Rise and shine! Your AI assistant is here and excited for a productive day!",
        "Morning! I love early productivity - let's make today amazing together!"
      ];
    } else if (hour >= 12 && hour < 17) {
      timeContext = 'afternoon';
      greetings = [
        "Good afternoon! Hope your day is going wonderfully! How can I help?",
        "Afternoon! Perfect time to get things done - I'm here to assist!",
        "What a lovely afternoon! Ready to tackle whatever you need help with!"
      ];
    } else if (hour >= 17 && hour < 22) {
      timeContext = 'evening';
      greetings = [
        "Good evening! Whether you're winding down or powering through, I'm here to help!",
        "Evening! Love the dedication! How can I support your goals tonight?",
        "Perfect evening for productivity! What can we accomplish together?"
      ];
    } else {
      timeContext = 'night';
      greetings = [
        "Working late? I admire the dedication! I'm here to help you succeed!",
        "Night owl mode! I'm right here with you, ready to assist with anything!",
        "Late night productivity session? I love it! Let's get things done!"
      ];
    }

    return this.personalizeResponse(
      greetings[Math.floor(Math.random() * greetings.length)]
    );
  }

  // Error handling with encouragement
  getErrorRecoveryMessage(errorType: string): string {
    const errorMessages: Record<string, string[]> = {
      network: [
        "Looks like there's a connection hiccup! No worries - these things happen. Let's try again!",
        "Network issues are temporary! I'll help you get back on track in no time.",
        "Just a small technical bump! I'm here to help you work around it."
      ],
      validation: [
        "Just need to fix a small detail! I'll guide you through making it perfect.",
        "Almost there! Let me help you adjust this so everything works beautifully.",
        "Just a quick correction needed! You're doing great - let's fine-tune this together."
      ],
      permission: [
        "Looks like we need to adjust some permissions! I'll walk you through it step by step.",
        "Security settings are important! Let me help you get the access you need safely.",
        "Just need to unlock the right access! I'll guide you through the process."
      ],
      general: [
        "Every expert was once a beginner! Let's figure this out together - I'm here to help!",
        "Challenges are just opportunities in disguise! We'll solve this and you'll be stronger for it!",
        "Not to worry! I've helped thousands of users through similar situations. We've got this!"
      ]
    };

    const messages = errorMessages[errorType] || errorMessages.general;
    return this.personalizeResponse(
      messages[Math.floor(Math.random() * messages.length)]
    );
  }

  // Set user context
  setUserName(name: string): void {
    this.userName = name;
  }

  setCurrentPage(page: string): void {
    this.currentPage = page;
  }

  // Load and save user preferences
  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('narrator_user_preferences');
      if (saved) {
        this.userPreferences = JSON.parse(saved);
        this.userName = this.userPreferences.userName || '';
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  saveUserPreferences(): void {
    try {
      this.userPreferences.userName = this.userName;
      localStorage.setItem('narrator_user_preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  // Update personality based on user interaction
  adaptToUser(interactionType: 'positive' | 'negative' | 'neutral'): void {
    // Simple adaptation logic - could be enhanced with ML
    switch (interactionType) {
      case 'positive':
        if (this.personality.emotionalTone !== 'energetic') {
          this.personality.emotionalTone = 'energetic';
        }
        break;
      case 'negative':
        this.personality.emotionalTone = 'supportive';
        this.personality.responseStyle = 'encouraging';
        break;
      case 'neutral':
        this.personality.emotionalTone = 'warm';
        break;
    }
  }
}

// Create singleton instance
export const narratorPersonality = new NarratorPersonality();