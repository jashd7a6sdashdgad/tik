// Google Sheets Configuration
// Single spreadsheet with multiple sheet tabs

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

export interface SheetConfig {
  name: string;
  range: string;
  columns: string[];
  description: string;
}

export const SHEETS_CONFIG: Record<string, SheetConfig> = {
  expenses: {
    name: 'Expenses',
    range: 'Expenses!A:H',
    columns: ['From', 'Date', 'Credit Amount', 'Debit Amount', 'Category', 'Description', 'Available Balance', 'ID'],
    description: 'Track daily expenses and spending with credit/debit amounts'
  },
  shoppingList: {
    name: 'Shopping List',
    range: 'Shopping List!A:F',
    columns: ['Name', 'Quantity', 'Price', 'Category', 'Purchased', 'Date'],
    description: 'Manage shopping items and grocery lists'
  },
  contacts: {
    name: 'Contacts',
    range: 'Contacts!A:F',
    columns: ['Name', 'Email', 'Phone', 'Company', 'Notes', 'Date Added'],
    description: 'Store and manage contact information'
  },
  hotelExpenses: {
    name: 'Hotel Expenses',
    range: 'Hotel Expenses!A:H',
    columns: ['Date', 'Hotel Name', 'Room Type', 'Nights', 'Amount', 'City', 'Notes', 'Receipt'],
    description: 'Track hotel stays and accommodation costs'
  },
  diary: {
    name: 'Diary',
    range: 'Diary!A:E',
    columns: ['Date', 'Content', 'Mood', 'Tags', 'DateTime'],
    description: 'Personal diary entries and reflections'
  },
  budget: {
    name: 'Budget',
    range: 'Budget!A:F',
    columns: ['Category', 'Budget Amount', 'Spent Amount', 'Month', 'Year', 'Description'],
    description: 'Monthly budget tracking and planning'
  }
};

// Helper function to get sheet configuration
export function getSheetConfig(sheetKey: string): SheetConfig {
  const config = SHEETS_CONFIG[sheetKey];
  if (!config) {
    throw new Error(`Sheet configuration not found for: ${sheetKey}`);
  }
  return config;
}

// Helper function to get all sheet names
export function getAllSheetNames(): string[] {
  return Object.values(SHEETS_CONFIG).map(config => config.name);
}

// Helper function to validate spreadsheet structure
export function validateSpreadsheetStructure() {
  const requiredSheets = Object.values(SHEETS_CONFIG).map(config => config.name);
  return {
    spreadsheetId: SPREADSHEET_ID,
    requiredSheets,
    totalSheets: requiredSheets.length
  };
}

// Sheet-specific helper functions
export const SheetHelpers = {
  expenses: {
    getRange: () => SHEETS_CONFIG.expenses.range,
    getHeaders: () => SHEETS_CONFIG.expenses.columns,
    formatRow: (data: any) => [
      data.from || '',
      data.date || new Date().toISOString().split('T')[0],
      data.creditAmount?.toString() || '',
      data.debitAmount?.toString() || '',
      data.category || 'General',
      data.description || '',
      data.availableBalance?.toString() || '',
      data.id || ''
    ]
  },
  
  shoppingList: {
    getRange: () => SHEETS_CONFIG.shoppingList.range,
    getHeaders: () => SHEETS_CONFIG.shoppingList.columns,
    formatRow: (data: any) => [
      data.name || '',
      data.quantity?.toString() || '1',
      data.price?.toString() || '0',
      data.category || 'General',
      data.purchased ? 'TRUE' : 'FALSE',
      data.date || new Date().toISOString().split('T')[0]
    ]
  },
  
  contacts: {
    getRange: () => SHEETS_CONFIG.contacts.range,
    getHeaders: () => SHEETS_CONFIG.contacts.columns,
    formatRow: (data: any) => [
      data.name || '',
      data.email || '',
      data.phone || '',
      data.company || '',
      data.notes || '',
      data.dateAdded || new Date().toISOString().split('T')[0]
    ]
  },
  
  hotelExpenses: {
    getRange: () => SHEETS_CONFIG.hotelExpenses.range,
    getHeaders: () => SHEETS_CONFIG.hotelExpenses.columns,
    formatRow: (data: any) => [
      data.date || new Date().toISOString().split('T')[0],
      data.hotelName || '',
      data.roomType || '',
      data.nights?.toString() || '1',
      data.amount?.toString() || '0',
      data.city || '',
      data.notes || '',
      data.receipt || ''
    ]
  },
  
  diary: {
    getRange: () => SHEETS_CONFIG.diary.range,
    getHeaders: () => SHEETS_CONFIG.diary.columns,
    formatRow: (data: any) => [
      data.date || new Date().toISOString().split('T')[0],
      data.content || '',
      data.mood || '',
      data.tags || '',
      data.dateTime || new Date().toISOString()
    ]
  },
  
  budget: {
    getRange: () => SHEETS_CONFIG.budget.range,
    getHeaders: () => SHEETS_CONFIG.budget.columns,
    formatRow: (data: any) => [
      data.category || '',
      data.budgetAmount?.toString() || '0',
      data.spentAmount?.toString() || '0',
      data.month || '',
      data.year?.toString() || new Date().getFullYear().toString(),
      data.description || ''
    ]
  }
};

// Export legacy function for backward compatibility
export function getSheetsConfig() {
  return {
    expenses: { id: SPREADSHEET_ID },
    shoppingList: { id: SPREADSHEET_ID },
    contacts: { id: SPREADSHEET_ID },
    hotelExpenses: { id: SPREADSHEET_ID },
    diary: { id: SPREADSHEET_ID },
    budget: { id: SPREADSHEET_ID }
  };
}