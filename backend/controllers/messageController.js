// controllers/messageController.js
const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Message = require('../models/message');
const Chat = require('../models/chat');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

// Send a new message (with optional image upload)
router.post(
  '/new-message',
  authMiddleware,
  async (req, res) => {
    try {
      let imageUrl = null;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'chat_images',
          use_filename: true,
          resource_type: 'auto'
        });
        imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      }

      const newMsg = await Message.create({
        chatId:    req.body.chatId,
        sender:    req.user.id,
        text:      req.body.text,
        image:     imageUrl
      });

      // Update lastMessage & unread count
      await Chat.findByIdAndUpdate(
        req.body.chatId,
        {
          lastMessage: newMsg._id,
          $inc: { unreadMessageCount: 1 }
        }
      );

      res.status(201).send({
        message: 'Message sent successfully',
        success: true,
        data: newMsg
      });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message, success: false });
    }
  }
);

// Get all messages for a chat
router.get(
  '/get-all-messages/:chatId',
  authMiddleware,
  async (req, res) => {
    try {
      const msgs = await Message.find({ chatId: req.params.chatId })
        .sort({ createdAt: 1 });
      res.send({ message: 'Messages fetched', success: true, data: msgs });
    } catch (err) {
      res.status(400).send({ message: err.message, success: false });
    }
  }
);

module.exports = router;
