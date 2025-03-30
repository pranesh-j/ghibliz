// src/services/authService.ts
import api from './api';

export interface UserProfile {
  free_transform_used: boolean;
  credit_balance: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile: UserProfile;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

const AuthService = {  
  // Google OAuth login
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/google-login/', { id_token: idToken });
    
    // Store tokens
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },
  
  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/profile/');
    return response.data;
  },
  
  // Logout user
  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/logout/', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  }
};

export default AuthService;