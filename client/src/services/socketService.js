// client/src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listenerQueue = []; // Queue for listeners added before connection
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!token) {
      console.error('Socket connection requires a token');
      return;
    }

    // Disconnect any existing socket before creating a new one
    if (this.socket) {
      this.socket.disconnect();
    }
    
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.socket = io(BASE_URL, {
      auth: { token }
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      // Process any queued listeners
      this.processListenerQueue();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }
  
  processListenerQueue() {
    if (!this.socket) return;
    this.listenerQueue.forEach(({ eventName, callback }) => {
      this.socket.on(eventName, callback);
    });
    this.listenerQueue = []; // Clear the queue
    console.log('Processed listener queue');
  }

  setupEventListeners() {
    // This method is deprecated and listeners should be attached directly
    // using the on... methods
  }

  joinChat(chatId) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected, cannot join chat');
      return;
    }
    
    this.socket.emit('join_chat', chatId);
    console.log('Joined chat room:', chatId);
  }

  leaveChat(chatId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    
    this.socket.emit('leave_chat', chatId);
    console.log('Left chat room:', chatId);
  }

  sendMessage(chatId, message) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }
    
    this.socket.emit('new_message', { chatId, message });
  }

  startTyping(chatId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    
    this.socket.emit('typing_start', chatId);
  }

  stopTyping(chatId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    
    this.socket.emit('typing_stop', chatId);
  }

  markMessagesAsRead(chatId, messageIds) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    
    this.socket.emit('mark_read', { chatId, messageIds });
  }

  onNewMessage(callback) {
    this.addListener('new_message', callback);
  }

  onMessageSent(callback) {
    this.addListener('message_sent', callback);
  }

  onUserTyping(callback) {
    this.addListener('user_typing', callback);
  }

  onUserStoppedTyping(callback) {
    this.addListener('user_stopped_typing', callback);
  }

  onMessagesRead(callback) {
    this.addListener('messages_read', callback);
  }

  onNewNotification(callback) {
    this.addListener('new_notification', callback);
  }
  
  addListener(eventName, callback) {
    if (this.socket && this.socket.connected) {
      this.socket.on(eventName, callback);
    } else {
      console.log(`Socket not connected. Queuing listener for '${eventName}'`);
      this.listenerQueue.push({ eventName, callback });
    }
  }

  off(eventName) {
    if (!this.socket) {
      console.warn('Socket not initialized, cannot remove listener');
      // Also remove from queue if it's there
      this.listenerQueue = this.listenerQueue.filter(l => l.eventName !== eventName);
      return;
    }
    this.socket.off(eventName);
  }

  removeAllListeners() {
    if (!this.socket) {
      this.listenerQueue = [];
      return;
    }
    this.socket.removeAllListeners();
  }

  emit(eventName, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected, cannot emit event');
      return;
    }
    
    this.socket.emit(eventName, data);
  }

  disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.socket?.connected,
      socketId: this.socket?.id
    };
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService; 
