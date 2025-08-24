// server/controllers/notificationController.js
const notificationService = require('../services/notificationService');

// GET /api/notifications?limit=&offset=&category=&priority=&isRead=
exports.getNotifications = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit ?? '20', 10)));
    const offset = Math.max(0, Number.parseInt(req.query.offset ?? '0', 10) || 0);
    const category = req.query.category || null;
    const priority = req.query.priority || null;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : null;
    
    const userId = req.user?.userId || req.user?.id; // comes from auth middleware
    
    const options = {
      limit,
      offset,
      category,
      priority,
      isRead
    };
    
    const notifications = await notificationService.getUserNotifications(userId, options);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// GET /api/notifications/categories
exports.getNotificationCategories = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    // Get unread counts for each category
    const categories = ['ride', 'social', 'matching', 'community', 'personal', 'system'];
    const categoryCounts = {};
    
    for (const category of categories) {
      const count = await notificationService.getUnreadCount(userId, category);
      categoryCounts[category] = count;
    }
    
    res.json({
      categories: categories.map(cat => ({
        name: cat,
        displayName: cat.charAt(0).toUpperCase() + cat.slice(1),
        unreadCount: categoryCounts[cat]
      }))
    });
  } catch (error) {
    console.error('Error getting notification categories:', error);
    res.status(500).json({ error: 'Failed to get notification categories' });
  }
};

// PATCH /api/notifications/:notificationId/read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const notification = await notificationService.markAsRead(notificationId, userId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// GET /api/notifications/unread-count?category=
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const category = req.query.category || null;
    const count = await notificationService.getUnreadCount(userId, category);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// PATCH /api/notifications/mark-all-read?category=
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const category = req.query.category || null;
    const result = await notificationService.markAllAsRead(userId, category);
    
    const message = category 
      ? `All ${category} notifications marked as read`
      : 'All notifications marked as read';
      
    res.json({ 
      message, 
      count: result.modifiedCount,
      category 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// DELETE /api/notifications/:notificationId
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    
    const notification = await notificationService.deleteNotification(notificationId, userId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// POST /api/notifications/test
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { type, title, message, priority = 'medium', category = 'system' } = req.body;
    
    // Validate notification type
    const validTypes = [
      'ride_request', 'ride_invitation', 'ride_confirmation', 'ride_cancellation', 
      'ride_completion', 'eta_change', 'route_change', 'capacity_alert',
      'friend_request', 'friend_activity', 'group_ride_suggestion', 'safety_checkin',
      'better_match_found', 'recurring_ride_alert', 'location_suggestion', 'schedule_conflict',
      'campus_event', 'emergency_alert', 'service_update',
      'ride_insights', 'cost_savings', 'environmental_impact', 'achievement_badge',
      'status_change', 'message', 'sos'
    ];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    const notification = new (require('../models/Notification'))({
      recipient: userId,
      sender: userId, // Self notification for testing
      type,
      title,
      message,
      priority,
      category,
      data: { test: true, timestamp: new Date() }
    });
    
    await notification.save();
    notificationService.sendRealtimeNotifications([notification]);
    
    res.json({ 
      message: 'Test notification sent successfully',
      notification 
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

// GET /api/notifications/stats
exports.getNotificationStats = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    // Get total notifications
    const totalNotifications = await (require('../models/Notification')).countDocuments({ recipient: userId });
    
    // Get unread notifications
    const unreadNotifications = await (require('../models/Notification')).countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
    
    // Get notifications by category
    const categories = ['ride', 'social', 'matching', 'community', 'personal', 'system'];
    const categoryStats = {};
    
    for (const category of categories) {
      const count = await (require('../models/Notification')).countDocuments({ 
        recipient: userId, 
        category 
      });
      categoryStats[category] = count;
    }
    
    // Get notifications by priority
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const priorityStats = {};
    
    for (const priority of priorities) {
      const count = await (require('../models/Notification')).countDocuments({ 
        recipient: userId, 
        priority 
      });
      priorityStats[priority] = count;
    }
    
    res.json({
      total: totalNotifications,
      unread: unreadNotifications,
      read: totalNotifications - unreadNotifications,
      categories: categoryStats,
      priorities: priorityStats
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
};
