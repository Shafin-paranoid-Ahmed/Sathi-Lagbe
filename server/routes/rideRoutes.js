// server/routes/rideRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');

// Get all available rides (no search parameters)
router.get('/available', auth, rideController.getAllAvailableRides);

// Search routes
router.get('/search', rideController.findRideMatches);
router.post('/ai-match', auth, rideController.getAiMatches);

// Create routes
router.post('/offer', auth, rideController.createRideOffer);
router.post('/recurring', auth, rideController.createRecurringRides);

// Request management
router.post('/request', auth, rideController.requestToJoinRide);
router.post('/confirm', auth, rideController.confirmRideRequest);
router.post('/deny', auth, rideController.denyRideRequest);

// Rating
router.post('/rate', auth, rideController.submitRating);

// CRUD operations
router.get('/:rideId', auth, rideController.getRideById);
router.get('/owner/:ownerId', auth, rideController.getRidesByOwner);
router.put('/:rideId', auth, rideController.updateRide);
router.delete('/:rideId', auth, rideController.deleteRide);

module.exports = router;