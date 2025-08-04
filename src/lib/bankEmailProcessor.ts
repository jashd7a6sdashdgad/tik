import { Gmail, GoogleSheets, getAuthenticatedClient } from './google';

export interface BankTransaction {
  date: string; // YYYY-MM-DD format
  merchant: string;
  amount: number;
  description: string;
  transactionId?: string;
  rawSubject?: string;
  rawBody?: string;
}

export interface ProcessorConfig {
  bankEmails?: string[];
  spreadsheetId: string;
  sheetName?: string;
  expenseLabel?: string;
}

// Common Omani bank email addresses
export const OMANI_BANKS = [
  'noreply@bankdhofar.com',
  'alerts@bankmuscat.com',
  'noreply@bankmuscat.com',
  'alerts@ahlibank.om',
  'noreply@ahlibank.om',
  'banking@ahlibank.om',
  'ahlibank@ahlibank.om',
  'sms@bankmuscat.com',
  'alerts@bankmuscat.om',
  'noreply@cbo.gov.om',
  'alerts@alizbank.com',
  'noreply@alizbank.com',
  'noreply@bank.com'
];

export class BankEmailProcessor {
  private gmail: Gmail;
  private sheets: GoogleSheets;
  private config: ProcessorConfig;

  constructor(auth: any, config: ProcessorConfig) {
    this.gmail = new Gmail(auth);
    this.sheets = new GoogleSheets(auth);
    this.config = {
      bankEmails: OMANI_BANKS,
      sheetName: 'Expenses',
      expenseLabel: 'Expense Logged',
      ...config
    };
  }

  /**
   * Main function to process bank emails and log expenses
   */
  async processBankEmails(): Promise<{
    processed: number;
    duplicates: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      duplicates: 0,
      errors: [] as string[]
    };

