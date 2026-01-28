import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
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

  const login = useCallback(async (email: string, _password: string) => {
    // Mock login - simulating API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser: User = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
    };
    
    const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substr(2, 16);
    
    setUser(mockUser);
    setToken(mockToken);
    localStorage.setItem('verba_user', JSON.stringify(mockUser));
    localStorage.setItem('verba_token', mockToken);
  }, []);

  const signup = useCallback(async (email: string, _password: string, name: string) => {
    // Mock signup - simulating API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser: User = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email,
      name,
    };
    
    const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substr(2, 16);
    
    setUser(mockUser);
    setToken(mockToken);
    localStorage.setItem('verba_user', JSON.stringify(mockUser));
    localStorage.setItem('verba_token', mockToken);
  }, []);

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
