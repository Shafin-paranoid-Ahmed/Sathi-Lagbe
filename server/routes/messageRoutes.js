// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Send a new message
router.post('/new-message', auth, messageController.sendNewMessage);

// Get all messages for a specific chat
router.get('/get-all-messages/:chatId', auth, messageController.getAllMessages);

module.exports = router;