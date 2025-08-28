// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Get all users (for friend list)
router.get('/', auth, userController.getAllUsers);

// Search users by name or email
router.get('/search', auth, userController.searchUsers);

// Get current user's profile
router.get('/profile', auth, userController.getCurrentUserProfile);

// Update current user's profile
router.put('/profile', auth, userController.updateProfile);

// Update user settings (e.g., routine sharing)
router.put('/profile/settings', auth, userController.updateSettings);

// Update user status
router.patch('/status', auth, userController.updateStatus);

// Get user status
router.get('/status/:userId', auth, userController.getUserStatus);

// Update avatar
router.post('/avatar', auth, upload.single('avatar'), userController.updateAvatar);

// Classroom bookmarks (place BEFORE dynamic ':id' route)
router.get('/bookmarks', auth, userController.getBookmarks);
router.post('/bookmarks/:classroomId', auth, userController.addBookmark);
router.delete('/bookmarks/:classroomId', auth, userController.removeBookmark);

// Auto-status related routes
router.get('/next-class', auth, userController.getNextClassInfo);
router.post('/trigger-auto-status', auth, userController.triggerAutoStatusUpdate);
router.get('/today-routine', auth, userController.getTodayRoutine);
router.get('/auto-status-setup', auth, userController.checkAutoStatusSetup);
router.get('/debug-auto-status', auth, userController.debugAutoStatus);

// Get user profile by ID (keep AFTER specific routes)
router.get('/:id', auth, userController.getUserProfile);

module.exports = router;