'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';

interface User {
  id: string;
  cedula: string;
  nombre: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const login = (token: string, userData: User) => {
    // Guardar token en cookie (7 días)
    Cookies.set('auth_token', token, { 
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('auth_token');
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      const token = Cookies.get('auth_token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token inválido, remover
        logout();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Verificación adicional para evitar el error de objetos con {state, value, isStale}
  if (typeof context === 'object' && context !== null && 'state' in context && 'value' in context && 'isStale' in context) {
    console.error('useAuth: El contexto está devolviendo un objeto con propiedades {state, value, isStale}. Devolviendo valores por defecto.');
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: () => {},
      logout: () => {},
      checkAuth: async () => {}
    };
  }
  
  return context;
}
