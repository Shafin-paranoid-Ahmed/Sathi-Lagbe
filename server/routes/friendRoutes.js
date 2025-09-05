// server/routes/friendRoutes.js - Updated for comprehensive friend system
const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');

// Friend request management
router.post('/request', auth, friendController.sendFriendRequest);
// router.put('/request/:requestId/accept', auth, friendController.acceptFriendRequest);
// router.put('/request/:requestId/reject', auth, friendController.rejectFriendRequest);

// Friend list management
router.get('/requests', auth, friendController.getFriendRequests);
router.get('/accepted', auth, friendController.getAcceptedFriends);
// router.delete('/:friendshipId', auth, friendController.removeFriend);

// Get friends with routine sharing enabled and their current status
router.get('/status', auth, friendController.getFriendsWithStatus);

// User blocking
router.post('/block', auth, friendController.blockUser);

module.exports = router;