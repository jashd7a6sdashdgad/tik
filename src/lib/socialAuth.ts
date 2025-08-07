// Social Authentication utilities for Facebook, Instagram, and other platforms

interface SocialAuthProvider {
  name: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
}

export interface SocialUserProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class SocialAuthManager {
  private providers: Map<string, SocialAuthProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Facebook Login
    if (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      this.providers.set('facebook', {
        name: 'Facebook',
        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/facebook/callback`,
        scopes: [
          'email',
          'public_profile',
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish'
        ],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth'
      });
    }

    // Instagram (via Facebook)
    if (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      this.providers.set('instagram', {
        name: 'Instagram',
        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/instagram/callback`,
        scopes: [
          'instagram_basic',
          'instagram_content_publish'
        ],
        authUrl: 'https://api.instagram.com/oauth/authorize'
      });
    }

    // Google (for additional social features)
    if (process.env.GOOGLE_CLIENT_ID) {
      this.providers.set('google', {
        name: 'Google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`,
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/youtube.readonly'
        ],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
      });
    }
  }

  // Generate OAuth URL for social login
  generateAuthUrl(provider: string, state?: string): string | null {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      console.error(`Provider ${provider} not configured`);
      return null;
    }

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      scope: providerConfig.scopes.join(' '),
      response_type: 'code',
      state: state || this.generateState()
    });

    return `${providerConfig.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(provider: string, code: string): Promise<SocialUserProfile | null> {
    try {
      const response = await fetch(`/api/auth/${provider}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error exchanging code for ${provider}:`, error);
      return null;
    }
  }

  // Get user profile from social provider
  async getUserProfile(provider: string, accessToken: string): Promise<SocialUserProfile | null> {
    try {
      let profileUrl = '';
      let profileFields = '';

      switch (provider) {
        case 'facebook':
          profileUrl = 'https://graph.facebook.com/me';
          profileFields = 'id,name,email,picture';
          break;
        case 'instagram':
          profileUrl = 'https://graph.instagram.com/me';
          profileFields = 'id,username,account_type,media_count';
          break;
        case 'google':
          profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const url = profileFields 
        ? `${profileUrl}?fields=${profileFields}&access_token=${accessToken}`
        : `${profileUrl}?access_token=${accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const profile = await response.json();

      return {
        id: profile.id,
        name: profile.name || profile.username || 'Unknown',
        email: profile.email,
        picture: profile.picture?.data?.url || profile.picture,
        provider,
        accessToken,
        expiresAt: Date.now() + (3600 * 1000) // Default 1 hour
      };
    } catch (error) {
      console.error(`Error fetching ${provider} profile:`, error);
      return null;
    }
  }

  // Refresh access token
  async refreshAccessToken(provider: string, refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/auth/${provider}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error(`Error refreshing ${provider} token:`, error);
      return null;
    }
  }

  // Store social auth tokens securely
  storeTokens(provider: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }) {
    const key = `social_auth_${provider}`;
    localStorage.setItem(key, JSON.stringify({
      ...tokens,
      timestamp: Date.now()
    }));
  }

  // Retrieve stored tokens
  getStoredTokens(provider: string): {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null {
    try {
      const key = `social_auth_${provider}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const tokens = JSON.parse(stored);
      
      // Check if token is expired
      if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
        this.clearTokens(provider);
        return null;
      }

      return tokens;
    } catch (error) {
      console.error(`Error retrieving ${provider} tokens:`, error);
      return null;
    }
  }

  // Clear stored tokens
  clearTokens(provider: string) {
    const key = `social_auth_${provider}`;
    localStorage.removeItem(key);
  }

  // Generate secure state parameter
  private generateState(): string {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16)).join('');
  }

  // Check if provider is configured
  isProviderConfigured(provider: string): boolean {
    return this.providers.has(provider);
  }

  // Get all configured providers
  getConfiguredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // Initialize Facebook SDK
  initializeFacebookSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      if ((window as any).FB) {
        resolve();
        return;
      }

      (window as any).fbAsyncInit = function() {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        resolve();
      };

      // Load Facebook SDK
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(script);
    });
  }

  // Facebook Login using SDK
  async facebookLogin(): Promise<SocialUserProfile | null> {
    try {
      await this.initializeFacebookSDK();

      return new Promise((resolve) => {
        (window as any).FB.login((response: any) => {
          if (response.authResponse) {
            (window as any).FB.api('/me', { fields: 'id,name,email,picture' }, (profile: any) => {
              const userProfile: SocialUserProfile = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                picture: profile.picture?.data?.url,
                provider: 'facebook',
                accessToken: response.authResponse.accessToken,
                expiresAt: response.authResponse.expiresIn * 1000 + Date.now()
              };
              
              this.storeTokens('facebook', {
                accessToken: response.authResponse.accessToken,
                expiresAt: userProfile.expiresAt
              });

              resolve(userProfile);
            });
          } else {
            resolve(null);
          }
        }, { 
          scope: 'email,public_profile,pages_show_list,pages_read_engagement' 
        });
      });
    } catch (error) {
      console.error('Facebook login error:', error);
      return null;
    }
  }

  // Logout from social provider
  async socialLogout(provider: string): Promise<void> {
    this.clearTokens(provider);

    if (provider === 'facebook' && (window as any).FB) {
      return new Promise((resolve) => {
        (window as any).FB.logout(() => {
          resolve();
        });
      });
    }
  }
}

// Create singleton instance
export const socialAuth = new SocialAuthManager();