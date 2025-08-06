// server/controllers/messageController.js - Enhanced version with Socket.IO
const Message = require('../models/Message');
const Chat = require('../models/chat');
const User = require('../models/User');
const { getIO } = require('../utils/socket');

/**
 * Send a new message (with optional image upload)
 */
exports.sendNewMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    // Allow empty text if image is provided
    if (!text && !req.file) {
      return res.status(400).json({ error: 'Message text or image is required' });
    }
    
    const userId = req.user.id || req.user.userId;
    
    // Check if chat exists
    const chatExists = await Chat.findById(chatId);
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Check if user is a member of the chat
    if (!chatExists.members.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Handle image upload if present
    let imageUrl = null;
    if (req.file) {
      // Note: You would need to set up file upload middleware like multer
      // and possibly cloudinary to handle this properly
      imageUrl = req.file.path; // Or the result from cloudinary upload
    }
    
    // Create and save the message
    const newMessage = new Message({
      chatId,
      sender: userId,
      text: text || '',
      image: imageUrl,
      createdAt: Date.now()
    });
    
    await newMessage.save();
    
    // Update the chat's last message, increase unread count, and update timestamp
    await Chat.findByIdAndUpdate(
      chatId,
      {
        lastMessage: newMessage._id,
        $inc: { unreadMessageCount: 1 },
        updatedAt: new Date()
      }
    );
    
    // Populate sender info for API response
    await newMessage.populate('sender', 'name email');
    
    // Emit Socket.IO event to all users in the chat room
    const io = getIO();
    io.to(`chat_${chatId}`).emit('new_message', {
      chatId,
      message: newMessage
    });
    
    res.status(201).json({
      message: 'Message sent successfully',
      success: true,
      data: newMessage
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
};

/**
 * Get all messages for a chat
 */
exports.getAllMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    const userId = req.user.id || req.user.userId;
    
    // Check if chat exists
    const chatExists = await Chat.findById(chatId);
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Check if user is a member of the chat
    if (!chatExists.members.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get all messages for the chat with sender information
    const messages = await Message.find({ chatId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });
    
    res.json({
      message: 'Messages fetched successfully',
      success: true,
      data: messages
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch messages' });
  }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId, messageIds } = req.body;
    const userId = req.user.id || req.user.userId;
    
    if (!chatId || !messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Chat ID and message IDs array are required' });
    }
    
    // Check if chat exists and user is a member
    const chatExists = await Chat.findById(chatId);
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    if (!chatExists.members.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Mark messages as read
    await Message.updateMany(
      { _id: { $in: messageIds }, chatId },
      { read: true }
    );
    
    // Emit Socket.IO event for real-time read status
    const io = getIO();
    io.to(`chat_${chatId}`).emit('messages_read', {
      chatId,
      messageIds,
      readBy: userId
    });
    
    res.json({
      message: 'Messages marked as read',
      success: true
    });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: err.message || 'Failed to mark messages as read' });
  }
};
