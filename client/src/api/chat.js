// client/src/api/chat.js - Simplified version
import { API } from './auth';

// Get all chats for the current user
export function getAllChats() {
  return API.get('/chat/getallchats');
}

// Get messages for a specific chat
export function getChatMessages(chatId) {
  return API.get(`/message/getallmessages/${chatId}`);
}

// Create a new chat with selected users
export function createChat(members) {
  return API.post('/chat/createnewchat', { members });
}

// Send a new message with optional image
export function sendNewMessage(chatId, text, image = null) {
  // If there's an image, use FormData
  if (image) {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('text', text);
    formData.append('image', image);
    
    return API.post('/message/newmessage', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  } 
  
  // For text-only messages, use JSON
  return API.post('/message/newmessage', {
    chatId,
    text
  });
}

// Clear unread message count
export function clearUnreadMessages(chatId) {
  return API.post('/chat/clearunreadmessage', { chatId });
}

// Mark messages as read
export function markMessagesAsRead(chatId, messageIds) {
  return API.post('/message/markread', { chatId, messageIds });
}