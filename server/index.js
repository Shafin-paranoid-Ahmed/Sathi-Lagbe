// server/index.js - Enhanced version with Socket.IO for real-time chat
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { initSocket } = require('./utils/socket');


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
const { startAutoStatusScheduler } = require('./services/autoStatusService');

const app = express();

// Middleware - ORDER IS IMPORTANT
// CORS configuration for Vercel deployment
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://sathi-lagbe-pcg3.vercel.app',
  'https://sathi-lagbe-lovat.vercel.app'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, origin || true);
    }

    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware and ensure all preflight requests are handled
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Make sure body-parser middleware is before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// HTTP request logging disabled for security in production
// app.use(morgan('dev'));

// Note: File uploads now use memory storage for serverless compatibility

// Middleware to handle double slashes in URLs
app.use((req, res, next) => {
  // Fix double slashes in the URL
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// Debug middleware for CORS issues
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.get('Origin')}`);
  next();
});

// Routes
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Database connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Socket.IO authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
    const decoded = jwt.verify(token, secret);
    socket.userId = decoded.userId || decoded.id;
    socket.userName = decoded.name || decoded.email || 'User';
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
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

// Start server
const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
  });
} else {
  // For Vercel, export the app instead of starting the server
  module.exports = app;
}

// Scheduled tasks only run in non-Vercel environments
if (process.env.VERCEL !== '1') {
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