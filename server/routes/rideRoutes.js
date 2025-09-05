// server/routes/rideRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');
const RideMatch = require('../models/RideMatch');

// Debug endpoint
router.get('/debug/user', auth, rideController.debugUserData);

// Test endpoint for gender data
router.get('/test/gender', auth, rideController.testGenderData);

// Get all available rides (no search parameters)
router.get('/available', auth, rideController.getAllAvailableRides);

// Search routes
router.get('/search', rideController.findRideMatches);
router.post('/aimatch', auth, rideController.getAiMatches);
router.get('/aistream', auth, rideController.streamAiMatches);

// Create routes
router.post('/offer', auth, rideController.createRideOffer);
router.post('/recurring', auth, rideController.createRecurringRides);

// Request management - THESE MUST COME BEFORE /:rideId
router.post('/request', auth, rideController.requestToJoinRide);
router.post('/confirm', auth, rideController.confirmRideRequest);
router.post('/deny', auth, rideController.denyRideRequest);

// Rating
router.post('/rate', auth, rideController.submitRating);

// CRUD operations - order matters
router.get('/owner/:ownerId', auth, rideController.getRidesByOwner); // specific first
router.get('/mine/combined', auth, rideController.getMyRidesCombined);
router.get('/my-rides', auth, rideController.getMyRidesCombined); // alias for compatibility
router.get('/:rideId', auth, rideController.getRideById); // generic after
router.put('/:rideId', auth, rideController.updateRide);
router.delete('/:rideId', auth, rideController.deleteRide);

// Notification-related operations
router.patch('/:rideId/eta', auth, rideController.updateEta);
router.patch('/:rideId/cancel', auth, rideController.cancelRide);
router.patch('/:rideId/complete', auth, rideController.completeRide);

// Cleanup orphaned notifications (admin/maintenance route)
router.post('/cleanupnotifications', auth, async (req, res) => {
  try {
    const rideNotificationService = require('../services/rideNotificationService');
    const deletedCount = await rideNotificationService.cleanupOrphanedNotifications();
    res.json({ message: `Cleanup complete. Deleted ${deletedCount} orphaned notifications.` });
  } catch (error) {
    console.error('Error during notification cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup notifications' });
  }
});

// Debug endpoint to test ride ID validation
router.get('/debug/:rideId', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    console.log('🔍 Debug endpoint called with rideId:', rideId);
    
    // Try different ways to find the ride
    const rideById = await RideMatch.findById(rideId);
    const rideByString = await RideMatch.findById(rideId.toString());
    const rideByObjectId = await RideMatch.findById(new require('mongoose').Types.ObjectId(rideId));
    
    res.json({
      rideId,
      rideIdType: typeof rideId,
      rideById: rideById ? 'Found' : 'Not found',
      rideByString: rideByString ? 'Found' : 'Not found',
      rideByObjectId: rideByObjectId ? 'Found' : 'Not found',
      allRides: await RideMatch.countDocuments(),
      sampleRides: await RideMatch.find({}).select('_id startLocation').limit(3)
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;