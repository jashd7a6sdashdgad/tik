// Voice Command Processing System for AI Assistant

import { narratorPersonality } from './narratorPersonality';
import { narratorSpeak } from './voiceNarrator';

export interface VoiceCommandResult {
  action: string;
  response: string;
  confidence: number;
  shouldSpeak: boolean;
  data?: any;
}

export interface CommandPattern {
  pattern: RegExp;
  action: string;
  handler: (matches: RegExpMatchArray, fullTranscript: string) => VoiceCommandResult;
  examples: string[];
  description: string;
}

export class VoiceCommandProcessor {
  private commandPatterns: CommandPattern[] = [];
  private conversationContext: string[] = [];
  private maxContextHistory = 5;

  constructor() {
    this.initializeCommandPatterns();
  }

  private initializeCommandPatterns(): void {
    this.commandPatterns = [
      // Greetings and basic interactions
      {
        pattern: /^(hello|hi|hey|good morning|good afternoon|good evening|greetings)/i,
        action: 'greeting',
        handler: (_matches, _transcript) => ({
          action: 'greeting',
          response: this.getGreetingResponse(),
          confidence: 0.9,
          shouldSpeak: true
        }),
        examples: ['Hello', 'Hi there', 'Good morning'],
        description: 'Respond to greetings'
      },

      // Navigation commands
      {
        pattern: /^(go to|navigate to|open|show me) (dashboard|social media|email|calendar|expenses|photos|contacts|settings|diary|budget)/i,
        action: 'navigate',
        handler: (matches, _transcript) => {
          const destination = matches[2].toLowerCase().replace(' ', '-');
          return {
            action: 'navigate',
            response: `Navigating to ${matches[2]}. Let me take you there!`,
            confidence: 0.85,
            shouldSpeak: true,
            data: { destination }
          };
        },
        examples: ['Go to dashboard', 'Open social media', 'Show me calendar'],
        description: 'Navigate to different sections'
      },

      // Status and information requests
      {
        pattern: /^(what|how|tell me|show me).*(status|today|schedule|tasks|emails|messages)/i,
        action: 'status_inquiry',
        handler: (_matches, transcript) => ({
          action: 'status_inquiry',
          response: this.getStatusResponse(transcript),
          confidence: 0.8,
          shouldSpeak: true
        }),
        examples: ['What\'s my status today?', 'Show me my schedule', 'How many emails do I have?'],
        description: 'Provide status information'
      },

      // Help and assistance
      {
        pattern: /^(help|how do i|can you help|assist|guide me)/i,
        action: 'help',
        handler: (_matches, transcript) => ({
          action: 'help',
          response: this.getHelpResponse(transcript),
          confidence: 0.9,
          shouldSpeak: true
        }),
        examples: ['Help me', 'How do I use this?', 'Can you guide me?'],
        description: 'Provide help and guidance'
      },

      // Voice control commands
      {
        pattern: /^(stop talking|be quiet|silence|mute|pause)/i,
        action: 'stop_speech',
        handler: (_matches, _transcript) => ({
          action: 'stop_speech',
          response: 'I\'ll be quiet now. Just say "start talking" when you need me again.',
          confidence: 0.95,
          shouldSpeak: true
        }),
        examples: ['Stop talking', 'Be quiet', 'Silence'],
        description: 'Stop the narrator from speaking'
      },

      {
        pattern: /^(start talking|speak|unmute|resume)/i,
        action: 'resume_speech',
        handler: (_matches, _transcript) => ({
          action: 'resume_speech',
          response: 'I\'m back! How can I help you?',
          confidence: 0.95,
          shouldSpeak: true
        }),
        examples: ['Start talking', 'Speak', 'Resume'],
        description: 'Resume narrator speech'
      },

      // Social media commands
      {
        pattern: /^(post|share|update).*(facebook|instagram|twitter|social)/i,
        action: 'social_media',
        handler: (_matches, _transcript) => ({
          action: 'social_media',
          response: 'I can help you with social media management. Let me open the social media section for you.',
          confidence: 0.8,
          shouldSpeak: true,
          data: { destination: 'social-media' }
        }),
        examples: ['Post on Facebook', 'Share on Instagram', 'Update social media'],
        description: 'Handle social media actions'
      },

      // Email commands
      {
        pattern: /^(send email|compose|write email|email)/i,
        action: 'email',
        handler: (_matches, _transcript) => ({
          action: 'email',
          response: 'Opening your email center. You can compose and manage emails here.',
          confidence: 0.8,
          shouldSpeak: true,
          data: { destination: 'email' }
        }),
        examples: ['Send email', 'Compose email', 'Check emails'],
        description: 'Handle email actions'
      },

      // Calendar and scheduling
      {
        pattern: /^(schedule|calendar|appointment|meeting|remind me)/i,
        action: 'calendar',
        handler: (_matches, _transcript) => ({
          action: 'calendar',
          response: 'Let me open your calendar to help you manage your schedule.',
          confidence: 0.8,
          shouldSpeak: true,
          data: { destination: 'calendar' }
        }),
        examples: ['Schedule meeting', 'Check calendar', 'Set reminder'],
        description: 'Handle calendar and scheduling'
      },

      // Expenses and finance
      {
        pattern: /^(expense|budget|money|financial|spending|cost)/i,
        action: 'finance',
        handler: (_matches, _transcript) => ({
          action: 'finance',
          response: 'Opening your financial management section. I\'ll help you track expenses and manage your budget.',
          confidence: 0.8,
          shouldSpeak: true,
          data: { destination: 'expenses' }
        }),
        examples: ['Track expenses', 'Check budget', 'Add expense'],
        description: 'Handle financial management'
      },

      // Compliments and positive feedback
      {
        pattern: /^(thank you|thanks|good job|well done|excellent|great|awesome|perfect)/i,
        action: 'positive_feedback',
        handler: (_matches, _transcript) => ({
          action: 'positive_feedback',
          response: this.getPositiveFeedbackResponse(),
          confidence: 0.9,
          shouldSpeak: true
        }),
        examples: ['Thank you', 'Good job', 'Excellent work'],
        description: 'Respond to positive feedback'
      },

      // Questions about capabilities
      {
        pattern: /^(what can you do|your capabilities|features|abilities)/i,
        action: 'capabilities',
        handler: (_matches, _transcript) => ({
          action: 'capabilities',
          response: this.getCapabilitiesResponse(),
          confidence: 0.9,
          shouldSpeak: true
        }),
        examples: ['What can you do?', 'Tell me your capabilities', 'What features do you have?'],
        description: 'Explain assistant capabilities'
      },

      // Enhanced Calendar Scheduling Commands
      {
        pattern: /^(book|schedule|add|create|plan).*(gym|workout|exercise|fitness|yoga|run|training).*(every|daily|weekly).*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|week)/i,
        action: 'schedule_recurring_activity',
        handler: (_matches, transcript) => {
          return {
            action: 'schedule_recurring_activity',
            response: this.getRecurringScheduleResponse(transcript),
            confidence: 0.9,
            shouldSpeak: true,
            data: { 
              transcript,
              type: 'fitness',
              recurring: true
            }
          };
        },
        examples: ['Book 1 hour for gym every Tuesday', 'Schedule workout every Monday at 6 PM', 'Add yoga session every Wednesday'],
        description: 'Schedule recurring fitness activities'
      },

      {
        pattern: /^(book|schedule|add|create|plan).*(meeting|call|appointment|interview|presentation).*(every|daily|weekly).*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|week)/i,
        action: 'schedule_recurring_meeting',
        handler: (_matches, transcript) => {
          return {
            action: 'schedule_recurring_meeting',
            response: this.getRecurringScheduleResponse(transcript),
            confidence: 0.9,
            shouldSpeak: true,
            data: { 
              transcript,
              type: 'meeting',
              recurring: true
            }
          };
        },
        examples: ['Schedule team meeting every Friday at 10 AM', 'Book status call every Monday', 'Add weekly review every Thursday'],
        description: 'Schedule recurring meetings and calls'
      },

