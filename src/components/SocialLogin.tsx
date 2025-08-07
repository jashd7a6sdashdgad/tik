'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { socialAuth, SocialAuthManager, SocialUserProfile } from '@/lib/socialAuth';
import { 
  Facebook, 
  Instagram, 
  Chrome, 
  LogIn, 
  LogOut, 
  User, 
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface SocialUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  provider: string;
}

interface SocialLoginProps {
  onLogin?: (user: SocialUser) => void;
  onLogout?: (provider: string) => void;
  providers?: string[];
  className?: string;
}

export default function SocialLogin({ 
  onLogin,
  onLogout,
  providers = ['facebook', 'instagram', 'google'],
  className = ''
}: SocialLoginProps) {
  const { language } = useSettings();
  const t = useTranslation(language);
  const [connectedUsers, setConnectedUsers] = useState<Map<string, SocialUser>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Check for existing social connections on component mount
    providers.forEach(provider => {
      const tokens = socialAuth.getStoredTokens(provider);
      if (tokens?.accessToken) {
        loadUserProfile(provider, tokens.accessToken);
      }
    });
  }, []);

  const loadUserProfile = async (provider: string, accessToken: string) => {
    try {
      const profile = await socialAuth.getUserProfile(provider, accessToken);
      if (profile) {
        setConnectedUsers(prev => new Map(prev.set(provider, {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          provider: profile.provider
        })));
        setErrors(prev => new Map(prev).set(provider, ''));
      }
    } catch (error) {
      console.error(`Error loading ${provider} profile:`, error);
      setErrors(prev => new Map(prev.set(provider, 'Failed to load profile')));
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (!socialAuth.isProviderConfigured(provider)) {
      setErrors(prev => new Map(prev.set(provider, `${provider} is not configured`)));
      return;
    }

    setLoading(prev => new Set(prev.add(provider)));
    setErrors(prev => new Map(prev.set(provider, '')));

    try {
      let userProfile: SocialUserProfile | null = null;

      if (provider === 'facebook') {
        // Use Facebook SDK for seamless login
        userProfile = await socialAuth.facebookLogin();
      } else {
        // Use OAuth flow for other providers
        const authUrl = socialAuth.generateAuthUrl(provider);
        if (authUrl) {
          // Open popup window for OAuth
          const popup = window.open(
            authUrl,
            `${provider}_login`,
            'width=600,height=600,scrollbars=yes,resizable=yes'
          );

          // Listen for popup completion
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              // Check if login was successful
              const tokens = socialAuth.getStoredTokens(provider);
              if (tokens?.accessToken) {
                loadUserProfile(provider, tokens.accessToken);
              }
              setLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(provider);
                return newSet;
              });
            }
          }, 1000);

          return; // Exit early for OAuth flow
        }
      }

      if (userProfile) {
        setConnectedUsers(prev => new Map(prev.set(provider, {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          picture: userProfile.picture,
          provider: userProfile.provider
        })));

        onLogin?.(userProfile);
      } else {
        setErrors(prev => new Map(prev.set(provider, 'Login failed')));
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setErrors(prev => new Map(prev.set(provider, `Login failed: ${error}`)));
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(provider);
        return newSet;
      });
    }
  };

  const handleSocialLogout = async (provider: string) => {
    setLoading(prev => new Set(prev.add(provider)));
    
    try {
      await socialAuth.socialLogout(provider);
      setConnectedUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(provider);
        return newMap;
      });
      setErrors(prev => new Map(prev.set(provider, '')));
      onLogout?.(provider);
    } catch (error) {
      console.error(`${provider} logout error:`, error);
      setErrors(prev => new Map(prev.set(provider, `Logout failed: ${error}`)));
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(provider);
        return newSet;
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facebook': return <Facebook className="h-5 w-5" />;
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'google': return <Chrome className="h-5 w-5" />;
      default: return <LogIn className="h-5 w-5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'facebook': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'instagram': return 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white';
      case 'google': return 'bg-red-600 hover:bg-red-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-black">
          <Shield className="h-5 w-5" />
          Social Login & Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-black mb-4">
          Connect your social media accounts for enhanced features and easy login.
        </p>

        <div className="space-y-3">
          {providers.map((provider) => {
            const isConnected = connectedUsers.has(provider);
            const isLoading = loading.has(provider);
            const error = errors.get(provider);
            const user = connectedUsers.get(provider);

            return (
              <div key={provider} className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(provider)}
                    <div>
                      <h4 className="font-medium text-black">{getProviderName(provider)}</h4>
                      {isConnected && user ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Connected</span>
                          </div>
                          <span className="text-xs text-black">as {user.name}</span>
                          {user.picture && (
                            <img 
                              src={user.picture} 
                              alt={user.name}
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not connected</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => isConnected ? handleSocialLogout(provider) : handleSocialLogin(provider)}
                    disabled={isLoading}
                    className={`${
                      isConnected 
                        ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                        : getProviderColor(provider)
                    } min-w-24`}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <>
                        <LogOut className="h-4 w-4 mr-1" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-1" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm pl-3">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connected Accounts Summary */}
        {connectedUsers.size > 0 && (
          <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Connected Accounts</h4>
            <div className="space-y-1">
              {Array.from(connectedUsers.values()).map((user) => (
                <div key={user.id} className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>{getProviderName(user.provider)}: {user.name}</span>
                  {user.email && <span className="text-xs">({user.email})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <Shield className="h-3 w-3 inline mr-1" />
            Your data is secure. We only access basic profile information and authorized social media data.
            You can disconnect any account at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}