    try {
      console.log(`🔍 Searching for emails from Omani banks...`);
      console.log(`🔑 Using Gmail scopes: modify, readonly, labels`);
      
      // IMMEDIATELY TRY TO SEND PROBLEM EMAIL TO N8N
      console.log(`🚀 IMMEDIATELY SENDING PROBLEM EMAIL TO N8N...`);
      try {
        const problemEmailData = await this.gmail.getMessage('1986980f0a4d9532');
        console.log(`📧 Got problem email, forcing N8N send...`);
        await this.sendToN8N(problemEmailData, '1986980f0a4d9532');
        console.log(`✅ Successfully sent email 1986980f0a4d9532 to N8N`);
        results.processed++;
      } catch (immediateN8nError) {
        console.error(`❌ Immediate N8N send failed:`, immediateN8nError);
        results.errors.push(`Immediate N8N send failed: ${(immediateN8nError as any).message}`);
      }
      
      // Get or create the expense labels
      console.log(`🏷️ Step 1: Ensuring expense labels exist...`);
      let labelId, failedLabelId;
      try {
        console.log('🔍 Creating/getting "Expense Logged" label...');
        labelId = await this.ensureExpenseLabel();
        console.log('🔍 Creating/getting "Expense Failed" label...');
        failedLabelId = await this.ensureFailedLabel();
        console.log(`✅ Label IDs obtained: success=${labelId}, failed=${failedLabelId}`);
        
        // Verify labels exist
        const allLabels = await this.gmail.getLabels();
        console.log('🔍 All Gmail labels:', allLabels.map(l => `${l.name} (${l.id})`));
      } catch (error: any) {
        console.error(`❌ FAILED at Step 1 (ensureExpenseLabel): ${error.message}`);
        throw error;
      }
      
      // Build query for multiple bank emails
      const bankQueries = this.config.bankEmails!.map(email => `from:${email}`).join(' OR ');
      const query = `(${bankQueries}) -label:"${this.config.expenseLabel}" -label:"Expense Failed"`;
      console.log(`🔎 Step 2: Searching for messages with query: ${query}`);
      let messages;
      try {
        messages = await this.gmail.listMessages(query, 50);
        console.log(`✅ Step 2 completed: Found ${messages.length} messages`);
      } catch (error: any) {
        console.error(`❌ FAILED at Step 2 (listMessages): ${error.message}`);
        throw error;
      }
      
      console.log(`📧 Found ${messages.length} unprocessed bank emails`);
      console.log(`📧 Email IDs found:`, messages.map(m => m.id));
      
      // Check if our problematic email is in the list
      const problemEmail = messages.find(m => m.id === '1986980f0a4d9532');
      if (problemEmail) {
        console.log(`🔍 Problem email 1986980f0a4d9532 IS in current batch`);
      } else {
        console.log(`🔍 Problem email 1986980f0a4d9532 is NOT in current batch - might be labeled already`);
        
        // Let's check if it has labels
        try {
          const emailData = await this.gmail.getMessage('1986980f0a4d9532');
          console.log(`🔍 Problem email labels:`, emailData.labelIds);
        } catch (error) {
          console.log(`🔍 Could not fetch problem email: ${(error as any).message}`);
        }
      }
      
      if (messages.length === 0) {
        return results;
      }

      // FORCE DEBUG AND PROCESS THE PROBLEM EMAIL
      console.log(`🔍 FORCE DEBUGGING AND PROCESSING EMAIL 1986980f0a4d9532...`);
      try {
        const problemEmailData = await this.gmail.getMessage('1986980f0a4d9532');
        console.log(`🔍 PROBLEM EMAIL FULL DATA:`, JSON.stringify(problemEmailData, null, 2));
        
        // Try to parse it
        const headers = problemEmailData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const body = this.extractEmailBody(problemEmailData);
        
        console.log(`🔍 PROBLEM EMAIL PARSED:`);
        console.log(`📧 From: ${from}`);
        console.log(`📧 Subject: "${subject}"`);
        console.log(`📧 Body: "${body}"`);
        console.log(`📧 Labels: ${problemEmailData.labelIds}`);
        
        // Try parsing
        const transaction = this.extractTransactionFromText(subject, body);
        console.log(`🔍 PARSING RESULT:`, transaction);
        
        // FORCE SEND TO N8N REGARDLESS OF PARSING RESULT
        console.log(`🚀 FORCE SENDING TO N8N...`);
        try {
          await this.sendToN8N(problemEmailData, '1986980f0a4d9532');
          console.log(`✅ Successfully sent email 1986980f0a4d9532 to N8N`);
          results.processed++;
          
          // Mark as processed
          await this.gmail.addLabelToMessage('1986980f0a4d9532', [labelId]);
          console.log(`🏷️ Marked email 1986980f0a4d9532 as processed`);
        } catch (n8nError) {
          console.error(`❌ Failed to send to N8N:`, n8nError);
        }
        
      } catch (error) {
        console.error(`❌ Error force debugging problem email:`, error);
      }

      // Get existing expenses to check for duplicates
      const existingExpenses = await this.getExistingExpenses();
      console.log(`💾 Loaded ${existingExpenses.length} existing expenses for duplicate checking`);

      // Process each email
      for (const message of messages) {
        try {
          console.log(`📧 Processing email ID: ${message.id}`);
          const emailData = await this.gmail.getMessage(message.id);
          
          // FULL DEBUG FOR FAILING EMAIL
          if (message.id === '1986980f0a4d9532') {
            console.log('🔍 FULL DEBUG FOR FAILING EMAIL:');
            console.log('📧 Raw email data:', JSON.stringify(emailData, null, 2));
          }
          
          const transaction = this.parseEmailForTransaction(emailData);
          
          if (!transaction) {
            console.log(`❌ Failed to parse email ${message.id} - sending to N8N backend`);
            
            // Send to N8N backend for processing
            try {
              await this.sendToN8N(emailData, message.id);
              console.log(`✅ Sent email ${message.id} to N8N backend for processing`);
              
              // Mark as processed since N8N will handle it
              await this.gmail.addLabelToMessage(message.id, [labelId]);
              console.log(`🏷️ Marked email ${message.id} as processed (N8N handled)`);
              results.processed++;
            } catch (n8nError) {
              console.error(`❌ Failed to send to N8N: ${(n8nError as any).message}`);
              results.errors.push(`Failed to parse email ${message.id} and N8N failed: ${(n8nError as any).message}`);
              
              // Mark as failed only if N8N also fails
              try {
                await this.gmail.addLabelToMessage(message.id, [failedLabelId]);
                console.log(`🏷️ Marked email ${message.id} as failed after N8N failure`);
              } catch (labelError) {
                console.error(`❌ Failed to label email ${message.id}:`, labelError);
              }
            }
            continue;
          }

          // Check for duplicates
          if (this.isDuplicate(transaction, existingExpenses)) {
            console.log(`⚠️ Duplicate transaction: ${transaction.date} - ${transaction.merchant} - ${transaction.amount}`);
            results.duplicates++;
            
            // Still mark as processed to avoid checking again
            await this.gmail.addLabelToMessage(message.id, [labelId]);
            continue;
          }

          // Add to sheet
          await this.addTransactionToSheet(transaction);
          
          // Mark email as processed
          await this.gmail.addLabelToMessage(message.id, [labelId]);
          
          console.log(`✅ Processed: ${transaction.date} - ${transaction.merchant} - ${transaction.amount} OMR`);
          results.processed++;
          
          // Add small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          const errorMsg = `Error processing email ${message.id}: ${(error as any).message}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

    } catch (error) {
      const errorMsg = `Fatal error in processBankEmails: ${(error as any).message}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }

    return results;
  }

  /**
   * Parse email content to extract transaction information
   */
  private parseEmailForTransaction(emailData: any): BankTransaction | null {
    try {
      const headers = emailData.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const body = this.extractEmailBody(emailData);

      console.log(`🔍 Parsing email - From: ${from}, Subject: ${subject.substring(0, 100)}`);

      // Common bank email patterns for Omani banks
      const transaction = this.extractTransactionFromText(subject, body);
      
      if (transaction) {
        transaction.rawSubject = subject;
        transaction.rawBody = body;
        console.log(`✅ Successfully parsed transaction: ${transaction.date} - ${transaction.merchant} - ${transaction.amount}`);
        return transaction;
      }

      console.log(`⚠️ Could not extract transaction details from email`);
      console.log(`📧 From: ${from}`);
      console.log(`📧 Subject: "${subject}"`);
      console.log(`📧 Body preview: "${body.substring(0, 500)}"`);
      console.log(`📧 Full text preview: "${(subject + ' ' + body).substring(0, 800)}"`);
      return null;
    } catch (error) {
      console.error('Error parsing email:', error);
      return null;
    }
  }

  /**
   * Extract transaction details from email text using regex patterns
   */
  private extractTransactionFromText(subject: string, body: string): BankTransaction | null {
    const fullText = subject + ' ' + body;
    
    // Enhanced date extraction patterns for Omani banks
    const datePatterns = [
      // ARABIC PATTERNS FIRST
      /بتاريخ (\d{1,2}-\d{1,2}-\d{4})/g, // Arabic "بتاريخ DD-MM-YYYY"
      /بتاريخ (\d{1,2}\/\d{1,2}\/\d{4})/g, // Arabic "بتاريخ DD/MM/YYYY"
      
      // ENGLISH PATTERNS
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g, // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/gi, // DD MMM YYYY
      /on\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/gi, // "on DD/MM/YYYY"
      /date[:\s]+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/gi, // "Date: DD/MM/YYYY"
      /(\d{1,2})(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/gi, // 1st Jan 2024
      /transaction\s+date[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/gi, // "Transaction date: DD/MM/YYYY"
      // More aggressive patterns
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g, // Any DD/MM/YY or DD/MM/YYYY
      /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g, // Any YYYY/MM/DD
      /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/gi, // Full month names
    ];

    // Enhanced amount extraction patterns for Omani banks
    const amountPatterns = [
      // ARABIC PATTERNS FIRST
      /المبلغ OMR (\d+\.\d{3})/g, // Arabic "المبلغ OMR 123.456"
      /المبلغ (\d+\.\d{3}) OMR/g, // Arabic "المبلغ 123.456 OMR"
      /OMR (\d+\.\d{3})/g, // Just "OMR 123.456"
      
      // ENGLISH PATTERNS
      /(?:OMR|RO)\s*(\d+(?:[,\.]\d{1,3})?)/gi, // OMR 123.456 or OMR 123,45
      /(\d+(?:[,\.]\d{1,3}))\s*(?:OMR|RO)/gi, // 123.456 OMR or 123,45 OMR
      /(?:amount|total|charged|debited|spent|purchase)[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi,
      /(?:debit|withdrawal)[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi,
      /transaction[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi,
      /of\s+(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "of OMR 123.456"
      /value[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "value: 123.45"
      /cost[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "cost: 123.45"
      /bill[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "bill: 123.45"
      /pay[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "pay: 123.45"
      /sum[\s:]*(?:OMR|RO)?\s*(\d+(?:[,\.]\d{1,3})?)/gi, // "sum: 123.45"
      /\$\s*(\d+(?:[,\.]\d{1,3})?)/gi, // $123.45 (in case dollar sign is used)
      /(\d+(?:[,\.]\d{1,3}))\s*(?:was|has\s+been)\s+(?:charged|debited|withdrawn)/gi, // "123.45 was charged"
      // More aggressive patterns
      /\b(\d{1,4}[,\.]\d{1,3})\b/gi, // Any number with decimal like 123.45 or 1,234.56
      /\b(\d{1,4})\.\d{2}\b/gi, // Simple decimal amounts like 45.67
      /\b(\d+)\s*(?:riyal|rial|baisa|fils)/gi, // Local currency terms
    ];

    // Enhanced merchant/description patterns for Omani banks
    const merchantPatterns = [
      /(?:at|from|to)\s+([A-Z][A-Za-z\s&\-'\.]+?)(?:\s+on|\s+dated|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /(?:merchant|store|shop)[\s:]+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /POS\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /card\s+used\s+(?:at|in)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /purchase\s+(?:at|from)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /transaction\s+(?:at|with)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /location[:\s]+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /(?:payment|pay)\s+(?:to|at)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /debit\s+(?:at|from)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
      /spent\s+(?:at|on)\s+([A-Za-z\s&\-'\.]+?)(?:\s+on|\s+OMR|\s+RO|\s+\d|\s*$)/gi,
    ];

    let date: string | null = null;
    let amount: number | null = null;
    let merchant: string | null = null;

    // Extract date
    for (const pattern of datePatterns) {
      const match = pattern.exec(fullText);
      if (match) {
        if (pattern.source.includes('بتاريخ')) {
          // Handle Arabic date format "بتاريخ DD-MM-YYYY" or "بتاريخ DD/MM/YYYY"
          const datePart = match[1];
          const parts = datePart.split(/[-\/]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            date = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
          }
        } else if (pattern.source.includes('Jan|Feb') || pattern.source.includes('st|nd|rd|th')) {
          // Handle MMM format or ordinal format
          const day = match[1].padStart(2, '0');
          const monthMap: {[key: string]: string} = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
          };
          const monthIndex = pattern.source.includes('st|nd|rd|th') ? 3 : 2;
          const yearIndex = pattern.source.includes('st|nd|rd|th') ? 4 : 3;
          const month = monthMap[match[monthIndex].toLowerCase()];
          date = `${match[yearIndex]}-${month}-${day}`;
        } else if (match[3]) {
          // Handle DD/MM/YYYY
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          date = `${match[3]}-${month}-${day}`;
        } else {
          // Handle YYYY/MM/DD
          const year = match[1];
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          date = `${year}-${month}-${day}`;
        }
        console.log(`📅 Found date: ${date} from pattern: ${pattern.source.substring(0, 50)}`);
        break;
      }
    }

    // Extract amount
    for (const pattern of amountPatterns) {
      const match = pattern.exec(fullText);
      if (match) {
        // Handle both comma and dot as decimal separators
        const cleanAmount = match[1].replace(',', '.');
        amount = parseFloat(cleanAmount);
        if (!isNaN(amount)) {
          console.log(`💰 Found amount: ${amount} from pattern: ${pattern.source.substring(0, 50)}`);
          break;
        }
      }
    }

    // Extract merchant
    for (const pattern of merchantPatterns) {
      const match = pattern.exec(fullText);
      if (match) {
        merchant = match[1].trim().replace(/\s+/g, ' ');
        if (merchant.length > 3) {
          console.log(`🏪 Found merchant: ${merchant} from pattern: ${pattern.source.substring(0, 50)}`);
          break;
        }
      }
    }

    // Fallback merchant extraction - look for capitalized words
    if (!merchant) {
      console.log('🔍 No merchant found with patterns, trying fallback extraction...');
      
      // Check if this is an Arabic debit notification
      if (fullText.includes('المبلغ OMR') || fullText.includes('رصيدك المتاح')) {
        merchant = 'Account Debit';
        console.log(`🏪 Arabic debit notification - using default merchant: ${merchant}`);
      } else {
        const capitalizedWordsMatch = fullText.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\b/g);
        if (capitalizedWordsMatch) {
          const filtered = capitalizedWordsMatch.filter(word => 
            word.length > 3 && 
            !['FROM', 'BANK', 'TRANSACTION', 'AMOUNT', 'DATE', 'TIME', 'AHLI', 'MUSCAT', 'DHOFAR', 'YOUR', 'CARD', 'ACCOUNT'].includes(word.toUpperCase())
          );
          console.log('🔍 Capitalized words found:', capitalizedWordsMatch.slice(0, 10));
          console.log('🔍 Filtered words:', filtered.slice(0, 5));
          if (filtered.length > 0) {
            merchant = filtered[0];
            console.log(`🏪 Fallback merchant found: ${merchant}`);
          }
        }
      }
    }

    // Validate required fields
    if (!date || !amount || !merchant) {
      console.log('❌ Missing required fields:', { 
        date, 
        amount, 
        merchant, 
        subject: subject.substring(0, 100),
        bodyPreview: body.substring(0, 200),
        fullTextPreview: fullText.substring(0, 300)
      });
      return null;
    }

    // Generate transaction ID
    const transactionId = this.generateTransactionId(date, amount, merchant);

    return {
      date,
      merchant: merchant.substring(0, 50), // Limit length
      amount,
      description: `${merchant} - ${subject.substring(0, 100)}`.substring(0, 200),
      transactionId
    };
  }

  /**
   * Extract email body content from Gmail API response
   */
  private extractEmailBody(emailData: any): string {
    let body = '';
    
    if (emailData.payload) {
      if (emailData.payload.body?.data) {
        body = Buffer.from(emailData.payload.body.data, 'base64').toString('utf8');
      } else if (emailData.payload.parts) {
        for (const part of emailData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf8');
          } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
            // Fallback to HTML if no plain text
            body += Buffer.from(part.body.data, 'base64').toString('utf8');
          }
        }
      }
    }
    
    // Log Arabic content preservation
    console.log(`📧 Extracted body length: ${body.length}`);
    console.log(`📧 Contains Arabic: ${/[\u0600-\u06FF]/.test(body)}`);
    console.log(`📧 Body preview: ${body.substring(0, 200)}`);
    
    return body;
  }

  /**
   * Generate unique transaction ID for duplicate detection
   */
  private generateTransactionId(date: string, amount: number, merchant: string): string {
    const cleanMerchant = merchant.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `${date}_${amount}_${cleanMerchant}`.substring(0, 50);
  }

  /**
   * Get existing expenses from the sheet for duplicate checking
   */
  private async getExistingExpenses(): Promise<BankTransaction[]> {
    try {
      const range = `${this.config.sheetName}!A:H`; // Updated to match new expense structure
      const values = await this.sheets.getValues(this.config.spreadsheetId, range);
      
      if (values.length <= 1) return []; // Only header row or empty
      
      const expenses: BankTransaction[] = [];
      
      // Skip header row (index 0)
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row.length >= 6) {
          const creditAmount = parseFloat(row[2]) || 0;
          const debitAmount = parseFloat(row[3]) || 0;
          const amount = debitAmount - creditAmount;
          expenses.push({
            date: row[1] || '', // Date is now in column B
            merchant: row[0] || '', // From is in column A
            amount: amount,
            description: row[5] || '', // Description is now in column F
            transactionId: row[7] || this.generateTransactionId(row[1], amount, row[0])
          });
        }
      }
      
      return expenses;
    } catch (error) {
      console.error('Error getting existing expenses:', error);
      return [];
    }
  }

  /**
   * Check if transaction is a duplicate
   */
  private isDuplicate(transaction: BankTransaction, existingExpenses: BankTransaction[]): boolean {
    // Check by transaction ID first
    if (transaction.transactionId) {
      const existsByTxId = existingExpenses.some(exp => exp.transactionId === transaction.transactionId);
      if (existsByTxId) return true;
    }

    // Check by date + amount + merchant (fuzzy match for merchant)
    const exists = existingExpenses.some(exp => {
      const sameDate = exp.date === transaction.date;
      const sameAmount = Math.abs(exp.amount - transaction.amount) < 0.001; // Account for floating point
      const similarMerchant = this.isSimilarMerchant(exp.merchant, transaction.merchant);
      
      return sameDate && sameAmount && similarMerchant;
    });

    return exists;
  }

  /**
   * Check if two merchant names are similar (fuzzy matching)
   */
  private isSimilarMerchant(merchant1: string, merchant2: string): boolean {
    const clean1 = merchant1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = merchant2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match
    if (clean1 === clean2) return true;
    
    // One contains the other
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    
    // Simple Levenshtein distance for short strings
    if (clean1.length <= 10 && clean2.length <= 10) {
      const distance = this.levenshteinDistance(clean1, clean2);
      return distance <= 2;
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Add transaction to Google Sheet
   */
  private async addTransactionToSheet(transaction: BankTransaction): Promise<void> {
    const range = `${this.config.sheetName}!A:H`;
    const values = [[
      transaction.merchant, // From (Column A)
      transaction.date, // Date (Column B)
      '', // Credit Amount (Column C)
      transaction.amount, // Debit Amount (Column D)
      'Banking', // Category (Column E)
      transaction.description, // Description (Column F)
      '', // Available Balance (Column G)
      transaction.transactionId || '' // ID (Column H)
    ]];

    await this.sheets.appendValues(this.config.spreadsheetId, range, values);
  }

  /**
   * Ensure the expense label exists, create if it doesn't
   */
  private async ensureExpenseLabel(): Promise<string> {
    try {
      const labels = await this.gmail.getLabels();
      const existingLabel = labels.find(label => label.name === this.config.expenseLabel);
      
      if (existingLabel) {
        return existingLabel.id!;
      }
      
      // Create the label
      const newLabel = await this.gmail.createLabel(this.config.expenseLabel!);
      console.log(`📋 Created Gmail label: ${this.config.expenseLabel}`);
      return newLabel.id!;
      
    } catch (error) {
      console.error('Error managing Gmail label:', error);
      throw error;
    }
  }

  /**
   * Ensure the failed expense label exists, create if it doesn't
   */
  private async ensureFailedLabel(): Promise<string> {
    try {
      const labels = await this.gmail.getLabels();
      const existingLabel = labels.find(label => label.name === 'Expense Failed');
      
      if (existingLabel) {
        return existingLabel.id!;
      }
      
      // Create the label
      const newLabel = await this.gmail.createLabel('Expense Failed');
      console.log(`📋 Created Gmail label: Expense Failed`);
      return newLabel.id!;
      
    } catch (error) {
      console.error('Error managing Gmail failed label:', error);
      throw error;
    }
  }

  /**
   * Send email data to N8N backend for processing
   */
  private async sendToN8N(emailData: any, emailId: string): Promise<void> {
    console.log(`🔍 ALL ENVIRONMENT VARIABLES:`, Object.keys(process.env).filter(key => key.includes('N8N')));
    console.log(`🔍 Checking for N8N webhook URL...`);
    
    // Try multiple possible environment variable names
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK || process.env.WEBHOOK_URL;
    
    console.log(`🔍 N8N_WEBHOOK_URL from env: ${n8nWebhookUrl ? 'SET' : 'NOT SET'}`);
    console.log(`🔍 Full N8N URL: ${n8nWebhookUrl}`);
    
    if (!n8nWebhookUrl) {
      console.log(`🔍 Available env vars:`, Object.keys(process.env).slice(0, 10));
      throw new Error('N8N_WEBHOOK_URL not configured in environment variables');
    }

    // Extract email content
    const headers = emailData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const body = this.extractEmailBody(emailData);

    const payload = {
      emailId: emailId,
      from: from,
      subject: subject,
      body: body,
      rawEmailData: emailData, // Include full email data for N8N
      text: "go get the latest bank deposit/transaction and add it into my expenses sheet please",
      message: "go get the latest bank deposit/transaction and add it into my expenses sheet please",
      content: "go get the latest bank deposit/transaction and add it into my expenses sheet please",
      instruction: "go get the latest bank deposit/transaction and add it into my expenses sheet please",
      action: "process_bank_email",
      timestamp: new Date().toISOString(),
      emailContent: {
        subject: subject,
        body: body,
        from: from,
        arabicContent: body // Ensure Arabic content is preserved
      }
    };

    console.log(`🔗 Sending to N8N webhook: ${n8nWebhookUrl}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

    let response;
    try {
      response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          'User-Agent': 'Mahboob-Personal-Assistant/1.0'
        },
        body: JSON.stringify(payload)
      });
      console.log(`📡 N8N fetch completed, status: ${response.status}`);
    } catch (fetchError) {
      console.error(`❌ Fetch error to N8N:`, fetchError);
      throw new Error(`Failed to connect to N8N webhook: ${(fetchError as any).message}`);
    }

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
    }

    // Handle binary file response from N8N
    const contentType = response.headers.get('content-type');
    console.log(`📄 N8N response content-type: ${contentType}`);

    if (contentType && contentType.includes('application/octet-stream')) {
      // Handle binary response
      const buffer = await response.arrayBuffer();
      console.log(`✅ N8N returned binary file, size: ${buffer.byteLength} bytes`);
      
      // You can save the file if needed or just log success
      console.log(`🎯 N8N successfully processed the email and returned binary data`);
    } else {
      // Handle text/JSON response
      const result = await response.text();
      console.log(`✅ N8N response:`, result);
    }
  }
}

/**
 * Standalone function to process bank emails with authentication
 */
export async function processBankEmails(
  tokens: any,
  config: ProcessorConfig
): Promise<{
  processed: number;
  duplicates: number;
  errors: string[];
}> {
  console.log('🔧 processBankEmails called with tokens:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token
  });
  
  try {
    console.log('🔑 Creating authenticated client...');
    const auth = getAuthenticatedClient(tokens);
    console.log('✅ Auth client created successfully');
    
    console.log('🏭 Creating BankEmailProcessor...');
    const processor = new BankEmailProcessor(auth, config);
    console.log('✅ Processor created successfully');
    
    console.log('🚀 Starting processor.processBankEmails()...');
    return await processor.processBankEmails();
  } catch (error: any) {
    console.error('❌ Error in processBankEmails function:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {
      processed: 0,
      duplicates: 0,
      errors: [error.message]
    };
  }
}