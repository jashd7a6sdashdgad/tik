/**
 * Biometric Authentication System
 * Supports WebAuthn, Face ID, Touch ID, and Fingerprint authentication
 */

interface BiometricOptions {
  timeout?: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  authenticatorAttachment?: 'platform' | 'cross-platform';
  residentKey?: 'required' | 'preferred' | 'discouraged';
}

interface BiometricCredential {
  id: string;
  type: 'fingerprint' | 'face' | 'voice' | 'pin' | 'pattern';
  publicKey: string;
  counter: number;
  createdAt: Date;
  lastUsed?: Date;
  deviceInfo: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

interface AuthenticationResult {
  success: boolean;
  credentialId?: string;
  authenticatorData?: ArrayBuffer;
  signature?: ArrayBuffer;
  userHandle?: ArrayBuffer;
  error?: string;
  biometricType?: string;
}

class BiometricAuth {
  private readonly rpName = 'Mahboob Personal Assistant';
  private readonly rpId = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  private readonly credentialStorageKey = 'biometric_credentials';

  /**
   * Check if biometric authentication is supported
   */
  async isSupported(): Promise<{ supported: boolean; types: string[] }> {
    const types: string[] = [];
    
    try {
      // Check WebAuthn support
      if (typeof window !== 'undefined' && 'credentials' in navigator && 'create' in navigator.credentials) {
        // Check for platform authenticator (Touch ID, Face ID, Windows Hello)
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          types.push('platform');
        }
        
        // Check for external authenticators (USB keys, etc.)
        types.push('cross-platform');
      }

      // Check for additional biometric APIs
      if ('OTPCredential' in window) types.push('sms');
      if ('FederatedCredential' in window) types.push('federated');
      
      return {
        supported: types.length > 0,
        types
      };
    } catch (error) {
      console.warn('Error checking biometric support:', error);
      return { supported: false, types: [] };
    }
  }

  /**
   * Register a new biometric credential
   */
  async register(userId: string, username: string, options: BiometricOptions = {}): Promise<BiometricCredential | null> {
    try {
      const { supported } = await this.isSupported();
      if (!supported) {
        throw new Error('Biometric authentication not supported');
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const createCredentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: this.rpName,
            id: this.rpId,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: options.authenticatorAttachment || 'platform',
            userVerification: options.userVerification || 'required',
            residentKey: options.residentKey || 'preferred',
            requireResidentKey: false,
          },
          timeout: options.timeout || 60000,
          attestation: 'direct',
        },
      };

