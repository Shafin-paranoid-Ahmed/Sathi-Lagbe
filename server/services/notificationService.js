const Notification = require('../models/Notification');
const User = require('../models/User');
const Friend = require('../models/Friend');
const { getIO } = require('../utils/socket');

class NotificationService {
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
    const io = getIO();
    
    notifications.forEach(notification => {
      io.to(`user_${notification.recipient}`).emit('new_notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });
    });
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
