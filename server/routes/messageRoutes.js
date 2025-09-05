// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Send a new message
router.post('/newmessage', auth, messageController.sendNewMessage);

// Get all messages for a specific chat
// router.get('/getallmessages/:chatId', auth, messageController.getAllMessages);

// Mark messages as read
router.post('/markread', auth, messageController.markMessagesAsRead);

module.exports = router;