// Jest setup file for server tests
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

let fixtureCounter = 0;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  // Register models so unique indexes exist for the whole run (drop() in afterEach
  // used to remove indexes and break duplicate-key tests).
  require('../models/User');
  require('../models/RideMatch');
  require('../models/Rating');
  require('../models/chat');
  require('../models/Notification');
  require('../models/Message');
  require('../models/Routine');
  require('../models/Classroom');
  require('../models/Friend');
  require('../models/FriendStatus');
  require('../models/Feedback');
  require('../models/Emergency');
  require('../models/sosContact');
  require('../models/ChatMessage');
  require('../models/freeModels');

  await Promise.all(
    Object.values(mongoose.models).map((Model) =>
      Model.syncIndexes().catch(() => {})
    )
  );
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear documents but keep collections/indexes intact
afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const { name } of collections) {
      if (name.startsWith('system.')) continue;
      await mongoose.connection.db.collection(name).deleteMany({});
    }
  } catch (error) {
    console.warn('Cleanup error:', error.message);
  }
});

// Global test utilities
global.testUtils = {
  // Create a test user
  createTestUser: async (overrides = {}) => {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    const mongoose = require('mongoose');
    
    fixtureCounter += 1;
    const uniqueId = fixtureCounter;

    const defaultUser = {
      name: 'Test User',
      email: `test${uniqueId}@bracu.ac.bd`,
      password: await bcrypt.hash('password123', 10),
      bracuId: String(10000000 + (uniqueId % 89999999)),
      phone: `+8801${uniqueId.toString().padStart(9, '0')}`,
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
    return jwt.sign(
      { userId, id: userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // Create a new ObjectId for testing
  createObjectId: () => {
    const mongoose = require('mongoose');
    return new mongoose.Types.ObjectId();
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

// Mock environment variables. JWT_SECRET must be at least 16 chars to match
// production guard in utils/jwt.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-abcdefghijklmnop';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
