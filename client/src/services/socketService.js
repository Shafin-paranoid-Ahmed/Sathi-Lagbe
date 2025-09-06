// client/src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listenerQueue = []; // Queue for listeners added before connection
  }

  connect(token) {
    if (this.socket && this.socket.connected) {

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
    
    const BASE_URL = import.meta.env.VITE_API_URL || 'https://sathi-lagbe-backend.vercel.app';
    // Ensure no trailing slash to prevent double slashes
    const cleanBase = BASE_URL.replace(/\/$/, '');
    this.socket = io(cleanBase, {
      auth: { token },
      // Performance optimizations
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      // Connection settings
      timeout: 20000, // 20 seconds
      forceNew: false, // Reuse existing connection
      // Memory optimization
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      // Compression
      compression: true,
      // Heartbeat settings
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.socket.on('connect', () => {

      // Process any queued listeners
      this.processListenerQueue();
    });
    
    this.socket.on('disconnect', (reason) => {

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

  }

  leaveChat(chatId) {
    if (!this.socket || !this.socket.connected) {
      return;
    }
    
    this.socket.emit('leave_chat', chatId);

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
      this.socket.removeAllListeners(); // Important: remove all active listeners
      this.socket.disconnect();
      this.socket = null;
    }
    // Also clear any listeners that were queued but never attached.
    this.listenerQueue = [];
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
