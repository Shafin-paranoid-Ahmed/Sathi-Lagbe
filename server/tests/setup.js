// Jest setup file for server tests
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  // Create a test user
  createTestUser: async (overrides = {}) => {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    const defaultUser = {
      name: 'Test User',
      email: 'test@bracu.ac.bd',
      password: await bcrypt.hash('password123', 10),
      bracuId: '12345678',
      gender: 'Male',
      ...overrides
    };
    
    return await User.create(defaultUser);
  },
  
  // Create a test ride
  createTestRide: async (overrides = {}) => {
    const RideMatch = require('../models/RideMatch');
    const user = await global.testUtils.createTestUser();
    
    const defaultRide = {
      riderId: user._id,
      riderName: user.name,
      riderGender: user.gender,
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      startLocation: 'BRAC University',
      endLocation: 'Dhanmondi',
      status: 'pending',
      availableSeats: 3,
      requestedRiders: [],
      confirmedRiders: [],
      ...overrides
    };
    
    return await RideMatch.create(defaultRide);
  },
  
  // Create a test chat
  createTestChat: async (overrides = {}) => {
    const Chat = require('../models/chat');
    const user1 = await global.testUtils.createTestUser({ email: 'user1@bracu.ac.bd' });
    const user2 = await global.testUtils.createTestUser({ email: 'user2@bracu.ac.bd' });
    
    const defaultChat = {
      members: [user1._id, user2._id],
      lastMessage: null,
      unreadMessageCount: 0,
      ...overrides
    };
    
    return await Chat.create(defaultChat);
  },
  
  // Generate JWT token
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  },
  
  // Mock request object
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),
  
  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // Mock next function
  mockNext: () => jest.fn()
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
