const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateUser } = require('../middleware/auth');

router.post('/', authenticateUser, feedbackController.submitFeedback);

module.exports = router;
