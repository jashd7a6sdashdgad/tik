/**
 * Smart Privacy System
 * Auto-delete sensitive data, manage data retention, and provide privacy controls
 */

import { encryptedStorage } from './encryptedStorage';

export interface PrivacySettings {
  autoDeleteEnabled: boolean;
  retentionPeriods: {
    conversations: number; // days
    searchHistory: number;
    voiceRecordings: number;
    personalData: number;
    financialData: number;
    healthData: number;
    locationData: number;
    emailData: number;
    calendarData: number;
  };
  sensitivityLevels: {
    [key: string]: 'low' | 'medium' | 'high' | 'critical';
  };
  anonymizationRules: {
    anonymizeAfterDays: number;
    keepStatisticsOnly: boolean;
    removePersonalIdentifiers: boolean;
  };
  dataMinimization: {
    collectOnlyNecessary: boolean;
    requestPermissionForSensitive: boolean;
    allowOptOut: boolean;
  };
}

export interface DataItem {
  id: string;
  type: string;
  data: any;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  lastAccessed?: Date;
  retentionPeriod: number; // days
  tags: string[];
  encrypted: boolean;
  anonymized: boolean;
  source: string;
  userConsent: boolean;
}

export interface DataClassificationRule {
  pattern: RegExp | string;
  dataType: string;
  sensitivity: DataItem['sensitivity'];
  retentionDays: number;
  requiresEncryption: boolean;
}

class SmartPrivacy {
  private readonly settingsKey = 'privacy_settings';
  private readonly dataIndexKey = 'data_index';
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly defaultSettings: PrivacySettings = {
    autoDeleteEnabled: true,
    retentionPeriods: {
      conversations: 30,
      searchHistory: 90,
      voiceRecordings: 7,
      personalData: 365,
      financialData: 2555, // 7 years
      healthData: 365,
      locationData: 30,
      emailData: 365,
      calendarData: 730, // 2 years
    },
    sensitivityLevels: {
      'password': 'critical',
      'ssn': 'critical',
      'credit_card': 'critical',
      'bank_account': 'critical',
      'email': 'medium',
      'phone': 'medium',
      'address': 'medium',
      'name': 'low',
      'conversation': 'low',
    },
    anonymizationRules: {
      anonymizeAfterDays: 90,
      keepStatisticsOnly: true,
      removePersonalIdentifiers: true,
    },
    dataMinimization: {
      collectOnlyNecessary: true,
      requestPermissionForSensitive: true,
      allowOptOut: true,
    },
  };

  private readonly classificationRules: DataClassificationRule[] = [
    // Financial data
    { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, dataType: 'credit_card', sensitivity: 'critical', retentionDays: 0, requiresEncryption: true },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, dataType: 'ssn', sensitivity: 'critical', retentionDays: 0, requiresEncryption: true },
    { pattern: /\$[\d,]+\.?\d*/, dataType: 'financial_amount', sensitivity: 'medium', retentionDays: 2555, requiresEncryption: true },
    
