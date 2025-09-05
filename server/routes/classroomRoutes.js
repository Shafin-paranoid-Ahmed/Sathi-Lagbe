// server/routes/classroomRoutes.js - Enhanced with Module 3 routes
const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const auth = require('../middleware/auth');

// Existing routes
router.get('/', auth, classroomController.getAvailableClassrooms);
router.get('/all', auth, classroomController.getAllClassrooms);
router.put('/status', auth, classroomController.updateStatus);
router.put('/status/setallavailable', auth, classroomController.setAllClassroomsAvailable);

// ========== MODULE 3: Enhanced Classroom Availability Routes ==========

// Get classrooms with advanced filtering (floor, capacity, building, etc.)
router.get('/filtered', auth, classroomController.getFilteredClassrooms);

// Get classroom availability for specific timeslot
router.get('/availability', auth, classroomController.getAvailabilityForTimeslot);

// Update classroom timetable
router.put('/:id/timetable', auth, classroomController.updateTimetable);

// Bulk update timetables from university data
router.put('/timetables/bulk', auth, classroomController.bulkUpdateTimetables);

// Get classroom statistics
router.get('/stats', auth, classroomController.getClassroomStats);

module.exports = router;