      const credential = await navigator.credentials.create(createCredentialOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyArrayBuffer = response.getPublicKey();
      
      if (!publicKeyArrayBuffer) {
        throw new Error('Failed to get public key');
      }

      // Create credential record
      const biometricCredential: BiometricCredential = {
        id: credential.id,
        type: this.detectBiometricType(options.authenticatorAttachment || 'platform'),
        publicKey: this.arrayBufferToBase64(publicKeyArrayBuffer),
        counter: 0,
        createdAt: new Date(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        },
      };

      // Store credential
      await this.storeCredential(biometricCredential);

      console.log('Biometric credential registered successfully');
      return biometricCredential;

    } catch (error) {
      console.error('Biometric registration failed:', error);
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * Authenticate using biometric
   */
  async authenticate(options: BiometricOptions = {}): Promise<AuthenticationResult> {
    try {
      const { supported } = await this.isSupported();
      if (!supported) {
        return { success: false, error: 'Biometric authentication not supported' };
      }

      const credentials = await this.getStoredCredentials();
      if (credentials.length === 0) {
        return { success: false, error: 'No biometric credentials registered' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const getCredentialOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          allowCredentials: credentials.map(cred => ({
            id: this.base64ToArrayBuffer(cred.id),
            type: 'public-key',
            transports: ['internal', 'usb', 'nfc', 'ble'] as AuthenticatorTransport[],
          })),
          timeout: options.timeout || 60000,
          userVerification: options.userVerification || 'required',
          rpId: this.rpId,
        },
      };

      const credential = await navigator.credentials.get(getCredentialOptions) as PublicKeyCredential;
      
      if (!credential) {
        return { success: false, error: 'Authentication cancelled' };
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      
      // Update credential usage
      await this.updateCredentialUsage(credential.id);

      // Determine biometric type used
      const usedCredential = credentials.find(c => c.id === credential.id);
      
      return {
        success: true,
        credentialId: credential.id,
        authenticatorData: response.authenticatorData,
        signature: response.signature,
        userHandle: response.userHandle || undefined,
        biometricType: usedCredential?.type || 'unknown',
      };

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { 
        success: false, 
        error: `Authentication failed: ${error}` 
      };
    }
  }

  /**
   * Quick biometric check (for app unlock)
   */
  async quickAuth(): Promise<boolean> {
    const result = await this.authenticate({ 
      timeout: 10000, 
      userVerification: 'preferred' 
    });
    return result.success;
  }

  /**
   * Get all stored credentials
   */
  async getStoredCredentials(): Promise<BiometricCredential[]> {
    try {
      const stored = localStorage.getItem(this.credentialStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store a credential
   */
  private async storeCredential(credential: BiometricCredential): Promise<void> {
    const credentials = await this.getStoredCredentials();
    credentials.push(credential);
    localStorage.setItem(this.credentialStorageKey, JSON.stringify(credentials));
  }

  /**
   * Update credential usage timestamp
   */
  private async updateCredentialUsage(credentialId: string): Promise<void> {
    const credentials = await this.getStoredCredentials();
    const credential = credentials.find(c => c.id === credentialId);
    
    if (credential) {
      credential.lastUsed = new Date();
      credential.counter += 1;
      localStorage.setItem(this.credentialStorageKey, JSON.stringify(credentials));
    }
  }

  /**
   * Remove a credential
   */
  async removeCredential(credentialId: string): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      const filteredCredentials = credentials.filter(c => c.id !== credentialId);
      
      if (filteredCredentials.length < credentials.length) {
        localStorage.setItem(this.credentialStorageKey, JSON.stringify(filteredCredentials));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Clear all credentials
   */
  async clearAllCredentials(): Promise<void> {
    localStorage.removeItem(this.credentialStorageKey);
  }

  /**
   * Detect biometric type based on authenticator attachment
   */
  private detectBiometricType(attachment: string): BiometricCredential['type'] {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (attachment === 'platform') {
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return 'face'; // Likely Face ID or Touch ID
      } else if (userAgent.includes('android')) {
        return 'fingerprint'; // Android fingerprint
      } else if (platform.includes('win')) {
        return 'face'; // Windows Hello
      } else if (platform.includes('mac')) {
        return 'face'; // Touch ID or Face ID on Mac
      }
    }

    return 'fingerprint'; // Default fallback
  }

  /**
   * Get biometric capabilities of current device
   */
  async getCapabilities(): Promise<{
    hasFingerprint: boolean;
    hasFaceID: boolean;
    hasVoice: boolean;
    hasPIN: boolean;
    platformSupport: string[];
  }> {
    const { types } = await this.isSupported();
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      hasFingerprint: types.includes('platform') && (
        userAgent.includes('android') || 
        userAgent.includes('windows') ||
        userAgent.includes('mac')
      ),
      hasFaceID: types.includes('platform') && (
        userAgent.includes('iphone') || 
        userAgent.includes('ipad') ||
        userAgent.includes('mac')
      ),
      hasVoice: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      hasPIN: true, // Always available as fallback
      platformSupport: types,
    };
  }

  /**
   * Fallback PIN-based authentication
   */
  async authenticateWithPIN(pin: string): Promise<boolean> {
    try {
      // Hash the PIN and compare with stored hash
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const storedPINHash = localStorage.getItem('pin_hash');
      return storedPINHash === hashHex;
    } catch {
      return false;
    }
  }

  /**
   * Set up PIN-based authentication
   */
  async setupPIN(pin: string): Promise<boolean> {
    try {
      if (pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      localStorage.setItem('pin_hash', hashHex);
      return true;
    } catch {
      return false;
    }
  }

  // Utility methods
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
}

// Singleton instance
export const biometricAuth = new BiometricAuth();
export default BiometricAuth;