// routes/rideRoutes.js
const express = require('express');
const router  = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/auth');

router.get('/search', rideController.findRideMatches);
router.post('/offer', authMiddleware, rideController.createRideOffer);
router.post('/request', authMiddleware, rideController.requestToJoinRide);
router.post('/confirm', authMiddleware, rideController.confirmRideRequest);
router.post('/recurring', authMiddleware, rideController.createRecurringRides);
router.get('/owner/:ownerId', authMiddleware, rideController.getRidesByOwner);
router.post('/rate', authMiddleware, rideController.submitRating);
router.get('/:rideId', authMiddleware, rideController.getRideById);
router.post('/deny', authMiddleware, rideController.denyRideRequest);
router.post('/ai-match', authMiddleware, rideController.getAiMatches);
router.put('/:rideId', authMiddleware, rideController.updateRide);
router.delete('/:rideId', authMiddleware, rideController.deleteRide);

module.exports = router;