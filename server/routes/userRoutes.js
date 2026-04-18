// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG and WEBP images are allowed'));
    }
    return cb(null, true);
  }
});

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
router.get('/nextclass', auth, userController.getNextClassInfo);
router.post('/triggerautostatus', auth, userController.triggerAutoStatusUpdate);
router.get('/todayroutine', auth, userController.getTodayRoutine);
router.get('/autostatussetup', auth, userController.checkAutoStatusSetup);

// Get user profile by ID (keep AFTER specific routes)
router.get('/:id', auth, userController.getUserProfile);

module.exports = router;