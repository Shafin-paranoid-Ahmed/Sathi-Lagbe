// server/models/ChatMessage.js - Renamed to avoid conflict
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "chats"
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "users"
  },
  text: {
    type: String,
    required: false
  },
  image: {
    type: String,
    required: false
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);