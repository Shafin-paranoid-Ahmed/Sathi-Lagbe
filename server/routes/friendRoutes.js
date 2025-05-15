// server/routes/friendRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');

router.put('/status', auth, friendController.setStatus);
router.get('/free', auth, friendController.getFreeFriends);

module.exports = router;