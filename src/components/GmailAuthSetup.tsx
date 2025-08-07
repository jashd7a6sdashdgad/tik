'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  Shield, 
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Wifi,
  Settings
} from 'lucide-react';
import { initializeGmailApi } from '@/lib/gmailApi';

interface GmailCredentials {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

interface GmailAuthSetupProps {
  onAuthSuccess?: (credentials: GmailCredentials) => void;
  onAuthError?: (error: string) => void;
}

export default function GmailAuthSetup({ onAuthSuccess, onAuthError }: GmailAuthSetupProps) {
  const [step, setStep] = useState<'setup' | 'authorize' | 'configure' | 'success'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [credentials, setCredentials] = useState<Partial<GmailCredentials>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [error, setError] = useState('');

  // OAuth configuration
  const OAUTH_CONFIG = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
    responseType: 'code',
    accessType: 'offline',
    prompt: 'consent'
  };

  // Generate OAuth URL
  const generateAuthUrl = useCallback(() => {
    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.clientId,
      redirect_uri: OAUTH_CONFIG.redirectUri,
      scope: OAUTH_CONFIG.scope,
      response_type: OAUTH_CONFIG.responseType,
      access_type: OAUTH_CONFIG.accessType,
      prompt: OAUTH_CONFIG.prompt
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    setAuthUrl(url);
    setStep('authorize');
  }, []);

  // Exchange auth code for tokens
  const exchangeAuthCode = async () => {
    if (!authCode.trim()) {
      setError('Please enter the authorization code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: OAUTH_CONFIG.clientId,
          client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '',
          redirect_uri: OAUTH_CONFIG.redirectUri,
          code: authCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth error: ${response.status} ${response.statusText}`);
      }

      const tokens = await response.json();
      
      const gmailCredentials: GmailCredentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        clientId: OAUTH_CONFIG.clientId,
        clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
      };

      setCredentials(gmailCredentials);
      
      // Test the connection
      const gmailService = initializeGmailApi(gmailCredentials);
      await gmailService.getProfile();
      
      // Store credentials securely
      localStorage.setItem('gmail_credentials', JSON.stringify(gmailCredentials));
      
      setStep('success');
      onAuthSuccess?.(gmailCredentials);
    } catch (error) {
      console.error('Authentication failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual credential setup
  const handleManualSetup = () => {
    setStep('configure');
  };

  // Save manual credentials
  const saveManualCredentials = async () => {
    if (!credentials.accessToken) {
      setError('Access token is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const gmailCredentials: GmailCredentials = {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      };

      // Test the connection
      const gmailService = initializeGmailApi(gmailCredentials);
      await gmailService.getProfile();
      
      // Store credentials
      localStorage.setItem('gmail_credentials', JSON.stringify(gmailCredentials));
      
      setStep('success');
      onAuthSuccess?.(gmailCredentials);
    } catch (error) {
      console.error('Manual setup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Reset setup
  const resetSetup = () => {
    setStep('setup');
    setError('');
    setAuthCode('');
    setCredentials({});
    setAuthUrl('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Gmail API Setup
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect your Gmail account to enable Email Intelligence features
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {[
              { key: 'setup', label: 'Setup', icon: Settings },
              { key: 'authorize', label: 'Authorize', icon: Shield },
              { key: 'configure', label: 'Configure', icon: Key },
              { key: 'success', label: 'Complete', icon: CheckCircle }
            ].map((item, index) => {
              const Icon = item.icon;
              const isActive = step === item.key;
              const isCompleted = ['setup', 'authorize', 'configure'].indexOf(step) > index;
              
              return (
                <div key={item.key} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2
                    ${isActive ? 'bg-primary text-primary-foreground border-primary' :
                      isCompleted ? 'bg-green-500 text-white border-green-500' :
                      'bg-muted text-muted-foreground border-muted-foreground'}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`ml-2 text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {index < 3 && (
                    <div className={`ml-4 w-8 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Setup Step */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Before you begin</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You'll need a Google Cloud Project with Gmail API enabled</li>
                  <li>• OAuth 2.0 credentials configured for web application</li>
                  <li>• Appropriate redirect URIs set up</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={generateAuthUrl}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <div>
                        <h3 className="font-medium">OAuth Flow</h3>
                        <p className="text-sm text-muted-foreground">Recommended secure setup</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleManualSetup}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Key className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-medium">Manual Setup</h3>
                        <p className="text-sm text-muted-foreground">Enter credentials directly</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Authorization Step */}
          {step === 'authorize' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">Authorization Required</h3>
                  <p className="text-sm text-yellow-800">
                    Click the link below to authorize access to your Gmail account, then paste the authorization code here.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">1. Click to authorize Gmail access:</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(authUrl, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Authorize Gmail Access
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(authUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="authCode" className="text-sm font-medium">
                    2. Enter authorization code:
                  </label>
                  <input
                    id="authCode"
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste the authorization code here..."
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={resetSetup} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={exchangeAuthCode}
                  disabled={isLoading || !authCode.trim()}
                  className="flex-1"
                >
                  {isLoading ? 'Authenticating...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}

          {/* Manual Configuration Step */}
          {step === 'configure' && (
            <div className="space-y-6">
              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Manual Configuration</h3>
                <p className="text-sm text-orange-800">
                  Enter your Gmail API credentials manually. These will be stored securely in your browser.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="accessToken" className="text-sm font-medium">
                    Access Token * <span className="text-red-500">Required</span>
                  </label>
                  <div className="relative">
                    <input
                      id="accessToken"
                      type={showSecrets ? 'text' : 'password'}
                      value={credentials.accessToken || ''}
                      onChange={(e) => setCredentials({...credentials, accessToken: e.target.value})}
                      placeholder="Enter access token..."
                      className="w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="refreshToken" className="text-sm font-medium">
                    Refresh Token <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    id="refreshToken"
                    type={showSecrets ? 'text' : 'password'}
                    value={credentials.refreshToken || ''}
                    onChange={(e) => setCredentials({...credentials, refreshToken: e.target.value})}
                    placeholder="Enter refresh token..."
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="clientId" className="text-sm font-medium">
                      Client ID <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <input
                      id="clientId"
                      type="text"
                      value={credentials.clientId || ''}
                      onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                      placeholder="Google OAuth Client ID..."
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clientSecret" className="text-sm font-medium">
                      Client Secret <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <input
                      id="clientSecret"
                      type={showSecrets ? 'text' : 'password'}
                      value={credentials.clientSecret || ''}
                      onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                      placeholder="Google OAuth Client Secret..."
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={resetSetup} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={saveManualCredentials}
                  disabled={isLoading || !credentials.accessToken}
                  className="flex-1"
                >
                  {isLoading ? 'Testing Connection...' : 'Save & Test'}
                </Button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-900">Gmail Successfully Connected!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your Email Intelligence system is now ready to use with live Gmail data.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                <div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <Wifi className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  <p className="text-xs text-green-700 mt-1">Gmail API Active</p>
                </div>
                <div>
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    <Shield className="w-3 h-3 mr-1" />
                    Secure
                  </Badge>
                  <p className="text-xs text-blue-700 mt-1">OAuth 2.0 Protected</p>
                </div>
              </div>

              <Button onClick={() => window.location.reload()} className="w-full">
                Continue to Email Intelligence
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}