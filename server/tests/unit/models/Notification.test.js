const Notification = require('../../../models/Notification');

describe('Notification Model', () => {
  describe('Notification Creation', () => {
    it('should create a notification with valid data', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'ride_request',
        title: 'New Ride Request',
        message: 'John Doe wants to join your ride',
        priority: 'medium',
        category: 'ride'
      };

      const notification = new Notification(notificationData);
      await notification.save();

      expect(notification._id).toBeDefined();
      expect(notification.recipient).toEqual(notificationData.recipient);
      expect(notification.sender).toEqual(notificationData.sender);
      expect(notification.type).toBe(notificationData.type);
      expect(notification.title).toBe(notificationData.title);
      expect(notification.message).toBe(notificationData.message);
      expect(notification.priority).toBe(notificationData.priority);
      expect(notification.category).toBe(notificationData.category);
      expect(notification.isRead).toBe(false);
      expect(notification.data).toEqual({});
    });

    it('should create a notification with default values', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'New Message',
        message: 'You have a new message'
      };

      const notification = new Notification(notificationData);
      await notification.save();

      expect(notification.priority).toBe('medium');
      expect(notification.category).toBe('system');
      expect(notification.isRead).toBe(false);
      expect(notification.data).toEqual({});
      expect(notification.readAt).toBeUndefined();
    });

    it('should require recipient field', async () => {
      const notificationData = {
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'New Message',
        message: 'You have a new message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require sender field', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        type: 'message',
        title: 'New Message',
        message: 'You have a new message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require type field', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        title: 'New Message',
        message: 'You have a new message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require title field', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        message: 'You have a new message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should require message field', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'New Message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate type enum values', async () => {
      const validTypes = [
        'ride_request', 'ride_invitation', 'ride_confirmation', 'ride_cancellation',
        'ride_completion', 'eta_change', 'route_change', 'capacity_alert',
        'friend_request', 'friend_activity', 'group_ride_suggestion', 'safety_checkin',
        'better_match_found', 'recurring_ride_alert', 'location_suggestion', 'schedule_conflict',
        'campus_event', 'emergency_alert', 'service_update',
        'ride_insights', 'cost_savings', 'environmental_impact', 'achievement_badge',
        'status_change', 'message', 'sos'
      ];

      for (const type of validTypes) {
        const notificationData = {
          recipient: global.testUtils.createObjectId(),
          sender: global.testUtils.createObjectId(),
          type,
          title: 'Test Title',
          message: 'Test message'
        };

        const notification = new Notification(notificationData);
        await expect(notification.save()).resolves.toBeDefined();
      }
    });

    it('should reject invalid type values', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'invalid_type',
        title: 'Test Title',
        message: 'Test message'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate priority enum values', async () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of validPriorities) {
        const notificationData = {
          recipient: global.testUtils.createObjectId(),
          sender: global.testUtils.createObjectId(),
          type: 'message',
          title: 'Test Title',
          message: 'Test message',
          priority
        };

        const notification = new Notification(notificationData);
        await expect(notification.save()).resolves.toBeDefined();
      }
    });

    it('should reject invalid priority values', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'Test Title',
        message: 'Test message',
        priority: 'invalid_priority'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate category enum values', async () => {
      const validCategories = ['ride', 'social', 'matching', 'community', 'personal', 'system'];

      for (const category of validCategories) {
        const notificationData = {
          recipient: global.testUtils.createObjectId(),
          sender: global.testUtils.createObjectId(),
          type: 'message',
          title: 'Test Title',
          message: 'Test message',
          category
        };

        const notification = new Notification(notificationData);
        await expect(notification.save()).resolves.toBeDefined();
      }
    });

    it('should reject invalid category values', async () => {
      const notificationData = {
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'Test Title',
        message: 'Test message',
        category: 'invalid_category'
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });
  });

  describe('Notification Methods', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'Test Title',
        message: 'Test message'
      });
      await notification.save();
    });

    it('should mark notification as read', async () => {
      expect(notification.isRead).toBe(false);
      expect(notification.readAt).toBeUndefined();

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBeDefined();
      expect(notification.readAt).toBeInstanceOf(Date);
    });

    it('should update data field', async () => {
      const newData = {
        rideId: global.testUtils.createObjectId(),
        location: 'BRAC University',
        coordinates: { lat: 23.7806, lng: 90.4192 }
      };

      notification.data = newData;
      await notification.save();

      expect(notification.data).toEqual(newData);
    });

    it('should set expiration date', async () => {
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      notification.expiresAt = expirationDate;
      await notification.save();

      expect(notification.expiresAt).toEqual(expirationDate);
    });

    it('should update priority', async () => {
      notification.priority = 'urgent';
      await notification.save();

      expect(notification.priority).toBe('urgent');
    });

    it('should update category', async () => {
      notification.category = 'ride';
      await notification.save();

      expect(notification.category).toBe('ride');
    });
  });

  describe('Notification Indexes', () => {
    it('should have recipient, isRead, and createdAt index', async () => {
      // Create a notification first to ensure collection exists
      const user = await global.testUtils.createTestUser();
      await Notification.create({
        recipient: user._id,
        sender: user._id,
        type: 'ride_request',
        title: 'Test',
        message: 'Test'
      });
      await Notification.ensureIndexes();
      const indexes = await Notification.collection.getIndexes();
      expect(indexes).toHaveProperty('recipient_1_isRead_1_createdAt_-1');
    });

    it('should have recipient, category, and createdAt index', async () => {
      // Create a notification first to ensure collection exists
      const user = await global.testUtils.createTestUser();
      await Notification.create({
        recipient: user._id,
        sender: user._id,
        type: 'ride_request',
        title: 'Test',
        message: 'Test'
      });
      await Notification.ensureIndexes();
      const indexes = await Notification.collection.getIndexes();
      expect(indexes).toHaveProperty('recipient_1_category_1_createdAt_-1');
    });

    it('should have expiresAt TTL index', async () => {
      // Create a notification first to ensure collection exists
      const user = await global.testUtils.createTestUser();
      await Notification.create({
        recipient: user._id,
        sender: user._id,
        type: 'ride_request',
        title: 'Test',
        message: 'Test'
      });
      await Notification.ensureIndexes();
      const indexes = await Notification.collection.getIndexes();
      expect(indexes).toHaveProperty('expiresAt_1');
    });
  });

  describe('Notification Queries', () => {
    let user1, user2, notification1, notification2, notification3;

    beforeEach(async () => {
      user1 = global.testUtils.createObjectId();
      user2 = global.testUtils.createObjectId();

      notification1 = new Notification({
        recipient: user1,
        sender: user2,
        type: 'ride_request',
        title: 'Ride Request',
        message: 'New ride request',
        category: 'ride',
        isRead: false
      });
      await notification1.save();

      notification2 = new Notification({
        recipient: user1,
        sender: user2,
        type: 'message',
        title: 'New Message',
        message: 'You have a new message',
        category: 'social',
        isRead: true
      });
      await notification2.save();

      notification3 = new Notification({
        recipient: user2,
        sender: user1,
        type: 'friend_request',
        title: 'Friend Request',
        message: 'New friend request',
        category: 'social',
        isRead: false
      });
      await notification3.save();
    });

    it('should find notifications by recipient', async () => {
      const notifications = await Notification.find({ recipient: user1 });
      
      expect(notifications).toHaveLength(2);
      expect(notifications.map(n => n._id.toString())).toContain(notification1._id.toString());
      expect(notifications.map(n => n._id.toString())).toContain(notification2._id.toString());
    });

    it('should find unread notifications', async () => {
      const notifications = await Notification.find({ recipient: user1, isRead: false });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0]._id.toString()).toBe(notification1._id.toString());
    });

    it('should find read notifications', async () => {
      const notifications = await Notification.find({ recipient: user1, isRead: true });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0]._id.toString()).toBe(notification2._id.toString());
    });

    it('should find notifications by category', async () => {
      const notifications = await Notification.find({ recipient: user1, category: 'ride' });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0]._id.toString()).toBe(notification1._id.toString());
    });

    it('should sort notifications by createdAt descending', async () => {
      const notifications = await Notification.find({ recipient: user1 }).sort({ createdAt: -1 });
      
      expect(notifications).toHaveLength(2);
      expect(notifications[0].createdAt.getTime()).toBeGreaterThanOrEqual(notifications[1].createdAt.getTime());
    });

    it('should find notifications by type', async () => {
      const notifications = await Notification.find({ type: 'ride_request' });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0]._id.toString()).toBe(notification1._id.toString());
    });
  });

  describe('Notification Timestamps', () => {
    it('should have createdAt timestamp', async () => {
      const notification = new Notification({
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'Test Title',
        message: 'Test message'
      });
      await notification.save();

      expect(notification.createdAt).toBeDefined();
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should set createdAt to current time by default', async () => {
      const beforeCreate = new Date();
      
      const notification = new Notification({
        recipient: global.testUtils.createObjectId(),
        sender: global.testUtils.createObjectId(),
        type: 'message',
        title: 'Test Title',
        message: 'Test message'
      });
      await notification.save();

      const afterCreate = new Date();
      
      expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(notification.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });
});
