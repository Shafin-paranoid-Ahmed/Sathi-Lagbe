// server/routes/chatRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Send a message
router.post('/', auth, chatController.sendMessage);

// Create a new chat
router.post('/createnewchat', auth, chatController.createChat);

// Get all chats for the current user
router.get('/', auth, chatController.getAllChats);
router.get('/getallchats', auth, chatController.getAllChats); // Compatibility

// Clear unread messages
router.post('/clearunreadmessage', auth, chatController.clearUnreadMessages);

// Get messages for a chat - This must be after other specific GET routes to avoid conflicts
// router.get('/:chatId', auth, chatController.getMessages);

module.exports = router;