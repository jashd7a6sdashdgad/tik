import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';
import { parseNaturalLanguageDate, parseNaturalLanguageTime, extractEntitiesFromText } from '@/lib/utils';

interface CommandResult {
  success: boolean;
  action?: string;
  parameters?: any;
  message: string;
  confidence?: number;
}

// Voice command patterns and their corresponding actions
const COMMAND_PATTERNS = [
  {
    pattern: /schedule\s+(.+?)\s+(?:on\s+|next\s+|tomorrow|today|this\s+)(.+?)(?:\s+at\s+(.+))?$/i,
    action: 'schedule_event',
    extract: (match: RegExpMatchArray) => ({
      title: match[1].trim(),
      dateText: match[2] + (match[3] ? ` at ${match[3]}` : ''),
      naturalLanguage: match[0]
    })
  },
  {
    pattern: /send\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about\s+|with\s+subject\s+)(.+?)(?:\s+saying\s+(.+))?$/i,
    action: 'send_email',
    extract: (match: RegExpMatchArray) => ({
      to: match[1].trim(),
      subject: match[2].trim(),
      body: match[3]?.trim() || `This is a message sent via voice command.`
    })
  },
  {
    pattern: /add\s+(?:a\s+)?(\d+(?:\.\d{1,3})?)\s+(?:omr\s+)?expense\s+(?:for\s+)?(.+)/i,
    action: 'add_expense',
    extract: (match: RegExpMatchArray) => ({
      debitAmount: parseFloat(match[1]),
      description: match[2].trim(),
      category: categorizeExpense(match[2].trim())
    })
  },
  {
    pattern: /add\s+(.+?)\s+to\s+(?:my\s+)?shopping\s+list/i,
    action: 'add_shopping_item',
    extract: (match: RegExpMatchArray) => {
      const item = match[1].trim();
      const entities = extractEntitiesFromText(item);
      return {
        name: item,
        quantity: entities.amounts?.[0] || 1,
        category: categorizeShoppingItem(item)
      };
    }
  },
  {
    pattern: /search\s+(?:the\s+web\s+)?(?:for\s+)?(.+)/i,
    action: 'search_web',
    extract: (match: RegExpMatchArray) => ({
      query: match[1].trim()
    })
  },
  {
    pattern: /(?:what(?:'s| is)\s+my\s+schedule|show\s+my\s+calendar)(?:\s+(?:for\s+)?(.+))?/i,
    action: 'get_schedule',
    extract: (match: RegExpMatchArray) => ({
      date: match[1]?.trim() || 'today'
    })
  },
  {
    pattern: /how\s+many\s+unread\s+emails/i,
    action: 'get_unread_emails',
    extract: () => ({})
  },
  {
    pattern: /write\s+(?:a\s+)?diary\s+entry\s+(.+)/i,
    action: 'add_diary_entry',
    extract: (match: RegExpMatchArray) => ({
      content: match[1].trim(),
      mood: extractMoodFromText(match[1])
    })
  },
  {
    pattern: /(?:hello|hi|hey)\s+(?:narrator|n)(?:\s+(.+))?/i,
    action: 'narrator_greet',
    extract: (match: RegExpMatchArray) => ({
      message: match[1]?.trim() || '',
      action: 'greet'
    })
  },
  {
    pattern: /(?:bye|goodbye|see you later)\s+(?:narrator|n)(?:\s+(.+))?/i,
    action: 'narrator_farewell',
    extract: (match: RegExpMatchArray) => ({
      message: match[1]?.trim() || '',
      action: 'farewell'
    })
  },
  {
    pattern: /narrator\s+(?:tell me|say|speak)(?:\s+(.+))?/i,
    action: 'narrator_speak',
    extract: (match: RegExpMatchArray) => ({
      request: match[1]?.trim() || 'about my day',
      action: 'speak'
    })
  },
  {
    pattern: /narrator\s+(?:help|assist|guide)\s*(?:me)?(?:\s+with\s+(.+))?/i,
    action: 'narrator_help',
    extract: (match: RegExpMatchArray) => ({
      topic: match[1]?.trim() || 'general',
      action: 'help'
    })
  },
  {
    pattern: /(?:show|get|view)\s+(?:my\s+)?(?:tracking|analytics|stats|statistics)(?:\s+(?:for\s+)?(.+))?/i,
    action: 'show_tracking',
    extract: (match: RegExpMatchArray) => ({
      timeRange: match[1]?.trim() || 'month'
    })
  },
  {
    pattern: /(?:what(?:'s| is)\s+my\s+(?:productivity|performance|stats|analytics))/i,
    action: 'show_tracking',
    extract: () => ({
      timeRange: 'month'
    })
  },
  {
    pattern: /(?:how\s+many|count\s+(?:my)?)\s+(events|emails|expenses|contacts)(?:\s+(?:do\s+i\s+have|this\s+(.+)))?/i,
    action: 'count_items',
    extract: (match: RegExpMatchArray) => ({
      itemType: match[1].toLowerCase(),
      timeRange: match[2]?.trim() || 'total'
    })
  }
];

function categorizeExpense(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('food') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('restaurant')) {
    return 'Food';
  } else if (desc.includes('gas') || desc.includes('fuel') || desc.includes('transport') || desc.includes('uber')) {
    return 'Transportation';
  } else if (desc.includes('office') || desc.includes('work') || desc.includes('business')) {
    return 'Business';
  } else if (desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy')) {
    return 'Medical';
  } else if (desc.includes('entertainment') || desc.includes('movie') || desc.includes('game')) {
    return 'Entertainment';
  }
  
  return 'General';
}

function categorizeShoppingItem(item: string): string {
  const itemLower = item.toLowerCase();
  
  if (itemLower.includes('milk') || itemLower.includes('bread') || itemLower.includes('egg') || 
      itemLower.includes('cheese') || itemLower.includes('meat') || itemLower.includes('fruit')) {
    return 'Groceries';
  } else if (itemLower.includes('soap') || itemLower.includes('shampoo') || itemLower.includes('toothpaste')) {
    return 'Personal Care';
  } else if (itemLower.includes('clean') || itemLower.includes('detergent') || itemLower.includes('paper')) {
    return 'Household';
  }
  
  return 'General';
}

function extractMoodFromText(text: string): string {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('happy') || textLower.includes('joy') || textLower.includes('great') || textLower.includes('amazing')) {
    return 'happy';
  } else if (textLower.includes('sad') || textLower.includes('down') || textLower.includes('upset')) {
    return 'sad';
  } else if (textLower.includes('excited') || textLower.includes('thrilled') || textLower.includes('pumped')) {
    return 'excited';
  } else if (textLower.includes('anxious') || textLower.includes('worried') || textLower.includes('nervous')) {
    return 'anxious';
  } else if (textLower.includes('grateful') || textLower.includes('thankful') || textLower.includes('blessed')) {
    return 'grateful';
  }
  
  return 'neutral';
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    const body = await request.json();
    const { command } = body;
    
    if (!command || typeof command !== 'string') {
      return NextResponse.json<CommandResult>({
        success: false,
        message: 'Voice command is required'
      }, { status: 400 });
    }
    
    const cleanCommand = command.trim().toLowerCase();
    
    // Try to match against known patterns
    for (const pattern of COMMAND_PATTERNS) {
      const match = cleanCommand.match(pattern.pattern);
      
      if (match) {
        const parameters = pattern.extract(match);
        
        return NextResponse.json<CommandResult>({
          success: true,
          action: pattern.action,
          parameters,
          message: `Understood: ${pattern.action.replace('_', ' ')}`,
          confidence: 0.9
        });
      }
    }
    
    // If no pattern matches, try to extract basic intent
    const basicIntent = extractBasicIntent(cleanCommand);
    
    if (basicIntent) {
      return NextResponse.json<CommandResult>({
        success: true,
        action: basicIntent.action,
        parameters: basicIntent.parameters,
        message: `I think you want to: ${basicIntent.action.replace('_', ' ')}`,
        confidence: 0.5
      });
    }
    
    // No understanding
    return NextResponse.json<CommandResult>({
      success: false,
      message: `I didn't understand: "${command}". Try commands like "schedule meeting tomorrow at 3 PM" or "add 10 OMR expense for lunch"`
    });
    
  } catch (error: any) {
    console.error('Voice command processing error:', error);
    
    return NextResponse.json<CommandResult>({
      success: false,
      message: error.message || 'Failed to process voice command'
    }, { status: 500 });
  }
}

