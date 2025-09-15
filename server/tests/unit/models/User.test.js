const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user = new User(userData);
      await user.save();

      expect(user._id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.bracuId).toBe(userData.bracuId);
      expect(user.gender).toBe(userData.gender);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should hash password before saving', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@bracu.ac.bd',
        password: 'password123',
        bracuId: '87654321',
        gender: 'Female'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      const isPasswordHashed = await bcrypt.compare(userData.password, user.password);
      expect(isPasswordHashed).toBe(true);
    });

    it('should require name field', async () => {
      const userData = {
        email: 'test@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should require email field', async () => {
      const userData = {
        name: 'Test User',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should require unique email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should require unique bracuId', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@bracu.ac.bd',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User({
        ...userData,
        email: 'test2@bracu.ac.bd'
      });
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        bracuId: '12345678',
        gender: 'Male'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate bracuId format', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@bracu.ac.bd',
        password: 'password123',
        bracuId: '123', // Too short
        gender: 'Male'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should update last login', async () => {
      const beforeUpdate = user.lastLogin;
      await user.updateLastLogin();
      
      expect(user.lastLogin).not.toEqual(beforeUpdate);
      expect(user.lastLogin).toBeInstanceOf(Date);
    });

    it('should update status', async () => {
      const newStatus = 'busy';
      await user.updateStatus(newStatus);
      
      expect(user.status).toBe(newStatus);
    });
  });

  describe('User Virtuals', () => {
    it('should return public profile without sensitive data', async () => {
      const user = await global.testUtils.createTestUser();
      const publicProfile = user.toPublicJSON();

      expect(publicProfile.password).toBeUndefined();
      expect(publicProfile.__v).toBeUndefined();
      expect(publicProfile._id).toBeDefined();
      expect(publicProfile.name).toBeDefined();
      expect(publicProfile.email).toBeDefined();
    });
  });

  describe('User Indexes', () => {
    it('should have email index', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have bracuId index', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('bracuId_1');
    });
  });
});
