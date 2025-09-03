const Notification = require('../models/Notification');
const User = require('../models/User');
const Friend = require('../models/Friend');
const RideMatch = require('../models/RideMatch');
const { getIO } = require('../utils/socket');

class NotificationService {
  // Send SOS notification to specific recipients with location data
  async sendSosNotification({ recipientIds, senderId, location, latitude, longitude, message }) {
    try {

      
      const sender = await User.findById(senderId);
      if (!sender) {
        console.error('Sender not found for ID:', senderId);
        throw new Error('Sender not found');
      }


      const notifications = [];
      for (const recipientId of recipientIds) {

        const notification = new Notification({
          recipient: recipientId,
          sender: senderId,
          type: 'sos',
          title: `${sender.name || 'A friend'} sent an SOS!`,
          message: message || `${sender.name || 'A friend'} needs help${location ? ` at ${location}` : ''}.`,
          priority: 'urgent',
          category: 'system',
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
          priority: 'medium',
          category: 'social',
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

  // ===== RIDE-RELATED NOTIFICATIONS =====

  // Send ride request notification
  async sendRideRequestNotification(rideId, requesterId, ownerId) {
    try {
      const [requester, owner, ride] = await Promise.all([
        User.findById(requesterId),
        User.findById(ownerId),
        RideMatch.findById(rideId)
      ]);

      const notification = new Notification({
        recipient: ownerId,
        sender: requesterId,
        type: 'ride_request',
        title: `New ride request from ${requester.name}`,
        message: `${requester.name} wants to join your ride from ${ride.startLocation} to ${ride.endLocation}`,
        priority: 'high',
        category: 'ride',
        data: {
          rideId: rideId,
          requesterId: requesterId,
          requesterName: requester.name,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          departureTime: ride.departureTime
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending ride request notification:', error);
      throw error;
    }
  }

  // Send ETA change notification
  async sendEtaChangeNotification(rideId, ownerId, newEta, reason = '') {
    try {
      const [owner, ride] = await Promise.all([
        User.findById(ownerId),
        RideMatch.findById(rideId)
      ]);

      // Get all confirmed riders
      const confirmedRiders = ride.confirmedRiders || [];
      const notifications = [];

      for (const rider of confirmedRiders) {
        const notification = new Notification({
          recipient: rider.user,
          sender: ownerId,
          type: 'eta_change',
          title: `Ride ETA Updated`,
          message: `Your ride to ${ride.endLocation} will now depart at ${new Date(newEta).toLocaleTimeString()}${reason ? ` (${reason})` : ''}`,
          priority: 'high',
          category: 'ride',
          data: {
            rideId: rideId,
            ownerId: ownerId,
            ownerName: owner.name,
            newEta: newEta,
            reason: reason,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation
          }
        });
        notifications.push(notification);
      }

      await Notification.insertMany(notifications);
      this.sendRealtimeNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error sending ETA change notification:', error);
      throw error;
    }
  }

  // Send route change notification
  async sendRouteChangeNotification(rideId, ownerId, newStartLocation, newEndLocation) {
    try {
      const [owner, ride] = await Promise.all([
        User.findById(ownerId),
        RideMatch.findById(rideId)
      ]);

      const confirmedRiders = ride.confirmedRiders || [];
      const notifications = [];

      for (const rider of confirmedRiders) {
        const notification = new Notification({
          recipient: rider.user,
          sender: ownerId,
          type: 'route_change',
          title: `Ride Route Updated`,
          message: `Your ride route has changed. New route: ${newStartLocation} → ${newEndLocation}`,
          priority: 'high',
          category: 'ride',
          data: {
            rideId: rideId,
            ownerId: ownerId,
            ownerName: owner.name,
            oldStartLocation: ride.startLocation,
            oldEndLocation: ride.endLocation,
            newStartLocation: newStartLocation,
            newEndLocation: newEndLocation
          }
        });
        notifications.push(notification);
      }

      await Notification.insertMany(notifications);
      this.sendRealtimeNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error sending route change notification:', error);
      throw error;
    }
  }

  // Send capacity alert notification
  async sendCapacityAlertNotification(rideId, ownerId, availableSeats) {
    try {
      const [owner, ride] = await Promise.all([
        User.findById(ownerId),
        RideMatch.findById(rideId)
      ]);

      // Get users who might be interested in this route
      const interestedUsers = await this.findInterestedUsers(ride.startLocation, ride.endLocation, ride.departureTime);
      const notifications = [];

      for (const userId of interestedUsers) {
        const notification = new Notification({
          recipient: userId,
          sender: ownerId,
          type: 'capacity_alert',
          title: `Seats Available!`,
          message: `${availableSeats} seat(s) available on ride from ${ride.startLocation} to ${ride.endLocation}`,
          priority: 'medium',
          category: 'ride',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expire in 30 minutes
          data: {
            rideId: rideId,
            ownerId: ownerId,
            ownerName: owner.name,
            availableSeats: availableSeats,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            departureTime: ride.departureTime
          }
        });
        notifications.push(notification);
      }

      await Notification.insertMany(notifications);
      this.sendRealtimeNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error sending capacity alert notification:', error);
      throw error;
    }
  }

  // Send ride completion notification
  async sendRideCompletionNotification(rideId, ownerId, riderIds) {
    try {
      const [owner, ride] = await Promise.all([
        User.findById(ownerId),
        RideMatch.findById(rideId)
      ]);

      const notifications = [];

      // Notify owner about completion
      const ownerNotification = new Notification({
        recipient: ownerId,
        sender: riderIds[0], // Use first rider as sender
        type: 'ride_completion',
        title: `Ride Completed`,
        message: `Your ride from ${ride.startLocation} to ${ride.endLocation} has been completed. Don't forget to rate your passengers!`,
        priority: 'medium',
        category: 'ride',
        data: {
          rideId: rideId,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          riderIds: riderIds
        }
      });
      notifications.push(ownerNotification);

      // Notify riders about completion
      for (const riderId of riderIds) {
        const riderNotification = new Notification({
          recipient: riderId,
          sender: ownerId,
          type: 'ride_completion',
          title: `Ride Completed`,
          message: `Your ride from ${ride.startLocation} to ${ride.endLocation} has been completed. Don't forget to rate your driver!`,
          priority: 'medium',
          category: 'ride',
          data: {
            rideId: rideId,
            ownerId: ownerId,
            ownerName: owner.name,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation
          }
        });
        notifications.push(riderNotification);
      }

      await Notification.insertMany(notifications);
      this.sendRealtimeNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error sending ride completion notification:', error);
      throw error;
    }
  }

  // ===== SOCIAL NOTIFICATIONS =====

  // Send friend activity notification
  async sendFriendActivityNotification(userId, friendId, activityType, rideId = null) {
    try {
      const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId)
      ]);

      let title, message, data = {};

      switch (activityType) {
        case 'joined_ride':
          const ride = await RideMatch.findById(rideId);
          title = `${friend.name} joined a ride`;
          message = `${friend.name} joined a ride from ${ride.startLocation} to ${ride.endLocation}`;
          data = { rideId, friendId, friendName: friend.name, startLocation: ride.startLocation, endLocation: ride.endLocation };
          break;
        case 'offered_ride':
          title = `${friend.name} offered a ride`;
          message = `${friend.name} is offering a ride. Check it out!`;
          data = { friendId, friendName: friend.name };
          break;
        default:
          title = `${friend.name} updated their activity`;
          message = `${friend.name} has new activity on the platform`;
          data = { friendId, friendName: friend.name, activityType };
      }

      const notification = new Notification({
        recipient: userId,
        sender: friendId,
        type: 'friend_activity',
        title,
        message,
        priority: 'low',
        category: 'social',
        data
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending friend activity notification:', error);
      throw error;
    }
  }

  // Send group ride suggestion notification
  async sendGroupRideSuggestionNotification(userId, friendIds, rideId) {
    try {
      const [user, ride] = await Promise.all([
        User.findById(userId),
        RideMatch.findById(rideId)
      ]);

      const friends = await User.find({ _id: { $in: friendIds } });
      const friendNames = friends.map(f => f.name).join(', ');

      const notification = new Notification({
        recipient: userId,
        sender: ride.riderId,
        type: 'group_ride_suggestion',
        title: `Group Ride Opportunity!`,
        message: `${friendNames} are also going to ${ride.endLocation}. Consider joining together!`,
        priority: 'medium',
        category: 'social',
        data: {
          rideId: rideId,
          friendIds: friendIds,
          friendNames: friendNames,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          departureTime: ride.departureTime
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending group ride suggestion notification:', error);
      throw error;
    }
  }

  // Send safety check-in notification
  async sendSafetyCheckinNotification(userId, location, status = 'safe') {
    try {
      const user = await User.findById(userId);
      const friends = await this.getUserFriends(userId);

      const notifications = [];

      for (const friend of friends) {
        const notification = new Notification({
          recipient: friend._id,
          sender: userId,
          type: 'safety_checkin',
          title: `${user.name} checked in`,
          message: `${user.name} is ${status} at ${location}`,
          priority: 'medium',
          category: 'social',
          data: {
            userId: userId,
            userName: user.name,
            location: location,
            status: status,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      await Notification.insertMany(notifications);
      this.sendRealtimeNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error sending safety check-in notification:', error);
      throw error;
    }
  }

  // ===== SMART MATCHING NOTIFICATIONS =====

  // Send better match found notification
  async sendBetterMatchNotification(userId, newRideId, oldRideId, matchScore) {
    try {
      const [user, newRide, oldRide] = await Promise.all([
        User.findById(userId),
        RideMatch.findById(newRideId),
        RideMatch.findById(oldRideId)
      ]);

      const notification = new Notification({
        recipient: userId,
        sender: newRide.riderId,
        type: 'better_match_found',
        title: `Better Ride Match Found!`,
        message: `A better match (${matchScore}% compatibility) is available for your route to ${newRide.endLocation}`,
        priority: 'high',
        category: 'matching',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expire in 15 minutes
        data: {
          newRideId: newRideId,
          oldRideId: oldRideId,
          matchScore: matchScore,
          newStartLocation: newRide.startLocation,
          newEndLocation: newRide.endLocation,
          oldStartLocation: oldRide.startLocation,
          oldEndLocation: oldRide.endLocation
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending better match notification:', error);
      throw error;
    }
  }

  // Send recurring ride alert notification
  async sendRecurringRideAlertNotification(userId, rideId, nextDeparture) {
    try {
      const [user, ride] = await Promise.all([
        User.findById(userId),
        RideMatch.findById(rideId)
      ]);

      const notification = new Notification({
        recipient: userId,
        sender: ride.riderId,
        type: 'recurring_ride_alert',
        title: `Recurring Ride Reminder`,
        message: `Your recurring ride from ${ride.startLocation} to ${ride.endLocation} departs in 30 minutes`,
        priority: 'high',
        category: 'matching',
        expiresAt: new Date(nextDeparture),
        data: {
          rideId: rideId,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          nextDeparture: nextDeparture
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending recurring ride alert notification:', error);
      throw error;
    }
  }

  // ===== PERSONALIZED NOTIFICATIONS =====

  // Send ride insights notification
  async sendRideInsightsNotification(userId, insights) {
    try {
      const user = await User.findById(userId);

      const notification = new Notification({
        recipient: userId,
        sender: userId, // Self notification
        type: 'ride_insights',
        title: `Your Weekly Ride Insights`,
        message: `You saved $${insights.moneySaved} and reduced ${insights.carbonReduction}kg CO2 this week!`,
        priority: 'low',
        category: 'personal',
        data: {
          insights: insights,
          week: new Date().toISOString().slice(0, 10)
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending ride insights notification:', error);
      throw error;
    }
  }

  // Send achievement badge notification
  async sendAchievementBadgeNotification(userId, badgeType, badgeName) {
    try {
      const user = await User.findById(userId);

      const notification = new Notification({
        recipient: userId,
        sender: userId, // Self notification
        type: 'achievement_badge',
        title: `🏆 Achievement Unlocked!`,
        message: `Congratulations! You've earned the "${badgeName}" badge for ${badgeType}`,
        priority: 'medium',
        category: 'personal',
        data: {
          badgeType: badgeType,
          badgeName: badgeName,
          timestamp: new Date()
        }
      });

      await notification.save();
      this.sendRealtimeNotifications([notification]);
      return notification;
    } catch (error) {
      console.error('Error sending achievement badge notification:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  // Find users interested in a specific route
  async findInterestedUsers(startLocation, endLocation, departureTime) {
    try {
      // This is a simplified version - in a real app, you'd have more sophisticated matching
      const interestedRides = await RideMatch.find({
        startLocation: startLocation,
        endLocation: endLocation,
        departureTime: {
          $gte: new Date(departureTime.getTime() - 30 * 60 * 1000), // 30 minutes before
          $lte: new Date(departureTime.getTime() + 30 * 60 * 1000)  // 30 minutes after
        },
        status: { $ne: 'completed' }
      });

      const userIds = new Set();
      interestedRides.forEach(ride => {
        if (ride.requestedRiders) {
          ride.requestedRiders.forEach(rider => {
            userIds.add(rider.user.toString());
          });
        }
      });

      return Array.from(userIds);
    } catch (error) {
      console.error('Error finding interested users:', error);
      return [];
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
        
        // Emit minimal, but include sender for deep-linking to chat on client
        io.to(room).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          sender: notification.sender ? { _id: notification.sender.toString ? notification.sender.toString() : notification.sender } : undefined,
          priority: notification.priority,
          category: notification.category,
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

  // Get user's notifications with filtering
  async getUserNotifications(userId, options = {}) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        category = null, 
        isRead = null,
        priority = null 
      } = options;

      const query = { recipient: userId };
      
      if (category) query.category = category;
      if (isRead !== null) query.isRead = isRead;
      if (priority) query.priority = priority;

      const notifications = await Notification.find(query)
        .populate('sender', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count by category
  async getUnreadCount(userId, category = null) {
    try {
      const query = { recipient: userId, isRead: false };
      if (category) query.category = category;
      
      const count = await Notification.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId, category = null) {
    try {
      const query = { recipient: userId, isRead: false };
      if (category) query.category = category;
      
      const result = await Notification.updateMany(
        query,
        { isRead: true, readAt: new Date() }
      );
      
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a specific notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });
      
      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete expired notifications
  async deleteExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`Deleted ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      console.error('Error deleting expired notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
