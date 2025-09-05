// client/src/api/auth.js - Original authentication API
import axios from 'axios';
import socketService from '../services/socketService';


const BASE = import.meta.env.VITE_API_URL || 'https://sathi-lagbe-backend.vercel.app';
// Ensure no trailing slash to prevent double slashes
const cleanBase = BASE.replace(/\/$/, '');

export const API = axios.create({
  baseURL: `${cleanBase}/api`,
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
      }
      
      // Add a small delay before redirecting
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
      // Clear any existing user-specific data from previous sessions
      const previousUserId = sessionStorage.getItem('userId');
      if (previousUserId) {
        localStorage.removeItem(`chatList_${previousUserId}`);
        localStorage.removeItem(`userAvatarUrl_${previousUserId}`);
        localStorage.removeItem(`darkMode_${previousUserId}`);
        localStorage.removeItem(`theme_${previousUserId}`);
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
  // --- FIX: Explicitly disconnect the socket to prevent duplicate listeners ---
  socketService.disconnect();

  const userId = sessionStorage.getItem('userId');
  
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userName');
  
  if (userId) {
    localStorage.removeItem(`chatList_${userId}`);
    localStorage.removeItem(`userAvatarUrl_${userId}`);
    localStorage.removeItem(`darkMode_${userId}`);
    localStorage.removeItem(`theme_${userId}`);
  }
  
  return API.post('/auth/logout');
}

export function deleteAccount() {
  return API.delete('/auth/delete');
}

// Settings-related functions
export function updateSettings(settingsData) {
    return API.put('/users/profile/settings', settingsData);
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
  return API.get('/users/nextclass');
}

export function triggerAutoStatusUpdate() {
  return API.post('/users/triggerautostatus');
}

export function getTodayRoutine() {
  return API.get('/users/todayroutine');
}

export function checkAutoStatusSetup() {
  return API.get('/users/autostatussetup');
}

export function debugAutoStatus() {
  return API.get('/users/debugautostatus');
}