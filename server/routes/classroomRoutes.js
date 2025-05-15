// server/routes/classroomRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const auth = require('../middleware/auth');

// Get all available classrooms
router.get('/', auth, classroomController.getAvailableClassrooms);

// Get all classrooms regardless of status
router.get('/all', auth, classroomController.getAllClassrooms);

// Update classroom status
router.put('/status', auth, classroomController.updateStatus);

module.exports = router;