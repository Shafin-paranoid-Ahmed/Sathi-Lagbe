// server/models/chat.js - UPDATED
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    members: {
        type: [
            {type: mongoose.Schema.Types.ObjectId, ref: "User"} // Changed from "users" to "User"
        ]
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId, ref: "Message" // Changed from "messages" to "Message"
    },
    unreadMessageCount: {
        type: Number,
        default: 0
    }
}, {timestamps: true});

module.exports = mongoose.model("Chat", chatSchema); // Changed from "chats" to "Chat"