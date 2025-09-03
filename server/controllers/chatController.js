// server/controllers/chatController.js - Improved Implementation
const Message = require('../models/Message');
const Chat = require('../models/chat'); // Make sure this imports the correct model
const User = require('../models/User');

/**
 * Get all messages for a chat
 */
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    const messages = await Message.find({ chatId })
      .sort('createdAt')
      .populate('sender', 'name email avatarUrl');
      
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch messages' });
  }
};

/**
 * Send a new message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: 'Chat ID and text are required' });
    }
    
    const userId = req.user.id || req.user.userId;
    
    // Check if chat exists
    const chatExists = await Chat.findById(chatId);
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const message = new Message({
      chatId,
      sender: userId,
      text,
      createdAt: Date.now()
    });
    
    await message.save();
    
    // Update last message in chat
    await Chat.findByIdAndUpdate(
      chatId,
      {
        lastMessage: message._id,
        $inc: { unreadMessageCount: 1 }
      }
    );
    
    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
};

/**
 * Create a new chat
 */
exports.createChat = async (req, res) => {
  try {
    const { members } = req.body;
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Members array is required' });
    }
    
    const userId = req.user.id || req.user.userId;
    
    // Verify all members exist as users
    const memberIds = [...new Set([...members, userId])]; // Add current user and deduplicate
    
    const foundUsers = await User.find({ _id: { $in: memberIds } });
    if (foundUsers.length !== memberIds.length) {
      return res.status(404).json({ error: 'One or more users not found' });
    }
    
    // Check if chat between these members already exists
    // First, sort member IDs to ensure consistent lookup
    const sortedMemberIds = [...memberIds].sort();
    
    // For a 1:1 chat, check if these two users already have a chat
    if (sortedMemberIds.length === 2) {
      const existingChat = await Chat.findOne({
        members: { $all: sortedMemberIds, $size: sortedMemberIds.length }
      }).populate('members', 'name email avatarUrl');
      
      if (existingChat) {
        return res.status(200).json({
          message: 'Chat already exists',
          success: true,
          data: existingChat
        });
      }
    }
    
    // Create new chat
    const chat = new Chat({
      members: sortedMemberIds,
      lastMessage: null,
      unreadMessageCount: 0
    });
    
    await chat.save();
    await chat.populate('members', 'name email avatarUrl');
    
    res.status(201).json({
      message: 'Chat created successfully',
      success: true,
      data: chat
    });
  } catch (err) {
    console.error('Error creating chat:', err);
    res.status(500).json({ error: err.message || 'Failed to create chat' });
  }
};

/**
 * Get all chats for a user
 */
exports.getAllChats = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Debug logging removed for security
    
    // Import Message model at the top if not already imported
    const Message = require('../models/Message');
    
    // First, get chats without populating lastMessage to avoid potential errors
    const chats = await Chat.find({ members: { $in: [userId] } })
      .populate('members', 'name email avatarUrl')
      .sort({ updatedAt: -1 })
      .lean(); // Use lean() for better performance
    
    // Chat count logging removed for security
    
    // Manually populate lastMessage for each chat with error handling
    const populatedChats = await Promise.all(chats.map(async (chat) => {
      try {
        if (chat.lastMessage) {
          // Message population logging removed for security
          const lastMessage = await Message.findById(chat.lastMessage)
            .populate('sender', 'name email avatarUrl')
            .lean();
          if (lastMessage) {
            chat.lastMessage = lastMessage;
          } else {
            // Message not found logging removed for security
            chat.lastMessage = null;
          }
        }
        return chat;
      } catch (err) {
        console.error('Error populating lastMessage for chat:', chat._id, err);
        // Return chat without lastMessage if there's an error
        chat.lastMessage = null;
        return chat;
      }
    }));
    
    // Return response with data
    res.status(200).json({
      message: 'Chats fetched successfully',
      success: true,
      data: populatedChats || []
    });
  } catch (err) {
    console.error('Error fetching chats:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Failed to fetch chats',
      success: false,
      error: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Clear unread message count
 */
exports.clearUnreadMessages = async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { unreadMessageCount: 0 },
      { new: true }
    )
      .populate('members', 'name email avatarUrl')
      .populate('lastMessage');
      
    // Mark all unread messages as read
    await Message.updateMany(
      { chatId, read: false },
      { read: true }
    );
    
    res.json({
      message: 'Unread message count cleared',
      success: true,
      data: updatedChat
    });
  } catch (err) {
    console.error('Error clearing unread messages:', err);
    res.status(500).json({ 
      message: 'Failed to clear unread messages',
      success: false,
      error: err.message || 'Internal server error'
    });
  }
};