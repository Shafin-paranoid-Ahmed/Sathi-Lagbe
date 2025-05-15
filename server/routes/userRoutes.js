// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Get all users (for friend list)
router.get('/', auth, userController.getAllUsers);

// Search users by name or email
router.get('/search', auth, userController.searchUsers);

// Get user profile by ID
router.get('/:id', auth, userController.getUserProfile);

// Update current user's profile
router.put('/profile', auth, userController.updateProfile);

module.exports = router;