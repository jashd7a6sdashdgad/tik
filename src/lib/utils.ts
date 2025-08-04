import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function parseNaturalLanguageDate(input: string): Date | null {
  const now = new Date();
  const lowercaseInput = input.toLowerCase();

  // Handle "today"
  if (lowercaseInput.includes('today')) {
    return now;
  }

  // Handle "tomorrow"
  if (lowercaseInput.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }

  // Handle "next [day]"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextDayMatch = lowercaseInput.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const currentDay = now.getDay();
    const daysUntilTarget = ((targetDay - currentDay + 7) % 7) || 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    return targetDate;
  }

  // Handle specific dates (basic MM/DD/YYYY or MM-DD-YYYY)
  const dateMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return null;
}

export function parseNaturalLanguageTime(input: string): { hour: number; minute: number } | null {
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || '0');
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    return { hour, minute };
  }

  return null;
}

export function extractEntitiesFromText(text: string): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Extract emails
  const emailMatch = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g);
  if (emailMatch) {
    entities.emails = emailMatch;
  }

  // Extract phone numbers
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (phoneMatch) {
    entities.phones = phoneMatch;
  }

  // Extract amounts
  const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/g);
  if (amountMatch) {
    entities.amounts = amountMatch.map(a => parseFloat(a.replace('$', '')));
  }

  return entities;
}