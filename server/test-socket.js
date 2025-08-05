// server/test-socket.js - Simple Socket.IO test script
const { io } = require('socket.io-client');

// Test Socket.IO connection
const testSocketConnection = () => {
  const socket = io('http://localhost:5000', {
    auth: {
      token: 'test-token' // This will fail authentication, but we can test connection
    }
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connection successful!');
    console.log('Socket ID:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Socket.IO connection failed (expected due to invalid token):', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  // Cleanup after 5 seconds
  setTimeout(() => {
    socket.disconnect();
    console.log('🧹 Test completed');
  }, 5000);
};

// Run the test
console.log('🧪 Testing Socket.IO connection...');
testSocketConnection(); 
