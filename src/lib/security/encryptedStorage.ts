/**
 * Encrypted Data Storage System
 * Provides client-side encryption for sensitive data using Web Crypto API
 */

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  timestamp: number;
}

interface StorageOptions {
  keyDerivation?: 'PBKDF2' | 'scrypt';
  algorithm?: 'AES-GCM' | 'AES-CBC';
  keyLength?: 128 | 192 | 256;
  iterations?: number;
}

class EncryptedStorage {
  private readonly storagePrefix = 'enc_';
  private readonly defaultOptions: StorageOptions = {
    keyDerivation: 'PBKDF2',
    algorithm: 'AES-GCM',
    keyLength: 256,
    iterations: 100000
  };

  /**
   * Generate a cryptographic key from password
   */
  private async deriveKey(password: string, salt: Uint8Array, options: StorageOptions): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: options.iterations || this.defaultOptions.iterations!,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: options.algorithm || this.defaultOptions.algorithm!, length: options.keyLength || this.defaultOptions.keyLength! },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate cryptographically secure random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Encrypt data with password
   */
  async encrypt(data: any, password: string, options: StorageOptions = {}): Promise<string> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const encoder = new TextEncoder();
      const salt = this.generateRandomBytes(16);
      const iv = this.generateRandomBytes(12); // 96-bit IV for AES-GCM
      
      const key = await this.deriveKey(password, salt, opts);
      const encodedData = encoder.encode(JSON.stringify(data));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: opts.algorithm!,
          iv: iv
        },
        key,
        encodedData
      );

      const encryptedData: EncryptedData = {
        data: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
        salt: this.arrayBufferToBase64(salt.buffer as ArrayBuffer),
        timestamp: Date.now()
      };

      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data with password
   */
  async decrypt(encryptedString: string, password: string, options: StorageOptions = {}): Promise<any> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const encryptedData: EncryptedData = JSON.parse(encryptedString);
      
      const salt = this.base64ToArrayBuffer(encryptedData.salt);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const data = this.base64ToArrayBuffer(encryptedData.data);

      const key = await this.deriveKey(password, new Uint8Array(salt), opts);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: opts.algorithm!,
          iv: iv
        },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - incorrect password or corrupted data');
    }
  }

  /**
   * Store encrypted data in localStorage
   */
  async setItem(key: string, data: any, password: string, options: StorageOptions = {}): Promise<void> {
    try {
      const encrypted = await this.encrypt(data, password, options);
      localStorage.setItem(this.storagePrefix + key, encrypted);
    } catch (error) {
      throw new Error(`Failed to store encrypted data: ${error}`);
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  async getItem(key: string, password: string, options: StorageOptions = {}): Promise<any> {
    try {
      const encrypted = localStorage.getItem(this.storagePrefix + key);
      if (!encrypted) return null;
      
      return await this.decrypt(encrypted, password, options);
    } catch (error) {
      console.error(`Failed to retrieve encrypted data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove encrypted data
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.storagePrefix + key);
  }

  /**
   * List all encrypted keys
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        keys.push(key.substring(this.storagePrefix.length));
      }
    }
    return keys;
  }

  /**
   * Clear all encrypted data
   */
  clear(): void {
    const keys = this.getAllKeys();
    keys.forEach(key => this.removeItem(key));
  }

  /**
   * Check if data is expired based on TTL
   */
  async isExpired(key: string, ttlMs: number): Promise<boolean> {
    try {
      const encrypted = localStorage.getItem(this.storagePrefix + key);
      if (!encrypted) return true;
      
      const encryptedData: EncryptedData = JSON.parse(encrypted);
      return Date.now() - encryptedData.timestamp > ttlMs;
    } catch {
      return true;
    }
  }

  /**
   * Auto-cleanup expired data
   */
  async cleanupExpired(ttlMs: number): Promise<void> {
    const keys = this.getAllKeys();
    for (const key of keys) {
      if (await this.isExpired(key, ttlMs)) {
        this.removeItem(key);
        console.log(`Cleaned up expired encrypted data: ${key}`);
      }
    }
  }

  // Utility methods for base64 conversion
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBytes = this.generateRandomBytes(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
  }

  /**
   * Verify password strength
   */
  verifyPasswordStrength(password: string): { 
    score: number; 
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Avoid common patterns
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return {
      score,
      feedback,
      isStrong: score >= 5
    };
  }
}

// Singleton instance
export const encryptedStorage = new EncryptedStorage();
export default EncryptedStorage;