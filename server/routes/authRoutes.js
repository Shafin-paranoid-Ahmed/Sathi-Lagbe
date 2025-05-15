// server/routes/authRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyToken } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Registration routes - support both naming conventions for compatibility
router.post('/register', registerUser);
router.post('/signup', registerUser);

// Login route
router.post('/login', loginUser);

// Token verification route
router.get('/verify', auth, verifyToken);

module.exports = router;