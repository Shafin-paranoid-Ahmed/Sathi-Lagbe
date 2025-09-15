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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const countsPromise = Promise.all([
      User.countDocuments(),
      RideMatch.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      Chat.countDocuments()
    ]);

    const userGrowthPromise = User.aggregate([
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

    const weeklyRidePromise = RideMatch.aggregate([
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

    const [counts, userGrowthData, weeklyRideData, friendActivities] = await Promise.all([
      countsPromise,
      userGrowthPromise,
      weeklyRidePromise,
      getFriendActivities(userId)
    ]);

    const [totalUsers, activeRides, totalChats] = counts;

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
    const normalizedUserId = (userId || '').toString();

    const friendships = await Friend.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
      .select('requester recipient')
      .lean();

    const friendIdsSet = new Set();
    friendships.forEach(friendship => {
      const requesterId = friendship.requester?.toString();
      const recipientId = friendship.recipient?.toString();

      if (requesterId === normalizedUserId && recipientId) {
        friendIdsSet.add(recipientId);
      } else if (requesterId) {
        friendIdsSet.add(requesterId);
      }
    });

    const friendIds = Array.from(friendIdsSet);
    if (!friendIds.length) {
      return [];
    }

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [recentRides, recentStatusChanges, recentNotifications] = await Promise.all([
      RideMatch.find({
        riderId: { $in: friendIds },
        createdAt: { $gte: twentyFourHoursAgo }
      })
        .select('startLocation endLocation createdAt riderId')
        .populate('riderId', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({
        _id: { $in: friendIds },
        'status.lastUpdated': { $gte: twentyFourHoursAgo }
      })
        .select('name avatarUrl status')
        .sort({ 'status.lastUpdated': -1 })
        .limit(5)
        .lean(),
      Notification.find({
        recipient: userId,
        createdAt: { $gte: sevenDaysAgo }
      })
        .select('message title createdAt sender data')
        .populate('sender', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const activities = [];

    recentRides.forEach(ride => {
      if (!ride?.riderId) return;
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

    recentStatusChanges.forEach(user => {
      if (!user?.status?.current) return;
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
    });

    recentNotifications.forEach(notification => {
      if (!notification.sender) return;
      activities.push({
        id: `notification_${notification._id}`,
        type: 'notification',
        message: notification.message,
        time: notification.createdAt,
        user: notification.sender.name,
        userAvatar: notification.sender.avatarUrl,
        data: notification.data
      });
    });

    if (activities.length === 0) {
      const generalNotifications = await Notification.find({
        recipient: userId,
        createdAt: { $gte: sevenDaysAgo }
      })
        .select('message title createdAt sender data')
        .populate('sender', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      generalNotifications.forEach(notification => {
        activities.push({
          id: `notification_${notification._id}`,
          type: 'notification',
          message: notification.title || notification.message,
          time: notification.createdAt,
          user: notification.sender?.name || 'System',
          userAvatar: notification.sender?.avatarUrl || null,
          data: notification.data
        });
      });
    }

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



