import { useState, useEffect } from 'react';
import { User, LoginCredentials, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data: AuthResponse = await response.json();
      
      if (data.success && data.user) {
        setAuthState({
          user: data.user,
          loading: false,
          isAuthenticated: true
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          isAuthenticated: false
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();
      
      if (data.success && data.user) {
        setAuthState({
          user: data.user,
          loading: false,
          isAuthenticated: true
        });
      }

      return data;
    } catch (error: any) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      });
    }
  };

  return {
    ...authState,
    login,
    logout,
    refresh: checkAuth
  };
}