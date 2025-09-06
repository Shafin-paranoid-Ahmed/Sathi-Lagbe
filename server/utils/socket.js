const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Performance optimizations
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    upgradeTimeout: 10000, // 10 seconds
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true, // Allow Engine.IO v3 clients
    transports: ['websocket', 'polling'], // Preferred transport order
    // Connection pooling
    serveClient: false, // Don't serve client files
    // Memory optimization
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024, // Only compress messages larger than 1KB
      concurrencyLimit: 10,
      memLevel: 7
    }
  });
  
  // Connection management
  io.engine.on('connection_error', (err) => {
    console.log('Socket.IO connection error:', err.req, err.code, err.message, err.context);
  });
  
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = { initSocket, getIO };

