// client/src/api/auth.js - Original authentication API
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API = axios.create({
  baseURL: `${BASE}/api`,
});

// Flag to prevent multiple redirects
let isRedirecting = false;

// Interceptor to add token to requests
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response && error.response.status === 401 && !isRedirecting) {
      console.error('Authentication error (401):', error.response?.data);
      console.error('Request that failed:', error.config.url);
      
      // Prevent multiple redirects
      isRedirecting = true;
      
      // Clear invalid token and user data
      const userId = sessionStorage.getItem('userId');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userName');
      
      // Clear user-specific localStorage data
      if (userId) {
        localStorage.removeItem(`chatList_${userId}`);
        localStorage.removeItem(`userAvatarUrl_${userId}`);
        localStorage.removeItem(`darkMode_${userId}`);
        localStorage.removeItem(`theme_${userId}`);
        console.log('Cleared user-specific data on 401 error for:', userId);
      }
      
      // Add a small delay before redirecting to allow console logs to be seen
      setTimeout(() => {
        window.location.href = '/login?expired=true';
        isRedirecting = false; // Reset flag
      }, 500);
    }
    return Promise.reject(error);
  }
);

export function signup(details) {
  return API.post('/auth/signup', details);
}

export function login(credentials) {
  return API.post('/auth/login', credentials)
    .then(response => {
      // Log successful login data
      console.log('Login successful, received data:', response.data);
      
      // Clear any existing user-specific data from previous sessions
      const previousUserId = sessionStorage.getItem('userId');
      if (previousUserId) {
        localStorage.removeItem(`chatList_${previousUserId}`);
        localStorage.removeItem(`userAvatarUrl_${previousUserId}`);
        localStorage.removeItem(`darkMode_${previousUserId}`);
        localStorage.removeItem(`theme_${previousUserId}`);
        console.log('Cleared previous user data for:', previousUserId);
      }
      
      return response;
    });
}

export function verifyToken() {
  const token = sessionStorage.getItem('token');
  if (!token) return Promise.reject('No token found');
  
  return API.get('/auth/verify');
}

export function logout() {
  const userId = sessionStorage.getItem('userId');
  
  // Clear session storage
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userName');
  
  // Clear user-specific localStorage data
  if (userId) {
    localStorage.removeItem(`chatList_${userId}`);
    localStorage.removeItem(`userAvatarUrl_${userId}`);
    localStorage.removeItem(`darkMode_${userId}`);
    localStorage.removeItem(`theme_${userId}`);
    
    console.log('Cleared user-specific data for:', userId);
  }
  
  return API.post('/auth/logout');
}

export function deleteAccount() {
  return API.delete('/auth/delete');
}

// Status-related functions
export function updateStatus(statusData) {
  return API.patch('/users/status', statusData);
}

export function getCurrentUserStatus() {
  const userId = sessionStorage.getItem('userId');
  if (!userId) return Promise.reject('No user ID found');
  return API.get(`/users/status/${userId}`);
}

// Auto-status related functions
export function getNextClassInfo() {
  return API.get('/users/next-class');
}

export function triggerAutoStatusUpdate() {
  return API.post('/users/trigger-auto-status');
}

export function getTodayRoutine() {
  return API.get('/users/today-routine');
}

export function checkAutoStatusSetup() {
  return API.get('/users/auto-status-setup');
}

export function debugAutoStatus() {
  return API.get('/users/debug-auto-status');
}