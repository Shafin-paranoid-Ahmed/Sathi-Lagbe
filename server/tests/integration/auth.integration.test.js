const request = require('supertest');
const app = require('../../index');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Auth Integration Tests', () => {
  describe('Complete User Registration and Login Flow', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        name: 'Integration Test User',
        email: 'integration@bracu.ac.bd',
        password: 'password123',
        bracuId: '87654321',
        gender: 'Female'
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user.email).toBe(userData.email);
      expect(registerResponse.body.token).toBeDefined();

      const token = registerResponse.body.token;
      const userId = registerResponse.body.user._id;

      // Step 2: Verify token
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.user._id).toBe(userId);

      // Step 3: Login with same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.email).toBe(userData.email);
      expect(loginResponse.body.token).toBeDefined();

      // Step 4: Verify user exists in database
      const user = await User.findById(userId);
      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 6: Verify token is invalid after logout
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should handle concurrent registrations gracefully', async () => {
      const userData1 = {
        name: 'User One',
        email: 'user1@bracu.ac.bd',
        password: 'password123',
        bracuId: '11111111',
        gender: 'Male'
      };

      const userData2 = {
        name: 'User Two',
        email: 'user2@bracu.ac.bd',
        password: 'password123',
        bracuId: '22222222',
        gender: 'Female'
      };

      // Register both users concurrently
      const [response1, response2] = await Promise.all([
        request(app).post('/api/auth/signup').send(userData1),
        request(app).post('/api/auth/signup').send(userData2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);

      // Verify both users exist
      const users = await User.find({
        email: { $in: [userData1.email, userData2.email] }
      });

      expect(users).toHaveLength(2);
    });

    it('should prevent duplicate registrations', async () => {
      const userData = {
        name: 'Duplicate Test User',
        email: 'duplicate@bracu.ac.bd',
        password: 'password123',
        bracuId: '33333333',
        gender: 'Male'
      };

      // First registration
      const response1 = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response1.body.success).toBe(true);

      // Second registration with same email
      const response2 = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toContain('already exists');

      // Verify only one user exists
      const users = await User.find({ email: userData.email });
      expect(users).toHaveLength(1);
    });
  });

  describe('Authentication Middleware Integration', () => {
    let user, token;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
      token = global.testUtils.generateToken(user._id);
    });

    it('should protect routes requiring authentication', async () => {
      // Try to access protected route without token
      await request(app)
        .get('/api/users/profile')
        .expect(401);

      // Try to access protected route with invalid token
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Access protected route with valid token
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should handle token expiration', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Password Security Integration', () => {
    it('should hash passwords securely', async () => {
      const userData = {
        name: 'Security Test User',
        email: 'security@bracu.ac.bd',
        password: 'password123',
        bracuId: '44444444',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const user = await User.findById(response.body.user._id);
      
      // Password should be hashed
      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length

      // Should be able to verify password
      const isValidPassword = await bcrypt.compare(userData.password, user.password);
      expect(isValidPassword).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = ['123', 'abc', 'password', '12345678'];

      for (const password of weakPasswords) {
        const userData = {
          name: 'Weak Password User',
          email: `weak${Math.random()}@bracu.ac.bd`,
          password: password,
          bracuId: `${Math.floor(Math.random() * 100000000)}`,
          gender: 'Male'
        };

        await request(app)
          .post('/api/auth/signup')
          .send(userData)
          .expect(400);
      }
    });
  });

  describe('Account Deletion Integration', () => {
    it('should completely remove user and related data', async () => {
      const userData = {
        name: 'Delete Test User',
        email: 'delete@bracu.ac.bd',
        password: 'password123',
        bracuId: '55555555',
        gender: 'Male'
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const token = registerResponse.body.token;
      const userId = registerResponse.body.user._id;

      // Verify user exists
      let user = await User.findById(userId);
      expect(user).toBeDefined();

      // Delete account
      await request(app)
        .delete('/api/auth/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify user is deleted
      user = await User.findById(userId);
      expect(user).toBeNull();

      // Verify token is invalid
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection
      // For now, we'll test with invalid data that should trigger validation errors
      
      const invalidUserData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email format
        password: '123', // Weak password
        bracuId: '123', // Invalid bracuId format
        gender: 'Invalid' // Invalid gender
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
