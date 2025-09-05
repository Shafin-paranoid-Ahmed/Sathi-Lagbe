const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get user's notifications with filtering
router.get('/', auth, notificationController.getNotifications);

// Get notification categories with unread counts
router.get('/categories', auth, notificationController.getNotificationCategories);

// Get notification statistics
router.get('/stats', auth, notificationController.getNotificationStats);

// Mark notification as read
router.patch('/:notificationId/read', auth, notificationController.markAsRead);

// Delete a notification
router.delete('/:notificationId', auth, notificationController.deleteNotification);

// Get unread notification count (with optional category filter)
router.get('/unreadcount', auth, notificationController.getUnreadCount);

// Mark all notifications as read (with optional category filter)
router.patch('/markallread', auth, notificationController.markAllAsRead);

// Get notification stream (for real-time updates)
router.get('/stream', auth, notificationController.getNotificationStream);

// Send test notification (for development/testing)
router.post('/test', auth, notificationController.sendTestNotification);

module.exports = router;
