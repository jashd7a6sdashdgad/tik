/**
 * Utility functions for Google Sheets integration
 */

/**
 * Extract Google Sheets ID from URL
 * Supports various Google Sheets URL formats:
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/SHEET_ID
 */
export function extractSheetIdFromUrl(url: string): string | null {
  try {
    // Handle direct sheet ID (backward compatibility)
    if (!url.includes('docs.google.com')) {
      return url;
    }

    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting sheet ID from URL:', error);
    return null;
  }
}

/**
 * Get Google Sheets configuration from environment variables
 */
export function getSheetsConfig() {
  return {
    shoppingList: {
      url: process.env.SHOPPING_LIST_SHEET_URL,
      id: extractSheetIdFromUrl(process.env.SHOPPING_LIST_SHEET_URL || ''),
    },
    expenses: {
      url: process.env.EXPENSES_SHEET_URL,
      id: extractSheetIdFromUrl(process.env.EXPENSES_SHEET_URL || ''),
    },
    contacts: {
      url: process.env.CONTACTS_SHEET_URL,
      id: extractSheetIdFromUrl(process.env.CONTACTS_SHEET_URL || ''),
    },
    hotelExpenses: {
      url: process.env.HOTEL_EXPENSES_SHEET_URL,
      id: extractSheetIdFromUrl(process.env.HOTEL_EXPENSES_SHEET_URL || ''),
    },
    diary: {
      url: process.env.DIARY_SHEET_URL,
      id: extractSheetIdFromUrl(process.env.DIARY_SHEET_URL || ''),
    },
  };
}

/**
 * Validate if a Google Sheets URL is properly formatted
 */
export function isValidGoogleSheetsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'docs.google.com' &&
      urlObj.pathname.includes('/spreadsheets/d/') &&
      extractSheetIdFromUrl(url) !== null
    );
  } catch {
    return false;
  }
}

/**
 * Generate Google Sheets API URL for reading/writing data
 */
export function getApiUrl(sheetId: string, range: string = 'A1:Z1000'): string {
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getSheetsConfig() instead
 */
export function getSheetIds() {
  const config = getSheetsConfig();
  return {
    SHOPPING_LIST_SHEET_ID: config.shoppingList.id,
    EXPENSES_SHEET_ID: config.expenses.id,
    CONTACTS_SHEET_ID: config.contacts.id,
    HOTEL_EXPENSES_SHEET_ID: config.hotelExpenses.id,
    DIARY_SHEET_ID: config.diary.id,
  };
}