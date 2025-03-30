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

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}

const AuthService = {
  // Login user with username and password
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/token/', { username, password });
    
    // Store tokens
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },
  
  // Register a new user
  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post<User>('/register/', data);
    return response.data;
  },
  
  // Google OAuth login
  googleLogin: async (token: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/google-login/', { token });
    
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