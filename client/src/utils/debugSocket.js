// client/src/utils/debugSocket.js - Debug utilities for Socket.IO
import socketService from '../services/socketService';

export const debugSocketConnection = () => {
  const status = socketService.getConnectionStatus();
  console.log('=== Socket.IO Debug Info ===');
  console.log('Connection Status:', status);
  console.log('Token:', sessionStorage.getItem('token') ? 'Present' : 'Missing');
  console.log('User ID:', sessionStorage.getItem('userId'));
  console.log('============================');
  return status;
};

export const testSocketMessage = (chatId, testMessage = 'Test message from debug') => {
  console.log('Sending test message to chat:', chatId);
  socketService.sendMessage(chatId, { text: testMessage });
};

// Add this to window for easy debugging in browser console
if (typeof window !== 'undefined') {
  window.debugSocket = {
    status: debugSocketConnection,
    test: testSocketMessage,
    connect: (token) => socketService.connect(token || sessionStorage.getItem('token')),
    disconnect: () => socketService.disconnect(),
    service: socketService
  };
}