const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const auth = require('../middleware/auth');

// Submit a new rating
router.post('/', auth, ratingController.submitRating);

// Get all ratings for a specific user
router.get('/user/:userId', ratingController.getUserRatings);

// Get average rating for a user
router.get('/user/:userId/average', ratingController.getAverageRating);

// Get ratings given by the current user
router.get('/given', auth, ratingController.getRatingsGiven);

// Update a rating
router.put('/:ratingId', auth, ratingController.updateRating);

// Delete a rating
router.delete('/:ratingId', auth, ratingController.deleteRating);

module.exports = router;
