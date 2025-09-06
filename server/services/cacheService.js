// server/services/cacheService.js - Redis caching service
const { createClient } = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Use Redis URL from environment or default to localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('Redis server connection refused, retrying...');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.log('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.log('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.log('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.log('Redis connection failed, continuing without cache:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache key generators
  static getUserKey(userId) {
    return `user:${userId}`;
  }

  static getRidesKey(filters = {}) {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `rides:${filterStr}`;
  }

  static getNotificationsKey(userId, category = 'all') {
    return `notifications:${userId}:${category}`;
  }

  static getClassroomsKey() {
    return 'classrooms:all';
  }

  static getStatsKey(userId) {
    return `stats:${userId}`;
  }

  // Cache invalidation helpers
  async invalidateUser(userId) {
    await this.del(CacheService.getUserKey(userId));
    await this.del(CacheService.getStatsKey(userId));
  }

  async invalidateRides() {
    // Get all ride cache keys and delete them
    if (!this.isConnected || !this.client) return;
    
    try {
      const keys = await this.client.keys('rides:*');
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async invalidateNotifications(userId) {
    if (!this.isConnected || !this.client) return;
    
    try {
      const keys = await this.client.keys(`notifications:${userId}:*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
