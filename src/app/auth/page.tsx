'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import { LoginCredentials } from '@/types';
import { LogOut, UserCheck } from 'lucide-react';

export default function AuthPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  const { login, logout, user, isAuthenticated } = useAuth();
  const { language } = useSettings();
  const { t } = useTranslation(language);
  const router = useRouter();

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
            <img 
              src="/avatar.png" 
              alt={t('personalAssistantAvatar')} 
              className="w-24 h-24 rounded-full border-4 border-primary shadow-xl mr-6"
            />
            <div className="text-left">
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