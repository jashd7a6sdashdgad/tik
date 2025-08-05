// Automated Receipt Processing and OCR System

export interface ReceiptData {
  id: string;
  imageUrl: string;
  processedAt: Date;
  merchantName?: string;
  total?: number;
  currency?: string;
  date?: Date;
  items?: ReceiptItem[];
  category?: string;
  confidence?: number;
  rawText?: string;
  address?: string;
  phoneNumber?: string;
  taxAmount?: string;
  paymentMethod?: string;
}

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: BoundingBox[];
  words?: Word[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Word {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export class ReceiptProcessor {
  private merchantPatterns: Record<string, RegExp[]> = {};
  private pricePatterns: RegExp[] = [];
  private datePatterns: RegExp[] = [];
  private addressPatterns: RegExp[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Common merchant patterns
    this.merchantPatterns = {
      "McDonald's": [/mcdonald'?s/i, /mcdonalds/i],
      "Starbucks": [/starbucks/i, /sbux/i],
      "Walmart": [/walmart/i, /wal-mart/i],
      "Target": [/target/i],
      "Amazon": [/amazon\.com/i, /amzn/i],
      "Shell": [/shell/i],
      "BP": [/bp/i, /british petroleum/i],
      "Subway": [/subway/i],
      "KFC": [/kfc/i, /kentucky fried chicken/i],
      "Pizza Hut": [/pizza hut/i],
      "CVS": [/cvs/i, /cvs pharmacy/i],
      "Walgreens": [/walgreens/i]
    };

    // Price patterns
    this.pricePatterns = [
      /\$\s*(\d+\.?\d*)/g,  // $XX.XX
      /(\d+\.?\d*)\s*USD/gi, // XX.XX USD
      /(\d+\.?\d*)\s*OMR/gi, // XX.XX OMR
      /(\d+\.?\d*)\s*AED/gi, // XX.XX AED
      /TOTAL:?\s*\$?(\d+\.?\d*)/gi, // TOTAL: XX.XX
      /AMOUNT:?\s*\$?(\d+\.?\d*)/gi, // AMOUNT: XX.XX
      /(\d+\.\d{2})/g // Any decimal with 2 places
    ];

    // Date patterns
    this.datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g, // MM/DD/YYYY
      /(\d{1,2}-\d{1,2}-\d{2,4})/g,  // MM-DD-YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/g,    // YYYY-MM-DD
      /(\w{3}\s+\d{1,2},?\s+\d{4})/g, // Jan 15, 2024
      /(\d{1,2}\s+\w{3}\s+\d{4})/g   // 15 Jan 2024
    ];

    // Address patterns
    this.addressPatterns = [
      /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|plaza|square|sq))/gi,
      /(\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s+\d{5})/gi // Street, City, State ZIP
    ];
  }

  // Main processing method
  async processReceipt(imageFile: File): Promise<ReceiptData> {
    try {
      // Convert image to base64 for processing
      const imageData = await this.fileToBase64(imageFile);
      
      // Perform OCR
      const ocrResult = await this.performOCR(imageData);
      
      // Extract structured data
      const receiptData = this.extractReceiptData(ocrResult.text);
      
      // Generate unique ID
      const id = this.generateReceiptId();
      
      return {
        id,
        imageUrl: imageData,
        processedAt: new Date(),
        rawText: ocrResult.text,
        confidence: ocrResult.confidence,
        ...receiptData
      };
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw new Error('Failed to process receipt');
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async performOCR(imageData: string): Promise<OCRResult> {
    // In a real implementation, this would call an OCR service like:
    // - Google Cloud Vision API
    // - Amazon Textract
    // - Azure Computer Vision
    // - Tesseract.js for client-side OCR
    
    // For now, we'll simulate OCR with a mock implementation
    return this.mockOCR(imageData);
  }

  private async mockOCR(imageData: string): Promise<OCRResult> {
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OCR text based on common receipt patterns
    const mockText = `
WALMART SUPERCENTER
Store #1234
123 Main Street
Anytown, ST 12345
(555) 123-4567

Date: 12/15/2023
Time: 14:30

GROCERY DEPARTMENT
Milk, Whole 1 Gal         $3.48
Bread, White              $2.98
Eggs, Large Dozen         $2.78
Bananas, per lb           $1.25

SUBTOTAL                  $10.49
TAX                       $0.84
TOTAL                     $11.33

PAYMENT METHOD: CREDIT CARD
CARD: ****1234

Thank you for shopping with us!
Receipt #: R123456789
    `.trim();

    return {
      text: mockText,
      confidence: 0.92,
      words: this.extractWords(mockText)
    };
  }

  private extractWords(text: string): Word[] {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.map((word, index) => ({
      text: word,
      confidence: 0.85 + Math.random() * 0.15, // Random confidence between 0.85-1.0
      boundingBox: {
        x: (index % 10) * 50,
        y: Math.floor(index / 10) * 20,
        width: word.length * 8,
        height: 16
      }
    }));
  }

  private extractReceiptData(text: string): Partial<ReceiptData> {
    const data: Partial<ReceiptData> = {};

    // Extract merchant name
    data.merchantName = this.extractMerchantName(text);

    // Extract total amount
    data.total = this.extractTotal(text);

    // Extract date
    data.date = this.extractDate(text);

    // Extract items
    data.items = this.extractItems(text);

    // Extract additional info
    data.address = this.extractAddress(text);
    data.phoneNumber = this.extractPhoneNumber(text);
    data.taxAmount = this.extractTaxAmount(text);
    data.paymentMethod = this.extractPaymentMethod(text);

    // Determine category based on merchant
    if (data.merchantName) {
      data.category = this.categorizeMerchant(data.merchantName);
    }

    // Calculate confidence based on extracted data
    data.confidence = this.calculateExtractionConfidence(data);

    return data;
  }

  private extractMerchantName(text: string): string | undefined {
    // Check against known merchant patterns first
    for (const [merchant, patterns] of Object.entries(this.merchantPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return merchant;
        }
      }
    }

    // Look for business name patterns at the top of receipt
    const lines = text.split('\n').slice(0, 5); // Check first 5 lines
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines with multiple capital letters (likely business names)
      if (/^[A-Z\s&]{3,}$/.test(trimmed) && trimmed.length > 3) {
        return trimmed;
      }
    }

    return undefined;
  }

  private extractTotal(text: string): number | undefined {
    // Look for total amount patterns
    const totalPatterns = [
      /TOTAL:?\s*\$?(\d+\.?\d*)/gi,
      /AMOUNT:?\s*\$?(\d+\.?\d*)/gi,
      /BALANCE:?\s*\$?(\d+\.?\d*)/gi
    ];

    for (const pattern of totalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const numberMatch = matches[matches.length - 1].match(/(\d+\.?\d*)/);
        if (numberMatch) {
          return parseFloat(numberMatch[1]);
        }
      }
    }

    // Look for largest monetary amount as likely total
    const allAmounts: number[] = [];
    for (const pattern of this.pricePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount)) {
          allAmounts.push(amount);
        }
      }
    }

    if (allAmounts.length > 0) {
      return Math.max(...allAmounts);
    }

    return undefined;
  }

  private extractDate(text: string): Date | undefined {
    for (const pattern of this.datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }

    return undefined;
  }

  private extractItems(text: string): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for lines with item descriptions and prices
      const itemMatch = line.match(/^(.+?)\s+\$?(\d+\.?\d*)$/);
      if (itemMatch) {
        const description = itemMatch[1].trim();
        const price = parseFloat(itemMatch[2]);

        // Skip lines that are likely totals or taxes
        if (!/^(subtotal|total|tax|amount|balance)/i.test(description)) {
          items.push({
            description,
            totalPrice: price,
            category: this.categorizeItem(description)
          });
        }
      }
    }

    return items;
  }

  private extractAddress(text: string): string | undefined {
    for (const pattern of this.addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractPhoneNumber(text: string): string | undefined {
    const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const match = text.match(phonePattern);
    return match ? match[0] : undefined;
  }

  private extractTaxAmount(text: string): string | undefined {
    const taxPattern = /TAX:?\s*\$?(\d+\.?\d*)/gi;
    const match = text.match(taxPattern);
    if (match) {
      const numberMatch = match[0].match(/(\d+\.?\d*)/);
      return numberMatch ? numberMatch[1] : undefined;
    }
    return undefined;
  }

  private extractPaymentMethod(text: string): string | undefined {
    const paymentPatterns = [
      /PAYMENT METHOD:?\s*(.+)/gi,
      /CARD:?\s*\*+(\d{4})/gi,
      /CASH/gi,
      /CREDIT CARD/gi,
      /DEBIT CARD/gi,
      /VISA/gi,
      /MASTERCARD/gi
    ];

    for (const pattern of paymentPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  private categorizeMerchant(merchantName: string): string {
    const categoryMap: Record<string, string> = {
      "McDonald's": 'Food',
      "Starbucks": 'Food',
      "KFC": 'Food',
      "Pizza Hut": 'Food',
      "Subway": 'Food',
      "Walmart": 'Shopping',
      "Target": 'Shopping',
      "Amazon": 'Shopping',
      "Shell": 'Transportation',
      "BP": 'Transportation',
      "CVS": 'Medical',
      "Walgreens": 'Medical'
    };

    return categoryMap[merchantName] || 'General';
  }

  private categorizeItem(description: string): string {
    const desc = description.toLowerCase();
    
    if (/milk|bread|egg|banana|apple|meat|chicken|beef|vegetable|fruit/i.test(desc)) {
      return 'Food';
    }
    if (/medicine|pharmacy|drug|pill|tablet/i.test(desc)) {
      return 'Medical';
    }
    if (/gas|fuel|oil/i.test(desc)) {
      return 'Transportation';
    }
    if (/clothing|shirt|pants|shoes|dress/i.test(desc)) {
      return 'Shopping';
    }
    
    return 'General';
  }

  private calculateExtractionConfidence(data: Partial<ReceiptData>): number {
    let score = 0;
    let maxScore = 0;

    // Merchant name
    maxScore += 25;
    if (data.merchantName) score += 25;

    // Total amount
    maxScore += 30;
    if (data.total && data.total > 0) score += 30;

    // Date
    maxScore += 20;
    if (data.date) score += 20;

    // Items
    maxScore += 15;
    if (data.items && data.items.length > 0) score += 15;

    // Additional info
    maxScore += 10;
    if (data.address || data.phoneNumber || data.paymentMethod) score += 10;

    return score / maxScore;
  }

  private generateReceiptId(): string {
    return 'receipt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Public utility methods
  async processMultipleReceipts(files: File[]): Promise<ReceiptData[]> {
    const results: ReceiptData[] = [];
    
    for (const file of files) {
      try {
        const result = await this.processReceipt(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process receipt ${file.name}:`, error);
        // Continue processing other files
      }
    }

    return results;
  }

  validateReceiptData(data: ReceiptData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.merchantName) {
      errors.push('Merchant name not found');
    }

    if (!data.total || data.total <= 0) {
      errors.push('Valid total amount not found');
    }

    if (!data.date) {
      errors.push('Date not found');
    }

    if ((data.confidence || 0) < 0.5) {
      errors.push('Low confidence in extracted data');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  exportReceiptToExpense(receipt: ReceiptData) {
    return {
      id: receipt.id,
      description: `${receipt.merchantName || 'Receipt'} - ${receipt.date?.toDateString() || 'Unknown date'}`,
      debitAmount: receipt.total || 0,
      creditAmount: 0,
      category: receipt.category || 'General',
      date: receipt.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      from: receipt.merchantName || 'Receipt Upload',
      availableBalance: 0, // Would need to be calculated separately
      // Additional receipt-specific data
      receiptId: receipt.id,
      receiptData: receipt
    };
  }

  // Analytics and reporting
  generateReceiptAnalytics(receipts: ReceiptData[]) {
    const analytics = {
      totalReceipts: receipts.length,
      totalAmount: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
      averageAmount: 0,
      categoryCounts: {} as Record<string, number>,
      merchantCounts: {} as Record<string, number>,
      averageConfidence: 0,
      processingErrors: receipts.filter(r => (r.confidence || 0) < 0.5).length
    };

    if (receipts.length > 0) {
      analytics.averageAmount = analytics.totalAmount / receipts.length;
      analytics.averageConfidence = receipts.reduce((sum, r) => sum + (r.confidence || 0), 0) / receipts.length;
    }

    // Category and merchant counts
    receipts.forEach(receipt => {
      if (receipt.category) {
        analytics.categoryCounts[receipt.category] = (analytics.categoryCounts[receipt.category] || 0) + 1;
      }
      if (receipt.merchantName) {
        analytics.merchantCounts[receipt.merchantName] = (analytics.merchantCounts[receipt.merchantName] || 0) + 1;
      }
    });

    return analytics;
  }
}

// Create singleton instance
export const receiptProcessor = new ReceiptProcessor();