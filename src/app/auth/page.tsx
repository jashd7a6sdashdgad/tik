'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { LoginCredentials } from '@/types';
import { LogOut, UserCheck, Fingerprint, Shield, Zap } from 'lucide-react';
import SocialLogin from '@/components/SocialLogin';

export default function AuthPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  // Biometric authentication states
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasStoredCredential, setHasStoredCredential] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  
  const { login, logout, user, isAuthenticated } = useAuth();
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const router = useRouter();

  // Mobile-specific biometric authentication using WebAuthn optimized for phones
  const checkMobileBiometricSupport = async () => {
    try {
      // Check if we're on a mobile device first
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      console.log('Device detection:', { isMobile, isIOS, isAndroid });

      if (!isMobile) {
        console.log('Not a mobile device - biometric authentication disabled');
        return false;
      }

      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        console.log('WebAuthn not supported on this mobile device');
        return false;
      }

      // Check for platform authenticator (Touch ID, Face ID, Android fingerprint)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Mobile biometric authenticator available:', available);

      // Additional mobile-specific checks
      if (isIOS) {
        // Check if the device likely has biometrics (iOS 8+)
        const hasModernIOS = parseFloat(navigator.userAgent.match(/OS (\d+)_/)?.[1] || '0') >= 8;
        console.log('iOS biometric support detected:', hasModernIOS && available);
        return hasModernIOS && available;
      } else if (isAndroid) {
        // Check for Android 6+ (fingerprint support)
        const androidMatch = navigator.userAgent.match(/Android (\d+)/);
        const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 0;
        const hasModernAndroid = androidVersion >= 6;
        console.log('Android biometric support detected:', hasModernAndroid && available);
        return hasModernAndroid && available;
      }

      return available;
    } catch (error) {
      console.error('Error checking mobile biometric support:', error);
      return false;
    }
  };

  const authenticateWithMobileBiometric = async () => {
    try {
      // Get stored mobile biometric credential
      const storedCredentialId = localStorage.getItem('mobile_biometric_credential_id');
      const storedRawId = localStorage.getItem('mobile_biometric_raw_id');
      const deviceType = localStorage.getItem('mobile_biometric_device_type');
      
      if (!storedCredentialId || !storedRawId) {
        throw new Error('No mobile biometric credential found. Please register your fingerprint or Face ID first.');
      }

      const isIOS = deviceType === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
      console.log('Starting mobile biometric authentication...', { deviceType, isIOS });

      // Convert base64 back to ArrayBuffer
      const rawId = Uint8Array.from(atob(storedRawId), c => c.charCodeAt(0));

      // Mobile-optimized authentication options
      const authenticationOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: rawId.buffer,
            type: 'public-key',
            transports: ['internal'] // Platform authenticator only
          }],
          userVerification: 'required', // Force biometric verification
          timeout: isIOS ? 120000 : 60000, // Longer timeout for iOS Face ID
        }
      };

      console.log('Prompting for mobile biometric authentication...');
      
      const credential = await navigator.credentials.get(authenticationOptions) as PublicKeyCredential;
      
      if (credential) {
        const biometricType = isIOS ? 'Face ID / Touch ID' : 'Fingerprint / Face Unlock';
        console.log('Mobile biometric authentication successful:', biometricType);
        
        return { 
          success: true, 
          type: biometricType,
          credentialId: credential.id,
          deviceType: deviceType
        };
      }
      
      return { success: false, error: 'Mobile biometric authentication failed' };
    } catch (error: any) {
      console.error('Mobile biometric authentication error:', error);
      
      // Mobile-specific error handling
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled. Please try again and use your fingerprint or Face ID.' };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, error: 'Biometric credential is invalid. Please re-register your biometric authentication.' };
      } else if (error.name === 'AbortError') {
        return { success: false, error: 'Authentication timed out. Please try again.' };
      }
      
      return { success: false, error: error.message || 'Mobile biometric authentication failed' };
    }
  };

  const registerMobileBiometric = async () => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      console.log('Starting mobile biometric registration...', { isIOS, isAndroid });

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode('mahboob_mobile');

      // Mobile-optimized WebAuthn configuration
      const credentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Mahboob Personal Assistant',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: 'mahboob',
            displayName: 'Mahboob User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 - preferred by mobile devices
            { alg: -257, type: 'public-key' }, // RS256 - fallback
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Must use platform authenticator (Touch ID, Face ID, fingerprint)
            userVerification: 'required', // Force biometric verification
            residentKey: 'required', // Better for mobile UX
          },
          timeout: isIOS ? 120000 : 60000, // Longer timeout for iOS Face ID
          attestation: 'none', // Better compatibility
          extensions: {
            // Mobile-friendly extensions
            credProps: true,
          },
        },
      };

      console.log('Creating mobile biometric credential...');
      
      const credential = await navigator.credentials.create(credentialOptions) as PublicKeyCredential;

      if (credential && credential.id) {
        // Store credential info optimized for mobile
        const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem('mobile_biometric_credential_id', credential.id);
        localStorage.setItem('mobile_biometric_raw_id', rawIdBase64);
        localStorage.setItem('mobile_biometric_device_type', isIOS ? 'ios' : 'android');
        
        console.log('Mobile biometric credential registered successfully:', credential.id);
        return { success: true, credential, deviceType: isIOS ? 'ios' : 'android' };
      }

      return { success: false, error: 'Failed to create mobile biometric credential' };
    } catch (error: any) {
      console.error('Mobile biometric registration error:', error);
      
      // Mobile-specific error handling
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Please enable biometric authentication in your phone settings and try again' };
      } else if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Your phone does not support biometric authentication' };
      } else if (error.name === 'SecurityError') {
        return { success: false, error: 'Security error - please ensure you are using HTTPS' };
      }
      
      return { success: false, error: error.message || 'Mobile biometric registration failed' };
    }
  };

  // Check biometric support on component mount
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      // Check mobile biometric support
      const available = await checkMobileBiometricSupport();
      setBiometricSupported(available);

      if (available) {
        // Set mobile-specific biometric type
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        if (isIOS) {
          setBiometricType('Face ID / Touch ID');
        } else if (isAndroid) {
          setBiometricType('Fingerprint / Face Unlock');
        } else {
          setBiometricType('Mobile Biometric');
        }

        // Check if there's a stored mobile credential
        const storedCredentialId = localStorage.getItem('mobile_biometric_credential_id');
        setHasStoredCredential(!!storedCredentialId);
        
        console.log('Mobile biometric support available:', available);
        console.log('Has stored mobile credential:', !!storedCredentialId);
      }
    } catch (error) {
      console.error('Error checking mobile biometric support:', error);
    }
  };

  const registerBiometric = async () => {
    try {
      setBiometricLoading(true);
      setError('');

      console.log('Starting mobile biometric registration...');
      const result = await registerMobileBiometric();
      
      if (result.success) {
        setHasStoredCredential(true);
        console.log('Mobile biometric credential registered successfully');
        
        // Show success message with device-specific text
        const deviceName = result.deviceType === 'ios' ? 'Face ID/Touch ID' : 'Fingerprint/Face Unlock';
        alert(`${deviceName} registration successful! You can now use biometric authentication.`);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Mobile biometric registration failed:', error);
      setError(error.message || 'Mobile biometric registration failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  const authenticateBiometric = async () => {
    try {
      setBiometricLoading(true);
      setError('');

      console.log('Starting mobile biometric authentication...');
      const result = await authenticateWithMobileBiometric();
      
      if (result.success) {
        console.log(`Mobile biometric authentication successful: ${result.type}`);
        
        // Simulate successful login after biometric verification
        const loginResult = await login({ username: 'mahboob', password: 'mahboob123' });
        
        if (loginResult.success) {
          alert(`${result.type} authentication successful! Welcome back!`);
          router.push('/dashboard');
        } else {
          setError('Biometric authentication successful but login failed. Please try again.');
        }
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Mobile biometric authentication failed:', error);
      setError(error.message || 'Mobile biometric authentication failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  const clearBiometricCredential = () => {
    localStorage.removeItem('mobile_biometric_credential_id');
    localStorage.removeItem('mobile_biometric_raw_id');
    localStorage.removeItem('mobile_biometric_device_type');
    setHasStoredCredential(false);
    alert('Mobile biometric credentials cleared. You will need to set up fingerprint/Face ID authentication again.');
  };

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !signingOut) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router, signingOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(credentials);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      setSigningOut(false);
      // Stay on auth page after logout
    } catch (error) {
      console.error('Logout error:', error);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      {/* Big Header */}
      <div className="w-full py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-primary mb-2">
                {language === 'ar' ? 'المساعد الشخصي لمحبوب' : 'Mahboob Personal Assistant'}
              </h1>
              <p className="text-xl text-muted-foreground">
                {language === 'ar' 
                  ? 'مساعدك الذكي المدعوم بالذكاء الاصطناعي مع تكامل Google والأوامر الصوتية' 
                  : 'AI-powered personal assistant with Google integrations and voice commands'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          {/* Show sign out option if user is authenticated */}
          {isAuthenticated && user && (
            <Card variant="glass" className="backdrop-blur-lg card-3d mb-6">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <UserCheck className="w-12 h-12 text-green-600 mr-4" />
                  <div>
                    <CardTitle className="text-2xl font-bold text-primary">
                      {language === 'ar' ? 'مرحباً!' : 'Welcome!'}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {language === 'ar' ? `مرحباً، ${user.username}` : `Hello, ${user.username}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  {language === 'ar' ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                  loading={signingOut}
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut 
                    ? (language === 'ar' ? 'جاري تسجيل الخروج...' : 'Signing out...') 
                    : (language === 'ar' ? 'تسجيل الخروج' : 'Sign Out')
                  }
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Login Form */}
          {!isAuthenticated && (
            <Card variant="glass" className="backdrop-blur-lg card-3d">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary">
                  {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </CardTitle>
                <CardDescription className="text-lg">
                  {language === 'ar' ? 'مرحباً بعودتك، محبوب' : 'Welcome back, Mahboob'}
                </CardDescription>
              </CardHeader>
          
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={language === 'ar' ? 'اسم المستخدم' : 'Username'}
                    name="username"
                    type="text"
                    value={credentials.username}
                    onChange={handleChange}
                    placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter your username'}
                    required
                    autoComplete="username"
                  />
                  
                  <Input
                    label={language === 'ar' ? 'كلمة المرور' : 'Password'}
                    name="password"
                    type="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                    required
                    autoComplete="current-password"
                  />
                  
                  {error && (
                    <div className="text-accent text-sm text-center p-2 bg-accent/10 rounded-md">
                      {error}
                    </div>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full"
                    loading={loading}
                    disabled={!credentials.username || !credentials.password}
                  >
                    {loading 
                      ? (language === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...') 
                      : (language === 'ar' ? 'تسجيل الدخول' : 'Sign In')
                    }
                  </Button>
                </form>

                {/* Biometric Authentication Section */}
                {biometricSupported && (
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {language === 'ar' ? 'أو' : 'Or'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      {!hasStoredCredential ? (
                        <Button
                          onClick={registerBiometric}
                          disabled={biometricLoading}
                          variant="outline"
                          className="w-full flex items-center gap-3 relative overflow-hidden group"
                        >
                          <div className="flex items-center gap-3 z-10">
                            <Fingerprint className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">
                                {language === 'ar' ? 'إعداد المصادقة البيومترية' : 'Enable Phone Biometric'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {biometricType}
                              </div>
                            </div>
                          </div>
                          {biometricLoading && (
                            <div className="absolute right-3 animate-pulse">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            </div>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={authenticateBiometric}
                          disabled={biometricLoading}
                          variant="primary"
                          className="w-full flex items-center gap-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white relative overflow-hidden group"
                        >
                          <div className="flex items-center gap-3 z-10">
                            {biometricType.includes('Face') ? (
                              <UserCheck className="w-5 h-5" />
                            ) : (
                              <Fingerprint className="w-5 h-5" />
                            )}
                            <div className="text-left">
                              <div className="font-medium">
                                {language === 'ar' ? 'تسجيل الدخول بالبصمة' : 'Sign In with Phone'}
                              </div>
                              <div className="text-xs opacity-90">
                                {biometricLoading 
                                  ? (language === 'ar' ? 'يرجى استخدام البصمة...' : 'Please use your biometric...') 
                                  : biometricType
                                }
                              </div>
                            </div>
                          </div>
                          {biometricLoading && (
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          )}
                        </Button>
                      )}
                      
                      {hasStoredCredential && (
                        <Button
                          onClick={clearBiometricCredential}
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                        >
                          {language === 'ar' ? 'مسح البيانات البيومترية المحفوظة' : 'Clear stored biometric data'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Google Login Section */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {language === 'ar' ? 'أو' : 'Or'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <SocialLogin 
                      providers={['google']}
                      onLogin={(user) => {
                        console.log('Google login successful:', user);
                        // Handle successful Google login
                        router.push('/dashboard');
                      }}
                      onLogout={(provider) => {
                        console.log('Google logout:', provider);
                      }}
                    />
                  </div>
                </div>
                
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>{language === 'ar' ? 'بيانات تجريبية:' : 'Demo Credentials:'}</p>
                  <p><strong>{language === 'ar' ? 'اسم المستخدم:' : 'Username:'}</strong> mahboob</p>
                  <p><strong>{language === 'ar' ? 'كلمة المرور:' : 'Password:'}</strong> mahboob123</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}