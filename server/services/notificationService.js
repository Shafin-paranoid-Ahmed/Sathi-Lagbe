const Notification = require('../models/Notification');
const User = require('../models/User');
const Friend = require('../models/Friend');
const { getIO } = require('../utils/socket');

class NotificationService {
  // Send SOS notification to specific recipients with location data
  async sendSosNotification({ recipientIds, senderId, location, latitude, longitude, message }) {
    try {
      console.log('=== SOS NOTIFICATION SERVICE DEBUG ===');
      console.log('Recipient IDs:', recipientIds);
      console.log('Sender ID:', senderId);
      
      const sender = await User.findById(senderId);
      if (!sender) {
        console.error('Sender not found for ID:', senderId);
        throw new Error('Sender not found');
      }
      console.log('Sender found:', sender.name, sender.email);

      const notifications = [];
      for (const recipientId of recipientIds) {
        console.log('Creating notification for recipient:', recipientId);
        const notification = new Notification({
          recipient: recipientId,
          sender: senderId,
          type: 'sos',
          title: `${sender.name || 'A friend'} sent an SOS!`,
          message: message || `${sender.name || 'A friend'} needs help${location ? ` at ${location}` : ''}.`,
          data: {
            userId: senderId,
            userName: sender.name,
            location: location || '',
            coordinates: latitude && longitude ? { latitude, longitude } : undefined,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      if (notifications.length) {
        console.log('Saving', notifications.length, 'notifications to database');
        const savedNotifications = await Notification.insertMany(notifications);
        console.log('Notifications saved:', savedNotifications.map(n => n._id));
        
        console.log('Sending realtime notifications');
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending SOS notification:', error);
      throw error;
    }
  }
  // Send status change notification to all friends
  async sendStatusChangeNotification(userId, newStatus, location = '') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get all friends of the user
      const friends = await this.getUserFriends(userId);
      
      const notifications = [];
      
      for (const friend of friends) {
        const notification = new Notification({
          recipient: friend._id,
          sender: userId,
          type: 'status_change',
          title: `${user.name} updated their status`,
          message: `${user.name} is now ${newStatus}${location ? ` at ${location}` : ''}`,
          data: {
            userId: userId,
            userName: user.name,
            newStatus: newStatus,
            location: location,
            timestamp: new Date()
          }
        });
        
        notifications.push(notification);
      }

      // Save all notifications
      await Notification.insertMany(notifications);

      // Send real-time notifications via socket
      this.sendRealtimeNotifications(notifications);

      return notifications;
    } catch (error) {
      console.error('Error sending status change notification:', error);
      throw error;
    }
  }

  // Get all friends of a user
  async getUserFriends(userId) {
    try {
      // Get all accepted friend relationships where the user is either the user or the friend
      const friendRelationships = await Friend.find({
        $or: [
          { user: userId, status: 'accepted' },
          { friend: userId, status: 'accepted' }
        ]
      }).populate('user', 'name email').populate('friend', 'name email');
      
      // Extract the friend users (not the requesting user)
      const friends = friendRelationships.map(relationship => {
        if (relationship.user._id.toString() === userId) {
          return relationship.friend;
        } else {
          return relationship.user;
        }
      });
      
      return friends;
    } catch (error) {
      console.error('Error getting user friends:', error);
      return [];
    }
  }

  // Send real-time notifications via socket
  sendRealtimeNotifications(notifications) {
    try {
      const io = getIO();
      console.log('=== REALTIME NOTIFICATION DEBUG ===');
      
      notifications.forEach(notification => {
        const room = `user_${notification.recipient.toString()}`;
        console.log('Emitting to room:', room);
        console.log('Notification data:', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message
        });
        
        io.to(room).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log('Notification emitted to room:', room);
      });
    } catch (error) {
      console.error('Error sending realtime notifications:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Get user's notifications
  async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const notifications = await Notification.find({ recipient: userId })
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({ 
        recipient: userId, 
        isRead: false 
      });
      
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
