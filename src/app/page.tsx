'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, loading });
    
    if (!loading) {
      if (isAuthenticated) {
        console.log('Redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        console.log('Redirecting to auth...');
        router.push('/auth');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Fallback redirect after 3 seconds if still loading
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (loading) {
        console.log('Fallback redirect to auth page after timeout');
        router.push('/auth');
      }
    }, 3000);

    return () => clearTimeout(fallbackTimer);
  }, [loading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-primary mb-2">Personal Assistant</h1>
        <p className="text-muted-foreground mb-4">Loading your personalized experience...</p>
        
        {/* Backup login button */}
        <button
          onClick={() => router.push('/auth')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Login
        </button>
        
        {/* Debug info */}
        <div className="mt-4 text-xs text-gray-500">
          Loading: {loading ? 'true' : 'false'} | 
          Authenticated: {isAuthenticated ? 'true' : 'false'}
        </div>
      </div>
    </div>
  );
}