      {
        pattern: /^(book|schedule|add|create|plan).*(for|at).*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week)/i,
        action: 'schedule_event',
        handler: (_matches, transcript) => {
          return {
            action: 'schedule_event',
            response: this.getScheduleResponse(transcript),
            confidence: 0.85,
            shouldSpeak: true,
            data: { 
              transcript,
              recurring: false
            }
          };
        },
        examples: ['Book dentist appointment tomorrow at 3 PM', 'Schedule lunch meeting today', 'Add gym session this Friday'],
        description: 'Schedule one-time events'
      },

      {
        pattern: /^(check|find|look for|show me).*(conflicts|available|free time|schedule|calendar)/i,
        action: 'check_conflicts',
        handler: (_matches, transcript) => {
          return {
            action: 'check_conflicts',
            response: 'Let me check your calendar for conflicts and available time slots.',
            confidence: 0.9,
            shouldSpeak: true,
            data: { transcript }
          };
        },
        examples: ['Check for conflicts', 'Find available time', 'Show me free time slots'],
        description: 'Check calendar conflicts and availability'
      },

      {
        pattern: /^(prepare|get ready|setup).*(meeting|call|appointment|interview)/i,
        action: 'prepare_meeting',
        handler: (_matches, transcript) => {
          return {
            action: 'prepare_meeting',
            response: 'I\'ll help you prepare for your upcoming meeting by gathering relevant emails and documents.',
            confidence: 0.85,
            shouldSpeak: true,
            data: { transcript }
          };
        },
        examples: ['Prepare for meeting', 'Get ready for call', 'Setup for interview'],
        description: 'Prepare for upcoming meetings'
      },

      // General conversation and questions
      {
        pattern: /^(.*)/i,
        action: 'general_conversation',
        handler: (_matches, transcript) => ({
          action: 'general_conversation',
          response: this.getConversationalResponse(transcript),
          confidence: 0.6,
          shouldSpeak: true
        }),
        examples: ['How are you?', 'Tell me a joke', 'What do you think?'],
        description: 'Handle general conversation'
      }
    ];
  }

  processCommand(transcript: string, confidence: number = 1.0): VoiceCommandResult | null {
    if (!transcript || transcript.trim().length === 0) {
      return null;
    }

    const cleanTranscript = transcript.trim();
    
    // Add to conversation context
    this.addToContext(cleanTranscript);

    // Find matching command pattern
    for (const pattern of this.commandPatterns) {
      const matches = cleanTranscript.match(pattern.pattern);
      if (matches) {
        const result = pattern.handler(matches, cleanTranscript);
        result.confidence *= confidence; // Adjust by recognition confidence
        return result;
      }
    }

    // If no pattern matches, treat as general conversation
    return {
      action: 'unknown',
      response: this.getUnknownCommandResponse(cleanTranscript),
      confidence: 0.3,
      shouldSpeak: true
    };
  }

  private addToContext(transcript: string): void {
    this.conversationContext.push(transcript);
    if (this.conversationContext.length > this.maxContextHistory) {
      this.conversationContext.shift();
    }
  }

  private getGreetingResponse(): string {
    return narratorPersonality.getTimeBasedGreeting();
  }

  private getStatusResponse(transcript: string): string {
    const responses = [
      "I can see you're looking for status information! While I don't have access to your real-time data yet, I can help you navigate to the relevant sections.",
      "Your personal assistant is ready to help! I can guide you to check your emails, calendar, and other important information.",
      "Everything looks good from here! Let me know what specific information you'd like to access and I'll help you find it."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getHelpResponse(transcript: string): string {
    const helpResponses = [
      "I'm here to help! You can ask me to navigate to different sections, check your information, or just have a conversation. Try saying things like 'go to dashboard' or 'show me my calendar'.",
      "I'd love to assist you! I can help you navigate the site, explain features, or answer questions. What would you like to know more about?",
      "Great question! I can help you with navigation, provide information about different sections, or just chat with you. What can I help you with today?"
    ];
    return helpResponses[Math.floor(Math.random() * helpResponses.length)];
  }

  private getPositiveFeedbackResponse(): string {
    const responses = [
      "You're very welcome! I'm so happy I could help you.",
      "Thank you for the kind words! It makes me excited to assist you even more.",
      "That means a lot to me! I'm here whenever you need assistance.",
      "I appreciate your feedback! Your success makes my day brighter."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getCapabilitiesResponse(): string {
    return "I'm your AI voice assistant! I can help you navigate through different sections like dashboard, social media, email, and calendar. I can respond to your voice commands, provide information, and have conversations with you. Just speak naturally and I'll do my best to understand and help!";
  }

  private getConversationalResponse(transcript: string): string {
    // Use narrator personality for contextual responses
    return narratorPersonality.getContextualResponse('learning', transcript);
  }

  private getRecurringScheduleResponse(transcript: string): string {
    const responses = [
      "Perfect! I'll help you set up that recurring schedule. Let me process the details and create this recurring event for you.",
      "Great idea to stay consistent! I'm setting up your recurring schedule now with smart conflict detection.",
      "I love helping with routine planning! I'll create this recurring event and make sure it doesn't conflict with your existing schedule.",
      "Excellent planning ahead! Let me set up this recurring schedule and I'll check for any potential conflicts."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getScheduleResponse(transcript: string): string {
    const responses = [
      "I'll schedule that right away! Let me check for conflicts and find the perfect time slot for you.",
      "Consider it done! I'm processing your scheduling request and will auto-add travel time if needed.",
      "Great! I'm setting up your appointment and will prepare any relevant meeting materials.",
      "Perfect timing! Let me schedule that for you and I'll make sure everything is prepared in advance."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getUnknownCommandResponse(transcript: string): string {
    const responses = [
      "I'm not sure I understood that completely, but I'm here to help! Could you try rephrasing, or ask me what I can do?",
      "That's interesting! I'm still learning, so could you help me understand what you'd like me to do?",
      "I want to help, but I didn't quite catch that. Try asking me about navigation, status, or just say 'help' for more options.",
      "I'm listening and learning! Could you try asking in a different way, or tell me what section you'd like to visit?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Get available commands for help
  getAvailableCommands(): CommandPattern[] {
    return this.commandPatterns.filter(pattern => pattern.action !== 'general_conversation');
  }

  // Get conversation context
  getContext(): string[] {
    return [...this.conversationContext];
  }

  // Clear conversation context
  clearContext(): void {
    this.conversationContext = [];
  }

  // Execute command result actions
  async executeCommandAction(result: VoiceCommandResult): Promise<void> {
    // Handle navigation
    if (result.action === 'navigate' || (result.data && result.data.destination)) {
      const destination = result.data?.destination;
      if (destination) {
        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('voice:navigate', { 
          detail: { destination } 
        }));
      }
    }

    // Handle speech control
    if (result.action === 'stop_speech') {
      window.dispatchEvent(new CustomEvent('voice:disable_narrator'));
    } else if (result.action === 'resume_speech') {
      window.dispatchEvent(new CustomEvent('voice:enable_narrator'));
    }

    // Speak the response if needed
    if (result.shouldSpeak && result.response) {
      await narratorSpeak(result.response, 'response', 'medium');
    }
  }
}

// Create singleton instance
export const voiceCommandProcessor = new VoiceCommandProcessor();