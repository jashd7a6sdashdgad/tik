// User and Authentication types
export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

// Google APIs types
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface Contact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

// Sheets data types
export interface ShoppingItem {
  id?: string;
  name: string;
  quantity: number;
  price?: number;
  category?: string;
  purchased?: boolean;
}

export interface Expense {
  id?: string;
  from?: string;
  date: string;
  creditAmount?: number;
  debitAmount?: number;
  amount?: number; // Keep for backward compatibility
  category: string;
  description: string;
  availableBalance?: number;
}

export interface DiaryEntry {
  id?: string;
  date: string;
  content: string;
  mood?: 'happy' | 'sad' | 'neutral' | 'excited' | 'anxious';
  tags?: string[];
}

export interface HotelExpense {
  id?: string;
  date: string;
  hotel: string;
  amount: number;
  category: string;
  receipt?: string;
  businessPurpose?: string;
}

// Dashboard types
export interface DashboardData {
  todayEvents: CalendarEvent[];
  unreadEmails: number;
  todayExpenses: Expense[];
  weather?: WeatherData;
  quickActions: QuickAction[];
  allEvents?: CalendarEvent[];
  allExpenses?: Expense[];
  totalEmails?: number;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity?: number;
  windSpeed?: number;
  feelsLike?: number;
  icon?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon: string;
}

// Voice and AI types
export interface VoiceCommand {
  command: string;
  intent: string;
  entities?: Record<string, any>;
}

export interface AIResponse {
  message: string;
  action?: string;
  data?: any;
}

// MCP types
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  url?: string;
  category: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component Props types
export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}