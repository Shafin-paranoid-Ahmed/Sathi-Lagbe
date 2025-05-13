const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateUser } = require('../middleware/auth');


router.get('/search', rideController.findRideMatches);
router.post('/offer', authenticateUser, rideController.createRideOffer);
router.post('/request', authenticateUser, rideController.requestToJoinRide);
router.post('/confirm', authenticateUser, rideController.confirmRideRequest);
router.post('/recurring', authenticateUser, rideController.createRecurringRides);
router.get('/owner/:ownerId', authenticateUser, rideController.getRidesByOwner);
router.post('/rate', authenticateUser, rideController.submitRating);
router.get('/:rideId', authenticateUser, rideController.getRideById);
router.post('/deny', authenticateUser, rideController.denyRideRequest);
router.post('/ai-match', authenticateUser, rideController.getAiMatches);
router.put('/:rideId', authenticateUser, rideController.updateRide);
router.delete('/:rideId', authenticateUser, rideController.deleteRide);
router.put('/:rideId', authenticateUser, rideController.updateRide);


// router.post('/offer', rideController.createRideOffer);

// router.post('/request', rideController.requestToJoinRide);

// router.post('/confirm', rideController.confirmRideRequest);

// router.post('/recurring', rideController.createRecurringRides);


module.exports = router;
