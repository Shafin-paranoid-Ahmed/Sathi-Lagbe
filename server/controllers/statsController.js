// server/controllers/statsController.js
const User = require('../models/User');
const RideMatch = require('../models/RideMatch');
const Chat = require('../models/chat');
const Message = require('../models/Message');
const Friend = require('../models/Friend');
const Notification = require('../models/Notification');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active rides (pending and confirmed)
    const activeRides = await RideMatch.countDocuments({ 
      status: { $in: ['pending', 'confirmed'] } 
    });
    
    // Get total chats count
    const totalChats = await Chat.countDocuments();
    
    // Get user growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Get weekly ride activity (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyRideData = await RideMatch.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.day': 1 }
      }
    ]);
    
    // Get friend activities for the current user
    const friendActivities = await getFriendActivities(userId);
    
    res.json({
      totalUsers,
      activeRides,
      totalChats,
      userGrowth: userGrowthData,
      weeklyRideActivity: weeklyRideData,
      friendActivities
    });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    res.status(500).json({ error: err.message || 'Failed to get dashboard statistics' });
  }
};

/**
 * Get friend activities for the current user
 */
async function getFriendActivities(userId) {
  try {
    // Get user's friends
    const friendships = await Friend.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name email avatarUrl');
    
    const friendIds = friendships.map(friendship => 
      friendship.requester._id.toString() === userId 
        ? friendship.recipient._id 
        : friendship.requester._id
    );
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Get recent activities from friends
    const activities = [];
    
    // Get recent ride offers from friends
    const recentRides = await RideMatch.find({
      riderId: { $in: friendIds },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('riderId', 'name avatarUrl')
    .sort({ createdAt: -1 })
    .limit(5);
    
    recentRides.forEach(ride => {
      activities.push({
        id: `ride_${ride._id}`,
        type: 'ride',
        message: `${ride.riderId.name} offered a ride from ${ride.startLocation} to ${ride.endLocation}`,
        time: ride.createdAt,
        user: ride.riderId.name,
        userAvatar: ride.riderId.avatarUrl,
        data: { rideId: ride._id }
      });
    });
    
    // Get recent status changes from friends
    const recentStatusChanges = await User.find({
      _id: { $in: friendIds },
      'status.lastUpdated': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .select('name avatarUrl status')
    .sort({ 'status.lastUpdated': -1 })
    .limit(5);
    
    recentStatusChanges.forEach(user => {
      if (user.status && user.status.current) {
        const statusLabels = {
          'available': 'is now available',
          'busy': 'is now busy',
          'in_class': 'is now in class',
          'studying': 'is now studying',
          'free': 'is now free'
        };
        
        activities.push({
          id: `status_${user._id}_${user.status.lastUpdated}`,
          type: 'status',
          message: `${user.name} ${statusLabels[user.status.current] || 'updated their status'}`,
          time: user.status.lastUpdated,
          user: user.name,
          userAvatar: user.avatarUrl,
          data: { status: user.status.current }
        });
      }
    });
    
    // Get recent notifications related to friends
    const recentNotifications = await Notification.find({
      recipient: userId,
      type: { $in: ['ride_request', 'friend_request', 'status_change'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .populate('sender', 'name avatarUrl')
    .sort({ createdAt: -1 })
    .limit(5);
    
    recentNotifications.forEach(notification => {
      if (notification.sender) {
        activities.push({
          id: `notification_${notification._id}`,
          type: 'notification',
          message: notification.message,
          time: notification.createdAt,
          user: notification.sender.name,
          userAvatar: notification.sender.avatarUrl,
          data: notification.data
        });
      }
    });
    
    // Sort all activities by time and return the most recent 10
    return activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        time: formatTimeAgo(activity.time)
      }));
    
  } catch (err) {
    console.error('Error getting friend activities:', err);
    return [];
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
