import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToPush } from '@/lib/pushSubscription';
import type { UserProfile } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('muzan_auth_token');
    const storedUser = localStorage.getItem('muzan_auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
        // Réabonner au push si la session était déjà active
        setTimeout(() => subscribeToPush(), 2000);
      } catch (e) {
        localStorage.removeItem('muzan_auth_token');
        localStorage.removeItem('muzan_auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('muzan_auth_token', newToken);
    localStorage.setItem('muzan_auth_user', JSON.stringify(newUser));
    // Abonnement aux notifications push (silencieux si refusé)
    setTimeout(() => subscribeToPush(), 1500);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('muzan_auth_token');
    localStorage.removeItem('muzan_auth_user');
  }, []);

  const updateUser = useCallback((updated: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updated };
      localStorage.setItem('muzan_auth_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
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
