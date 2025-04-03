"use client"

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react'
import api from '@/services/api' // Use your configured Axios instance
import authService from '@/services/authService' // Import authService

interface UserProfile {
  credit_balance: number;
  free_transform_used: boolean; // Keep if backend still sends it
  // Add other profile fields if needed
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  googleLogin: (googleToken: string) => Promise<void>; // Added for Google
  logout: () => void;
  refreshUserProfile: () => Promise<void>; // Added function signature
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true) // Start loading until checked

  // --- CHANGE: Function to fetch/refresh user profile ---
  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // No token, can't refresh
      // Optionally set loading to false if this is the primary check
      // setLoading(false);
      return;
    }
    // console.log("AuthContext: Attempting to refresh user profile..."); // Debug log
    setLoading(true); // Indicate loading during refresh
    try {
      // Use authService to get profile
      const userData = await authService.getProfile();
      // console.log("AuthContext: Profile refreshed successfully:", userData); // Debug log
      setUser(userData); // Update user state
    } catch (error) {
      console.error("AuthContext: Failed to refresh user profile:", error)
      // If refresh fails (e.g., token expired), log out
      await logout(); // Use await here
    } finally {
       setLoading(false); // Stop loading indicator
    }
  }, []); // No dependencies needed for useCallback here, logout is stable


  const checkAuthStatus = useCallback(async () => {
    // console.log("AuthContext: Checking auth status..."); // Debug log
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        // Set token for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        // Fetch profile immediately
        await refreshUserProfile(); // Fetch profile on initial load if token exists
    } else {
        // console.log("AuthContext: No access token found."); // Debug log
        setLoading(false); // No token, stop loading
    }
  }, [refreshUserProfile]); // Add refreshUserProfile as dependency

  useEffect(() => {
    checkAuthStatus();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    // console.log("AuthContext: Logging in user:", userData); // Debug log
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setUser(userData);
    setLoading(false); // Stop loading on successful login
  }

  // --- CHANGE: Google Login Implementation ---
  const googleLogin = async (googleToken: string) => {
    setLoading(true);
    try {
      // console.log("AuthContext: Attempting Google Login..."); // Debug log
      const response = await authService.googleLogin(googleToken);
      // console.log("AuthContext: Google Login successful, response:", response); // Debug log
      // The login function handles setting tokens and user state
      login(response.access, response.refresh, response.user);
    } catch (error) {
      console.error("AuthContext: Google login failed:", error);
      // Handle Google login specific errors if needed
      await logout(); // Ensure clean state on failure
      throw error; // Re-throw error so the calling component can handle it (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => { // Make logout async
    // console.log("AuthContext: Logging out user..."); // Debug log
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
        try {
          // Call backend logout endpoint if needed (optional, depends on backend setup)
          // await api.post('/api/logout/', { refresh_token: refreshToken });
          // console.log("AuthContext: Backend logout called (if implemented)."); // Debug log
        } catch (error) {
            console.error("AuthContext: Backend logout failed (might be okay if endpoint doesn't exist):", error);
        }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false); // Ensure loading is false on logout
    // Optionally clear other user-related data from local storage
    // localStorage.removeItem('some_other_user_data');
  }, []); // No dependencies needed


  return (
    <AuthContext.Provider value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        googleLogin, // Expose googleLogin
        logout,
        refreshUserProfile // Expose refresh function
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