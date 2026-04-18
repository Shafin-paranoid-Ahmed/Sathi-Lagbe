// client/src/api/auth.js - Original authentication API
import axios from 'axios';
import socketService from '../services/socketService.js';

const BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://sathi-lagbe-backend.vercel.app';
// Ensure no trailing slash to prevent double slashes
const cleanBase = BASE.replace(/\/$/, '');

export const API = axios.create({
  baseURL: `${cleanBase}/api`,
});

// Flag to prevent multiple redirects
let isRedirecting = false;

export function clearAuthSession() {
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
}

export function handleUnauthorizedRedirect(redirectTo = '/login?expired=true') {
  if (isRedirecting) return;
  isRedirecting = true;
  clearAuthSession();
  setTimeout(() => {
    window.location.href = redirectTo;
    isRedirecting = false;
  }, 500);
}

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
    if (error.response && error.response.status === 401) {
      handleUnauthorizedRedirect('/login?expired=true');
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

  clearAuthSession();
  
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