function extractBasicIntent(command: string): { action: string; parameters: any } | null {
  // Basic keyword matching
  if (command.includes('schedule') || command.includes('meeting') || command.includes('appointment')) {
    return {
      action: 'schedule_event',
      parameters: { naturalLanguage: command }
    };
  }
  
  if (command.includes('email') || command.includes('send')) {
    return {
      action: 'send_email',
      parameters: { naturalLanguage: command }
    };
  }
  
  if (command.includes('expense') || command.includes('spent') || command.includes('bought')) {
    return {
      action: 'add_expense',
      parameters: { naturalLanguage: command }
    };
  }
  
  if (command.includes('shopping') || command.includes('buy') || command.includes('groceries')) {
    return {
      action: 'add_shopping_item',
      parameters: { naturalLanguage: command }
    };
  }
  
  if (command.includes('search') || command.includes('find') || command.includes('look up')) {
    return {
      action: 'search_web',
      parameters: { query: command.replace(/search|find|look up/g, '').trim() }
    };
  }
  
  if (command.includes('narrator') || command.includes('hello n') || command.includes('bye n')) {
    if (command.includes('hello') || command.includes('hi') || command.includes('hey')) {
      return {
        action: 'narrator_greet',
        parameters: { action: 'greet', message: '' }
      };
    } else if (command.includes('bye') || command.includes('goodbye')) {
      return {
        action: 'narrator_farewell',
        parameters: { action: 'farewell', message: '' }
      };
    } else {
      return {
        action: 'narrator_speak',
        parameters: { action: 'speak', request: 'about my day' }
      };
    }
  }
  
  return null;
}