// client/src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    this.socket = io(API_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    this.setupEventListeners();
  }

  // Setup basic event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.emit('socket_connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });
  }

  // Join a chat room
  joinChat(chatId) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot join chat');
      return;
    }
    
    this.socket.emit('join_chat', chatId);
    console.log('Joined chat room:', chatId);
  }

  // Leave a chat room
  leaveChat(chatId) {
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit('leave_chat', chatId);
    console.log('Left chat room:', chatId);
  }

  // Send a message
  sendMessage(chatId, message) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }
    
    this.socket.emit('new_message', { chatId, message });
  }

  // Start typing indicator
  startTyping(chatId) {
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit('typing_start', chatId);
  }

  // Stop typing indicator
  stopTyping(chatId) {
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit('typing_stop', chatId);
  }

  // Mark messages as read
  markMessagesAsRead(chatId, messageIds) {
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit('mark_read', { chatId, messageIds });
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    // Remove existing listener if any
    const existingCallback = this.eventListeners.get('new_message');
    if (existingCallback) {
      this.socket.off('new_message', existingCallback);
    }
    
    this.socket.on('new_message', callback);
    this.eventListeners.set('new_message', callback);
    console.log('New message listener attached');
  }

  // Listen for message sent confirmation
  onMessageSent(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    this.socket.on('message_sent', callback);
    this.eventListeners.set('message_sent', callback);
  }

  // Listen for typing indicators
  onUserTyping(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    this.socket.on('user_typing', callback);
    this.eventListeners.set('user_typing', callback);
  }

  // Listen for typing stop
  onUserStoppedTyping(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    this.socket.on('user_stopped_typing', callback);
    this.eventListeners.set('user_stopped_typing', callback);
  }

  // Listen for messages read
  onMessagesRead(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    this.socket.on('messages_read', callback);
    this.eventListeners.set('messages_read', callback);
  }

  // Listen for new notifications
  onNewNotification(callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }
    
    this.socket.on('new_notification', callback);
    this.eventListeners.set('new_notification', callback);
  }

  // Remove event listener
  off(eventName) {
    if (!this.socket) {
      return;
    }
    
    const callback = this.eventListeners.get(eventName);
    if (callback) {
      this.socket.off(eventName, callback);
      this.eventListeners.delete(eventName);
    }
  }

  // Remove all event listeners
  removeAllListeners() {
    if (!this.socket) {
      return;
    }
    
    this.eventListeners.forEach((callback, eventName) => {
      this.socket.off(eventName, callback);
    });
    this.eventListeners.clear();
  }

  // Emit custom event
  emit(eventName, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot emit event');
      return;
    }
    
    this.socket.emit(eventName, data);
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected');
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id
    };
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService; 
