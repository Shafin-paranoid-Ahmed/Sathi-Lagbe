// server/models/Message.js - Primary message model
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat',
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  text: String,
  image: String,
  read: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add indexes for better query performance
MessageSchema.index({ chatId: 1, createdAt: -1 }); // For chat message queries
MessageSchema.index({ sender: 1, createdAt: -1 }); // For user message queries
MessageSchema.index({ read: 1, chatId: 1 }); // For unread message queries

module.exports = mongoose.model('Message', MessageSchema);