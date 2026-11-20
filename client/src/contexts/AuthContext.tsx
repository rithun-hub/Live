import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  login: (credentials: { emailOrUsername: string; password: string }) => Promise<any>;
  register: (data: { email: string; username: string; password: string; displayName: string }) => Promise<any>;
  verifyOtp: (data: { email: string; otp: string; purpose: string }) => Promise<any>;
  resendOtp: (email: string, purpose: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('live_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      const data = await api.get('/users/profile');
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn('Failed to fetch profile', err);
      api.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  const login = async (credentials: { emailOrUsername: string; password: string }) => {
    const data = await api.post('/auth/login', credentials);
    if (!data.requiresOtp && data.accessToken) {
      localStorage.setItem('live_access_token', data.accessToken);
      localStorage.setItem('live_refresh_token', data.refreshToken);
      setUser(data.user);
    }
    return data;
  };

  const register = async (userData: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }) => {
    return api.post('/auth/register', userData);
  };

  const verifyOtp = async (data: { email: string; otp: string; purpose: string }) => {
    const res = await api.post('/auth/verify-otp', data);
    if (res.accessToken) {
      localStorage.setItem('live_access_token', res.accessToken);
      localStorage.setItem('live_refresh_token', res.refreshToken);
      setUser(res.user);
    }
    return res;
  };

  const resendOtp = async (email: string, purpose: string) => {
    return api.post('/auth/resend-otp', { email, purpose });
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('live_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // ignore
    } finally {
      api.clearTokens();
      setUser(null);
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'ADMIN';
  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isCreator,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

