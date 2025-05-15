// server/models/Message.js - Primary message model
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: { 
    type: String, 
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

module.exports = mongoose.model('Message', MessageSchema);