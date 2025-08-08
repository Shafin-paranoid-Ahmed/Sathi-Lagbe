// client/src/api/auth.js - Fixed version
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
      
      // Clear invalid token
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      
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
      return response;
    });
}

export function verifyToken() {
  const token = sessionStorage.getItem('token');
  if (!token) return Promise.reject('No token found');
  
  return API.get('/auth/verify');
}

export function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userName');
  return API.post('/auth/logout');
}

export function deleteAccount() {
  return API.delete('/auth/delete');
}