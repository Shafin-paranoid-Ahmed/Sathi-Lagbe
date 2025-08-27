const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getUserRoutine,
  addRoutineEntry,
  updateRoutineEntry,
  deleteRoutineEntry,
  deleteAllUserRoutine
} = require('../controllers/routineController');

// All routes require authentication
router.use(authenticateUser);

// Get user's routine
router.get('/', getUserRoutine);

// Add new routine entry
router.post('/', addRoutineEntry);

// Update routine entry
router.put('/:entryId', updateRoutineEntry);

// Delete routine entry
router.delete('/:entryId', deleteRoutineEntry);

// Delete all routine entries for user
router.delete('/', deleteAllUserRoutine);

module.exports = router;
