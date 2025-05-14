// controllers/chatController.js
const router = require('express').Router();

const authMiddleware = require('../middleware/auth');

const Chat = require('../models/chat');
const Message = require('../models/message');

// Create a new chat
router.post(
  '/create-new-chat',
  authMiddleware,
  async (req, res) => {
    try {
      const chat = new Chat(req.body);
      const savedChat = await chat.save();
      await savedChat.populate('members');
      res.status(201).send({
        message: 'Chat created successfully',
        success: true,
        data: savedChat
      });
    } catch (error) {
      res.status(400).send({ message: error.message, success: false });
    }
  }
);

// Get all chats for a user
router.get(
  '/get-all-chats',
  authMiddleware,
  async (req, res) => {
    try {
      const allChats = await Chat.find({ members: { $in: req.body.userId } })
        .populate('members')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });
      res.status(200).send({
        message: 'Chats fetched successfully',
        success: true,
        data: allChats
      });
    } catch (error) {
      res.status(400).send({ message: error.message, success: false });
    }
  }
);

// Clear unread count in a chat
router.post(
  '/clear-unread-message',
  authMiddleware,
  async (req, res) => {
    try {
      const chatId = req.body.chatId;
      const chat = await Chat.findById(chatId);
      if (!chat) return res.send({ message: 'No chat found', success: false });

      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { unreadMessageCount: 0 },
        { new: true }
      )
        .populate('members')
        .populate('lastMessage');

      await Message.updateMany(
        { chatId, read: false },
        { read: true }
      );

      res.send({
        message: 'Unread message count cleared',
        success: true,
        data: updatedChat
      });
    } catch (error) {
      res.send({ message: error.message, success: false });
    }
  }
);

module.exports = router;
