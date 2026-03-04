import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as authService from '../services/authService';

interface User {
  id: string; // UUID
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('verba_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('verba_token');
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authResponse = await authService.login(email, password);
      
      if (!authResponse.success || !authResponse.data) {
        setIsLoading(false);
        return { 
          success: false, 
          error: authResponse.error || 'Login failed' 
        };
      }

      const { access_token } = authResponse.data;
      
      // Get user info using the token
      const userResponse = await authService.getCurrentUser(access_token);
      
      if (!userResponse.success || !userResponse.data) {
        setIsLoading(false);
        return { 
          success: false, 
          error: userResponse.error || 'Failed to get user information' 
        };
      }

      const userData = userResponse.data;
      
      setUser(userData);
      setToken(access_token);
      localStorage.setItem('verba_user', JSON.stringify(userData));
      localStorage.setItem('verba_token', access_token);
      
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const registerResponse = await authService.register({ email, password });
      
      if (!registerResponse.success) {
        setIsLoading(false);
        return { 
          success: false, 
          error: registerResponse.error || 'Registration failed' 
        };
      }

      // Auto login after successful registration
      const loginResult = await login(email, password);
      setIsLoading(false);
      return loginResult;
    } catch (error) {
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('verba_user');
    localStorage.removeItem('verba_token');
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!user && !!token,
      isLoading,
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
