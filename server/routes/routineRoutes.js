const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const routineController = require('../controllers/routineController');

// All routes require authentication
router.use(authenticateUser);

// Get user's routine
router.get('/', routineController.getUserRoutine);

// Get friends' routines
router.get('/friends', routineController.getFriendsRoutines);

// Add new routine entry
router.post('/', routineController.addRoutineEntry);

// Update routine entry
router.put('/:entryId', routineController.updateRoutineEntry);

// Delete routine entry
router.delete('/:entryId', routineController.deleteRoutineEntry);

// Delete all routine entries for user
router.delete('/', routineController.deleteAllUserRoutine);

module.exports = router;