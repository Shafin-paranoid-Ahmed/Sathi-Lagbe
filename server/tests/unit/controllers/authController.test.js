const request = require('supertest');
const app = require('../../../index');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth Controller', () => {
  describe('POST /api/auth/signup', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with non-BRACU email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@gmail.com',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('BRACU');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      // First registration
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@bracu.ac.bd',
        password: '123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject registration with invalid bracuId', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@bracu.ac.bd',
        password: 'password123',
        bracuId: '123',
        gender: 'Male'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('bracuId');
    });
  });

  describe('POST /api/auth/login', () => {
    let user;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: user.email,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@bracu.ac.bd',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: user.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with missing email', async () => {
      const loginData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject login with missing password', async () => {
      const loginData = {
        email: user.email
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/auth/verify', () => {
    let user, token;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
      token = global.testUtils.generateToken(user._id);
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user._id).toBe(user._id.toString());
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No token');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let user, token;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
      token = global.testUtils.generateToken(user._id);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/auth/delete', () => {
    let user, token;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
      token = global.testUtils.generateToken(user._id);
    });

    it('should delete account successfully', async () => {
      const response = await request(app)
        .delete('/api/auth/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify user was deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should reject account deletion without token', async () => {
      const response = await request(app)
        .delete('/api/auth/delete')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
