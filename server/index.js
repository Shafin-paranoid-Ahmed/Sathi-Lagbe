// server/index.js - Enhanced version with Socket.IO for real-time chat
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./utils/socket');
const { verifyToken: verifyJwt, getJwtSecret } = require('./utils/jwt');


// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const sosRoutes = require('./routes/sosRoutes');
const rideRoutes = require('./routes/rideRoutes');
const friendRoutes = require('./routes/friendRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const freeRoutes = require('./routes/freeRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const routineRoutes = require('./routes/routineRoutes');
const statsRoutes = require('./routes/statsRoutes');
const internalRoutes = require('./routes/internalRoutes');
const { startAutoStatusScheduler } = require('./services/autoStatusService');

const app = express();

// Performance and Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Rate limiting (enabled in production)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // stricter in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in test environment
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // stricter in production
  message: 'Too many authentication attempts, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in test environment
});
app.use('/api/auth/', authLimiter);

// CORS configuration. A single allowlist drives both preflight and actual
// requests; the `cors` package handles OPTIONS automatically.
const staticAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://sathi-lagbe-pcg3.vercel.app',
  'https://sathi-lagbe-lovat.vercel.app',
  'https://sathi-lagbe-alpha.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean);

// Additional origins matched only in non-production environments.
const isNonProd = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin, callback) => {
    // Server-to-server / curl / same-origin requests have no Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (staticAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (isNonProd && (origin.includes('localhost') || origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Normalize accidental double-slashes before route matching.
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// Routes - Load with error handling
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/message', messageRoutes);
  app.use('/api/sos', sosRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/classrooms', classroomRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/free', freeRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ratings', ratingRoutes);
  app.use('/api/routine', routineRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/internal', internalRoutes);
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  console.error('Error stack:', error.stack);
}


// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: err.message || 'Invalid upload payload',
      message: 'File upload validation failed'
    });
  }
  if (err && err.message && err.message.includes('Only JPG, PNG and WEBP images are allowed')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      message: 'File upload validation failed'
    });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: 'Request body contains invalid JSON'
    });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Validate critical environment variables at startup (skipped only in tests,
// which inject their own JWT_SECRET via tests/setup.js before requiring the app).
if (process.env.NODE_ENV !== 'test') {
  const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  }

  try {
    getJwtSecret();
  } catch (err) {
    console.error('❌ FATAL:', err.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL && !process.env.CLIENT_URL) {
    console.warn('⚠️ WARNING: FRONTEND_URL or CLIENT_URL should be set in production for proper CORS configuration');
  }
}

// Connect to MongoDB with Vercel-optimized settings
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  connectTimeoutMS: 30000,         // 30 seconds
  socketTimeoutMS: 30000,          // 30 seconds
  maxPoolSize: 10,                 // Maintain up to 10 socket connections
  heartbeatFrequencyMS: 10000,     // Send a ping every 10 seconds
  retryWrites: true,
  w: 'majority'
};

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  if (process.env.NODE_ENV === 'test') {
    // In test environment, mongoose connection is handled by jest-mongodb
    return;
  }
  try {
    const mongoDbName = process.env.MONGO_DB_NAME;
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      ...mongoOptions,
      ...(mongoDbName ? { dbName: mongoDbName } : {})
    });
    console.log('✅ Database connected successfully');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    if (mongoDbName) {
      console.log(`MongoDB database in use: ${mongoDbName}`);
    }
    
    // Initialize cache service after database connection
    const cacheService = require('./services/cacheService');
    await cacheService.connect();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    console.error('Error code:', err.code);
    console.error('Error name:', err.name);
    
    // Retry connection after 5 seconds
    console.log('🔄 Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Start connection
connectWithRetry();

const isVercelRuntime = process.env.VERCEL === '1';
const socketsEnabled = (() => {
  if (typeof process.env.SOCKET_ENABLED === 'string') {
    return process.env.SOCKET_ENABLED.toLowerCase() === 'true';
  }
  // Safe default: disable sockets on Vercel serverless unless explicitly enabled.
  return !isVercelRuntime;
})();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO (long-lived runtime only by default).
const io = socketsEnabled ? initSocket(server) : null;

// Socket.IO authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = verifyJwt(token);
    socket.userId = decoded.userId || decoded.id;
    socket.userName = decoded.name || decoded.email || 'User';
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

// Apply authentication middleware
if (io) {
  io.use(authenticateSocket);
}

// Socket.IO connection handling
if (io) {
io.on('connection', (socket) => {
  // User connection logging removed for security
  
  // Store user's socket connection
  const userRoom = `user_${socket.userId}`;
  socket.join(userRoom);
  // Room joining logging removed for security
  
  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    // Chat joining logging removed for security
  });
  
  // Handle leaving chat rooms
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    // Chat leaving logging removed for security
  });
  
  // Handle new message
  socket.on('new_message', ({ chatId, message }) => {
    // Broadcast the message to everyone in the chat room, including sender
    io.to(`chat_${chatId}`).emit('new_message', {
      chatId,
      message
    });

    // Message relay logging removed for security
  });
  
  // Handle typing indicators
  socket.on('typing_start', (chatId) => {
    socket.to(`chat_${chatId}`).emit('user_typing', {
      chatId,
      userId: socket.userId,
      userName: socket.userName
    });
  });
  
  socket.on('typing_stop', (chatId) => {
    socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
      chatId,
      userId: socket.userId
    });
  });
  
  // Handle message read status
  socket.on('mark_read', (data) => {
    const { chatId, messageIds } = data;
    
    // Broadcast read status to other users in the chat
    socket.to(`chat_${chatId}`).emit('messages_read', {
      chatId,
      messageIds,
      readBy: socket.userId
    });
  });

  // Handle live SOS location updates from sender and relay to recipients
  socket.on('sos_location_update', (payload) => {
    try {
      const { recipientIds = [], latitude, longitude } = payload || {};
      if (!Array.isArray(recipientIds) || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return;
      }
      recipientIds.forEach((recipientId) => {
        const room = `user_${recipientId}`;
        io.to(room).emit('sos_location_update', {
          senderId: socket.userId,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });
      });
    } catch (err) {
      console.error('Error handling sos_location_update:', err);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // User disconnection logging removed for security
  });

  // Notify recipients that live sharing has stopped
  socket.on('sos_stop_sharing', async (payload) => {
    try {
      const { recipientIds = [], senderId } = payload || {};
      let finalRecipientIds = recipientIds;

      // If recipientIds is empty, look up the sender's contacts
      if (finalRecipientIds.length === 0 && senderId) {
        const contactDoc = await require('./models/sosContact').findOne({ user: senderId });
        if (contactDoc) {
          finalRecipientIds = contactDoc.contacts.filter(c => c.userId).map(c => c.userId.toString());
        }
      }
      
      if (!Array.isArray(finalRecipientIds)) return;
      
      finalRecipientIds.forEach((recipientId) => {
        const room = `user_${recipientId}`;
        io.to(room).emit('sos_stop_sharing', {
          senderId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });
    } catch (err) {
      // silently fail
    }
  });
});
}

