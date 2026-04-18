const { Server } = require('socket.io');

let io;

function parseAllowedOrigins() {
  const configured = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.SOCKET_CORS_ORIGINS
  ].filter(Boolean);

  const expanded = configured.flatMap((entry) =>
    String(entry)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return Array.from(
    new Set([
      'http://localhost:3000',
      'http://localhost:5173',
      ...expanded
    ])
  );
}

function initSocket(server) {
  const allowedOrigins = parseAllowedOrigins();
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
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

