// src/services/api.ts
import axios from 'axios';

// Get the backend URL from environment variables
// Use NEXT_PUBLIC_ prefix for browser access
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'; // Default to local backend API path

const api = axios.create({
  baseURL: API_BASE_URL, // Ensure this ends with /api
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Ensure the Content-Type isn't overridden for FormData
    if (config.data instanceof FormData) {
      // Let Axios set the correct Content-Type with boundary
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor for handling token refresh or global errors
api.interceptors.response.use(
  (response) => response, // Simply return successful responses
  async (error) => {
    const originalRequest = error.config;

    // Check for unauthorized error and if it's not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retry request

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Attempt to refresh the token (adjust endpoint if different)
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, { // Use full URL for refresh
             refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Update the Authorization header for the original request and the api instance
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          originalRequest.headers['Authorization'] = `Bearer ${access}`;

          // Retry the original request
          return api(originalRequest);

        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Refresh failed, logout the user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          // Redirect to login or dispatch logout event
          // Example: window.location.href = '/login';
          // Make sure to handle this appropriately in your AuthContext or app logic
          // For now, just reject the promise
           return Promise.reject(refreshError);
        }
      } else {
         console.log("No refresh token available for retrying 401");
         // No refresh token, probably needs login
         // Reject the original error
         return Promise.reject(error);
      }
    }

    // For other errors, just reject the promise
    return Promise.reject(error);
  }
);


export default api;