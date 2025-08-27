// server/routes/feedbackRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const auth = require('../middleware/auth');

// Submit feedback
router.post('/', auth, feedbackController.submitFeedback);

// Get feedback for a ride
router.get('/ride/:rideId', auth, feedbackController.getRideFeedback);

// Get feedback breakdown for a ride (passenger feedback and owner's feedback about riders)
router.get('/ride/:rideId/breakdown', auth, feedbackController.getRideFeedbackBreakdown);

// Get feedback submitted by current user
router.get('/user', auth, feedbackController.getUserFeedback);

module.exports = router;