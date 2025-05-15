// server/routes/chatRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Get messages for a chat
router.get('/:chatId', auth, chatController.getMessages);

// Send a message
router.post('/', auth, chatController.sendMessage);

// Create a new chat
router.post('/create-new-chat', auth, chatController.createChat);

// Get all chats for the current user
router.get('/', auth, chatController.getAllChats);
router.get('/get-all-chats', auth, chatController.getAllChats); // Compatibility

// Clear unread messages
router.post('/clear-unread-message', auth, chatController.clearUnreadMessages);

module.exports = router;