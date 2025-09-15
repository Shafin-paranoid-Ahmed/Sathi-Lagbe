// Vitest setup file for client tests
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:5000',
        VITE_GOOGLE_MAPS_API_KEY: 'test-maps-key'
      }
    }
  }
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
global.testUtils = {
  // Mock API responses
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  }),
  
  // Mock user data
  mockUser: {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@bracu.ac.bd',
    bracuId: '12345678',
    gender: 'Male',
    avatarUrl: 'https://example.com/avatar.jpg'
  },
  
  // Mock ride data
  mockRide: {
    _id: '507f1f77bcf86cd799439012',
    riderId: '507f1f77bcf86cd799439011',
    riderName: 'Test User',
    riderGender: 'Male',
    departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    startLocation: 'BRAC University',
    endLocation: 'Dhanmondi',
    status: 'pending',
    availableSeats: 3,
    requestedRiders: [],
    confirmedRiders: []
  },
  
  // Mock chat data
  mockChat: {
    _id: '507f1f77bcf86cd799439013',
    members: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439014'],
    lastMessage: {
      _id: '507f1f77bcf86cd799439015',
      text: 'Hello!',
      sender: '507f1f77bcf86cd799439011',
      createdAt: new Date()
    },
    unreadMessageCount: 0
  },
  
  // Mock notification data
  mockNotification: {
    _id: '507f1f77bcf86cd799439016',
    userId: '507f1f77bcf86cd799439011',
    type: 'ride_request',
    title: 'New Ride Request',
    message: 'John Doe wants to join your ride',
    read: false,
    createdAt: new Date()
  }
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  sessionStorageMock.clear();
  localStorageMock.clear();
});