// Start server
const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel environment and not in test environment
if (!isVercelRuntime && process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
  });
} else if (process.env.NODE_ENV === 'test') {
  console.log("Server configured for testing, not starting listener.");
}

// Scheduled tasks only run in long-lived (non-Vercel, non-test) environments.
if (!isVercelRuntime && process.env.NODE_ENV !== 'test') {
  // Scheduled cleanup of orphaned notifications (runs every hour)
  const cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds

  setInterval(async () => {
    try {
      // Notification cleanup logging removed for security
      const rideNotificationService = require('./services/rideNotificationService');
      const deletedCount = await rideNotificationService.cleanupOrphanedNotifications();
      // Cleanup results logging removed for security
    } catch (error) {
      console.error('❌ Error during scheduled notification cleanup:', error);
    }
  }, cleanupInterval);

  // Start auto status scheduler (updates 'in_class' based on Routine and notifies friends)
  try {
    startAutoStatusScheduler({ intervalMs: 5 * 60 * 1000 }); // every 5 minutes
  } catch (e) {
    console.warn('Failed to start auto status scheduler:', e?.message);
  }
}

if (isVercelRuntime) {
  // Vercel's Node runtime expects the HTTP handler export.
  module.exports = app;
} else {
  module.exports = { app, server };
}