    // Personal identifiers
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, dataType: 'email', sensitivity: 'medium', retentionDays: 365, requiresEncryption: false },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, dataType: 'phone', sensitivity: 'medium', retentionDays: 365, requiresEncryption: false },
    { pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/i, dataType: 'address', sensitivity: 'medium', retentionDays: 365, requiresEncryption: false },
    
    // Health data
    { pattern: /\b(?:diabetes|hypertension|cancer|medication|prescription|doctor|hospital|clinic|symptoms?|diagnosis|treatment)\b/i, dataType: 'health', sensitivity: 'high', retentionDays: 365, requiresEncryption: true },
    
    // Location data
    { pattern: /\b\d+\.\d+,\s*-?\d+\.\d+\b/, dataType: 'coordinates', sensitivity: 'medium', retentionDays: 30, requiresEncryption: false },
    
    // Authentication data
    { pattern: /\b(?:password|passcode|pin|token|key|secret)\b/i, dataType: 'auth', sensitivity: 'critical', retentionDays: 0, requiresEncryption: true },
  ];

  constructor() {
    this.startAutoCleanup();
  }

  /**
   * Get current privacy settings
   */
  async getSettings(): Promise<PrivacySettings> {
    try {
      const stored = localStorage.getItem(this.settingsKey);
      return stored ? { ...this.defaultSettings, ...JSON.parse(stored) } : this.defaultSettings;
    } catch {
      return this.defaultSettings;
    }
  }

  /**
   * Update privacy settings
   */
  async updateSettings(newSettings: Partial<PrivacySettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(this.settingsKey, JSON.stringify(updatedSettings));
    
    // Restart cleanup with new settings
    this.startAutoCleanup();
  }

  /**
   * Store data with privacy classification
   */
  async storeData(
    id: string, 
    data: any, 
    type: string, 
    source: string = 'user',
    userConsent: boolean = true,
    customRetention?: number
  ): Promise<DataItem> {
    const classification = this.classifyData(data, type);
    const settings = await this.getSettings();
    
    const dataItem: DataItem = {
      id,
      type,
      data: classification.requiresEncryption ? data : data, // Will encrypt below if needed
      sensitivity: classification.sensitivity,
      createdAt: new Date(),
      retentionPeriod: customRetention || classification.retentionDays || settings.retentionPeriods[type as keyof typeof settings.retentionPeriods] || 30,
      tags: this.extractTags(data),
      encrypted: classification.requiresEncryption,
      anonymized: false,
      source,
      userConsent,
    };

    // Encrypt sensitive data
    if (classification.requiresEncryption) {
      const password = await this.generateDataPassword(id);
      await encryptedStorage.setItem(`data_${id}`, dataItem, password);
    } else {
      localStorage.setItem(`data_${id}`, JSON.stringify(dataItem));
    }

    // Update data index
    await this.updateDataIndex(dataItem);
    
    console.log(`Stored ${classification.sensitivity} sensitivity data: ${type}`);
    return dataItem;
  }

  /**
   * Retrieve data with access logging
   */
  async retrieveData(id: string): Promise<DataItem | null> {
    try {
      let dataItem: DataItem;
      
      // Try encrypted storage first
      const password = await this.generateDataPassword(id);
      const encryptedData = await encryptedStorage.getItem(`data_${id}`, password);
      
      if (encryptedData) {
        dataItem = encryptedData;
      } else {
        // Try regular storage
        const stored = localStorage.getItem(`data_${id}`);
        if (!stored) return null;
        dataItem = JSON.parse(stored);
      }

      // Update last accessed
      dataItem.lastAccessed = new Date();
      
      // Store back with updated access time
      if (dataItem.encrypted) {
        await encryptedStorage.setItem(`data_${id}`, dataItem, password);
      } else {
        localStorage.setItem(`data_${id}`, JSON.stringify(dataItem));
      }

      return dataItem;
    } catch (error) {
      console.error(`Failed to retrieve data ${id}:`, error);
      return null;
    }
  }

  /**
   * Auto-delete expired data
   */
  async cleanupExpiredData(): Promise<{ deleted: number; anonymized: number }> {
    const settings = await this.getSettings();
    if (!settings.autoDeleteEnabled) return { deleted: 0, anonymized: 0 };

    const dataIndex = await this.getDataIndex();
    const now = new Date();
    let deleted = 0;
    let anonymized = 0;

    for (const item of dataIndex) {
      const ageInDays = (now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      
      // Delete if past retention period
      if (ageInDays > item.retentionPeriod) {
        await this.deleteData(item.id);
        deleted++;
        console.log(`Auto-deleted expired data: ${item.type} (${item.id})`);
      }
      // Anonymize if past anonymization threshold
      else if (ageInDays > settings.anonymizationRules.anonymizeAfterDays && !item.anonymized) {
        await this.anonymizeData(item.id);
        anonymized++;
        console.log(`Auto-anonymized data: ${item.type} (${item.id})`);
      }
    }

    return { deleted, anonymized };
  }

  /**
   * Anonymize sensitive data
   */
  async anonymizeData(id: string): Promise<boolean> {
    try {
      const dataItem = await this.retrieveData(id);
      if (!dataItem || dataItem.anonymized) return false;

      const settings = await this.getSettings();
      
      // Apply anonymization rules
      if (settings.anonymizationRules.removePersonalIdentifiers) {
        dataItem.data = this.removePersonalIdentifiers(dataItem.data);
      }
      
      if (settings.anonymizationRules.keepStatisticsOnly) {
        dataItem.data = this.extractStatistics(dataItem.data, dataItem.type);
      }

      dataItem.anonymized = true;
      
      // Store anonymized data
      if (dataItem.encrypted) {
        const password = await this.generateDataPassword(id);
        await encryptedStorage.setItem(`data_${id}`, dataItem, password);
      } else {
        localStorage.setItem(`data_${id}`, JSON.stringify(dataItem));
      }

      return true;
    } catch (error) {
      console.error(`Failed to anonymize data ${id}:`, error);
      return false;
    }
  }

  /**
   * Delete data completely
   */
  async deleteData(id: string): Promise<boolean> {
    try {
      // Remove from encrypted storage
      encryptedStorage.removeItem(`data_${id}`);
      
      // Remove from regular storage
      localStorage.removeItem(`data_${id}`);
      
      // Update data index
      const dataIndex = await this.getDataIndex();
      const filteredIndex = dataIndex.filter(item => item.id !== id);
      localStorage.setItem(this.dataIndexKey, JSON.stringify(filteredIndex));
      
      return true;
    } catch (error) {
      console.error(`Failed to delete data ${id}:`, error);
      return false;
    }
  }

  /**
   * Get privacy report
   */
  async getPrivacyReport(): Promise<{
    totalDataItems: number;
    dataByType: Record<string, number>;
    dataBySensitivity: Record<string, number>;
    encryptedItems: number;
    anonymizedItems: number;
    itemsNearExpiry: DataItem[];
    oldestItem: DataItem | null;
    newestItem: DataItem | null;
  }> {
    const dataIndex = await this.getDataIndex();
    const now = new Date();
    
    const report = {
      totalDataItems: dataIndex.length,
      dataByType: {} as Record<string, number>,
      dataBySensitivity: {} as Record<string, number>,
      encryptedItems: 0,
      anonymizedItems: 0,
      itemsNearExpiry: [] as DataItem[],
      oldestItem: null as DataItem | null,
      newestItem: null as DataItem | null,
    };

    for (const item of dataIndex) {
      // Count by type
      report.dataByType[item.type] = (report.dataByType[item.type] || 0) + 1;
      
      // Count by sensitivity
      report.dataBySensitivity[item.sensitivity] = (report.dataBySensitivity[item.sensitivity] || 0) + 1;
      
      // Count encrypted/anonymized
      if (item.encrypted) report.encryptedItems++;
      if (item.anonymized) report.anonymizedItems++;
      
      // Check expiry (within 7 days)
      const ageInDays = (now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const daysUntilExpiry = item.retentionPeriod - ageInDays;
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        report.itemsNearExpiry.push(item);
      }
      
      // Track oldest/newest
      if (!report.oldestItem || new Date(item.createdAt) < new Date(report.oldestItem.createdAt)) {
        report.oldestItem = item;
      }
      if (!report.newestItem || new Date(item.createdAt) > new Date(report.newestItem.createdAt)) {
        report.newestItem = item;
      }
    }

    return report;
  }

  /**
   * Request user consent for data processing
   */
  async requestConsent(dataType: string, purpose: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">Data Processing Consent</h3>
          <p class="text-gray-600 mb-4">
            We need your consent to process <strong>${dataType}</strong> data for: <em>${purpose}</em>
          </p>
          <div class="flex gap-2">
            <button id="consent-allow" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
              Allow
            </button>
            <button id="consent-deny" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">
              Deny
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const allowBtn = modal.querySelector('#consent-allow');
      const denyBtn = modal.querySelector('#consent-deny');

      const cleanup = () => document.body.removeChild(modal);

      allowBtn?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      denyBtn?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // Auto-deny after 30 seconds
      setTimeout(() => {
        if (document.body.contains(modal)) {
          cleanup();
          resolve(false);
        }
      }, 30000);
    });
  }

  // Private helper methods
  private classifyData(data: any, type: string): { sensitivity: DataItem['sensitivity']; retentionDays: number; requiresEncryption: boolean } {
    const dataString = JSON.stringify(data).toLowerCase();
    
    for (const rule of this.classificationRules) {
      const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern;
      if (pattern.test(dataString)) {
        return {
          sensitivity: rule.sensitivity,
          retentionDays: rule.retentionDays,
          requiresEncryption: rule.requiresEncryption
        };
      }
    }

    // Default classification
    return { sensitivity: 'low', retentionDays: 30, requiresEncryption: false };
  }

  private extractTags(data: any): string[] {
    const tags: string[] = [];
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Extract common tags
    const tagPatterns = {
      'financial': /\b(?:money|payment|bank|card|transaction|budget|expense|income)\b/,
      'personal': /\b(?:name|address|phone|email|birthday|age)\b/,
      'health': /\b(?:health|medical|doctor|medicine|symptom|diagnosis)\b/,
      'work': /\b(?:work|job|office|meeting|project|task|colleague)\b/,
      'family': /\b(?:family|parent|child|spouse|relative)\b/,
    };

    for (const [tag, pattern] of Object.entries(tagPatterns)) {
      if (pattern.test(dataString)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private removePersonalIdentifiers(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
        .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const anonymized: any = {};
      for (const [key, value] of Object.entries(data)) {
        anonymized[key] = this.removePersonalIdentifiers(value);
      }
      return anonymized;
    }
    
    return data;
  }

  private extractStatistics(data: any, type: string): any {
    // Extract only statistical/aggregate information
    if (type === 'conversation') {
      return {
        wordCount: JSON.stringify(data).split(' ').length,
        timestamp: new Date().toISOString().split('T')[0], // Date only
        type: 'conversation_stats'
      };
    }
    
    if (type === 'expense') {
      return {
        amount: typeof data.amount === 'number' ? data.amount : 0,
        category: data.category || 'unknown',
        date: new Date().toISOString().split('T')[0],
        type: 'expense_stats'
      };
    }
    
    return { type: `${type}_stats`, processed: true };
  }

  private async getDataIndex(): Promise<DataItem[]> {
    try {
      const stored = localStorage.getItem(this.dataIndexKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async updateDataIndex(dataItem: DataItem): Promise<void> {
    const index = await this.getDataIndex();
    const existing = index.findIndex(item => item.id === dataItem.id);
    
    if (existing >= 0) {
      index[existing] = dataItem;
    } else {
      index.push(dataItem);
    }
    
    localStorage.setItem(this.dataIndexKey, JSON.stringify(index));
  }

  private async generateDataPassword(id: string): Promise<string> {
    // Generate deterministic password from ID and a secret
    const secret = 'mahboob-assistant-encryption-key'; // In production, use environment variable
    const encoder = new TextEncoder();
    const data = encoder.encode(id + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  private startAutoCleanup(): void {
    // Clear existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      const result = await this.cleanupExpiredData();
      if (result.deleted > 0 || result.anonymized > 0) {
        console.log(`Privacy cleanup: ${result.deleted} deleted, ${result.anonymized} anonymized`);
      }
    }, 60 * 60 * 1000);
    
    // Also run immediately
    setTimeout(() => this.cleanupExpiredData(), 1000);
  }
}

// Singleton instance
export const smartPrivacy = new SmartPrivacy();
export default SmartPrivacy;