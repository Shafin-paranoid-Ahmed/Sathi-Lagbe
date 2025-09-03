// server/routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

// Get dashboard statistics
router.get('/dashboard', auth, statsController.getDashboardStats);

module.exports = router;
