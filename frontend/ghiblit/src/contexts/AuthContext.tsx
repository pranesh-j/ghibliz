"use client"

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react'
import api from '@/services/api'
import authService from '@/services/authService'

interface UserProfile {
  credit_balance: number;
  free_transform_used: boolean;

}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
  region?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error("AuthContext: Failed to refresh user profile:", error)
      await logout();
    } finally {
       setLoading(false);
    }
  }, []);


  const checkAuthStatus = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        await refreshUserProfile();
    } else {

        setLoading(false); 
    }
  }, [refreshUserProfile]);

  useEffect(() => {
    checkAuthStatus();
  }, []); 

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setUser(userData);
    setLoading(false);
  }

  const googleLogin = async (googleToken: string) => {
    setLoading(true);
    try {
      const response = await authService.googleLogin(googleToken);
      login(response.access, response.refresh, response.user);
    } catch (error) {
      console.error("AuthContext: Google login failed:", error);
      await logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
        try {
        } catch (error) {
            console.error("AuthContext: Backend logout failed (might be okay if endpoint doesn't exist):", error);
        }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false); 
  }, []); 


  return (
    <AuthContext.Provider value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        googleLogin,
        logout,
        refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}