const Notification = require('../models/Notification');
const User = require('../models/User');
const RideMatch = require('../models/RideMatch');
const { getIO } = require('../utils/socket');

class RideNotificationService {
  // Send ride invitation notification
  async sendRideInvitation(rideId, riderId, invitedUserIds) {
    try {
      console.log('=== RIDE INVITATION NOTIFICATION DEBUG ===');
      console.log('Ride ID:', rideId);
      console.log('Rider ID:', riderId);
      console.log('Invited Users:', invitedUserIds);

      const ride = await RideMatch.findById(rideId).populate('riderId', 'name email');
      if (!ride) {
        throw new Error('Ride not found');
      }

      const notifications = [];
      for (const userId of invitedUserIds) {
        const notification = new Notification({
          recipient: userId,
          sender: riderId,
          type: 'ride_invitation',
          title: `Ride Invitation from ${ride.riderId.name}`,
          message: `${ride.riderId.name} invited you to join their ride from ${ride.startLocation} to ${ride.endLocation} on ${new Date(ride.departureTime).toLocaleDateString()}`,
          data: {
            rideId: rideId,
            riderId: riderId,
            riderName: ride.riderId.name,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            departureTime: ride.departureTime,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      if (notifications.length) {
        const savedNotifications = await Notification.insertMany(notifications);
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending ride invitation notification:', error);
      throw error;
    }
  }

  // Send ride cancellation notification
  async sendRideCancellation(rideId, cancelledByUserId, affectedUserIds, reason = '') {
    try {
      console.log('=== RIDE CANCELLATION NOTIFICATION DEBUG ===');
      console.log('Ride ID:', rideId);
      console.log('Cancelled by:', cancelledByUserId);
      console.log('Affected Users:', affectedUserIds);

      const ride = await RideMatch.findById(rideId).populate('riderId', 'name email');
      if (!ride) {
        throw new Error('Ride not found');
      }

      const cancelledByUser = await User.findById(cancelledByUserId);
      const isRiderCancelling = cancelledByUserId === ride.riderId._id.toString();

      const notifications = [];
      for (const userId of affectedUserIds) {
        if (userId === cancelledByUserId) continue; // Don't notify the person who cancelled

        const notification = new Notification({
          recipient: userId,
          sender: cancelledByUserId,
          type: 'ride_cancellation',
          title: `Ride Cancelled`,
          message: isRiderCancelling 
            ? `${ride.riderId.name} cancelled the ride from ${ride.startLocation} to ${ride.endLocation}${reason ? `: ${reason}` : ''}`
            : `A passenger cancelled their participation in the ride from ${ride.startLocation} to ${ride.endLocation}${reason ? `: ${reason}` : ''}`,
          data: {
            rideId: rideId,
            cancelledByUserId: cancelledByUserId,
            cancelledByName: cancelledByUser.name,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            departureTime: ride.departureTime,
            reason: reason,
            isRiderCancelled: isRiderCancelling,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      if (notifications.length) {
        const savedNotifications = await Notification.insertMany(notifications);
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending ride cancellation notification:', error);
      throw error;
    }
  }

  // Send ETA change notification
  async sendEtaChange(rideId, updatedByUserId, newEta, affectedUserIds) {
    try {
      console.log('=== ETA CHANGE NOTIFICATION DEBUG ===');
      console.log('Ride ID:', rideId);
      console.log('Updated by:', updatedByUserId);
      console.log('New ETA:', newEta);
      console.log('Affected Users:', affectedUserIds);

      const ride = await RideMatch.findById(rideId).populate('riderId', 'name email');
      if (!ride) {
        throw new Error('Ride not found');
      }

      const updatedByUser = await User.findById(updatedByUserId);

      const notifications = [];
      for (const userId of affectedUserIds) {
        if (userId === updatedByUserId) continue; // Don't notify the person who updated

        const notification = new Notification({
          recipient: userId,
          sender: updatedByUserId,
          type: 'eta_change',
          title: `ETA Updated`,
          message: `${updatedByUser.name} updated the ETA for the ride from ${ride.startLocation} to ${ride.endLocation}. New ETA: ${newEta}`,
          data: {
            rideId: rideId,
            updatedByUserId: updatedByUserId,
            updatedByName: updatedByUser.name,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            departureTime: ride.departureTime,
            newEta: newEta,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      if (notifications.length) {
        const savedNotifications = await Notification.insertMany(notifications);
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending ETA change notification:', error);
      throw error;
    }
  }

  // Send ride confirmation notification
  async sendRideConfirmation(rideId, confirmedUserId, confirmedByUserId) {
    try {
      console.log('=== RIDE CONFIRMATION NOTIFICATION DEBUG ===');
      console.log('Ride ID:', rideId);
      console.log('Confirmed User:', confirmedUserId);
      console.log('Confirmed By:', confirmedByUserId);

      const ride = await RideMatch.findById(rideId).populate('riderId', 'name email');
      if (!ride) {
        throw new Error('Ride not found');
      }

      const confirmedByUser = await User.findById(confirmedByUserId);

      const notification = new Notification({
        recipient: confirmedUserId,
        sender: confirmedByUserId,
        type: 'ride_confirmation',
        title: `Ride Confirmed`,
        message: `${confirmedByUser.name} confirmed your participation in the ride from ${ride.startLocation} to ${ride.endLocation}`,
        data: {
          rideId: rideId,
          confirmedByUserId: confirmedByUserId,
          confirmedByName: confirmedByUser.name,
          startLocation: ride.startLocation,
          endLocation: ride.endLocation,
          departureTime: ride.departureTime,
          timestamp: new Date()
        }
      });

      const savedNotification = await notification.save();
      this.sendRealtimeNotifications([savedNotification]);

      return savedNotification;
    } catch (error) {
      console.error('Error sending ride confirmation notification:', error);
      throw error;
    }
  }

  // Send ride completion notification
  async sendRideCompletion(rideId, completedByUserId, participantUserIds) {
    try {
      console.log('=== RIDE COMPLETION NOTIFICATION DEBUG ===');
      console.log('Ride ID:', rideId);
      console.log('Completed by:', completedByUserId);
      console.log('Participants:', participantUserIds);

      const ride = await RideMatch.findById(rideId).populate('riderId', 'name email');
      if (!ride) {
        throw new Error('Ride not found');
      }

      const completedByUser = await User.findById(completedByUserId);

      const notifications = [];
      for (const userId of participantUserIds) {
        if (userId === completedByUserId) continue; // Don't notify the person who marked as completed

        const notification = new Notification({
          recipient: userId,
          sender: completedByUserId,
          type: 'ride_completion',
          title: `Ride Completed`,
          message: `${completedByUser.name} marked the ride from ${ride.startLocation} to ${ride.endLocation} as completed`,
          data: {
            rideId: rideId,
            completedByUserId: completedByUserId,
            completedByName: completedByUser.name,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            departureTime: ride.departureTime,
            timestamp: new Date()
          }
        });
        notifications.push(notification);
      }

      if (notifications.length) {
        const savedNotifications = await Notification.insertMany(notifications);
        this.sendRealtimeNotifications(savedNotifications);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending ride completion notification:', error);
      throw error;
    }
  }

  // Send real-time notifications via socket
  sendRealtimeNotifications(notifications) {
    try {
      const io = getIO();
      console.log('=== RIDE REALTIME NOTIFICATION DEBUG ===');
      
      notifications.forEach(notification => {
        const room = `user_${notification.recipient.toString()}`;
        console.log('Emitting ride notification to room:', room);
        console.log('Notification data:', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data
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
        console.log('Ride notification emitted to room:', room);
      });
    } catch (error) {
      console.error('Error sending realtime ride notifications:', error);
    }
  }

  // Get ride-specific notifications for a user
  async getRideNotifications(userId, rideId = null) {
    try {
      const query = { 
        recipient: userId,
        type: { $in: ['ride_invitation', 'ride_cancellation', 'eta_change', 'ride_confirmation', 'ride_completion'] }
      };

      if (rideId) {
        query['data.rideId'] = rideId;
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'name email avatarUrl')
        .sort({ createdAt: -1 });

      return notifications;
    } catch (error) {
      console.error('Error getting ride notifications:', error);
      throw error;
    }
  }
}

module.exports = new RideNotificationService();
