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

const app = express();

// Middleware - ORDER IS IMPORTANT
app.use(cors());
// Make sure body-parser middleware is before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
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
  .then(() => console.log('MongoDB connected'))
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userName = decoded.name;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userName} (${socket.userId})`);
  
  // Store user's socket connection
  socket.join(`user_${socket.userId}`);
  
  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.userName} joined chat: ${chatId}`);
  });
  
  // Handle leaving chat rooms
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.userName} left chat: ${chatId}`);
  });
  
  // Handle new message
  socket.on('new_message', ({ chatId, message }) => {
    // Broadcast the message to everyone in the chat room, including sender
    io.to(`chat_${chatId}`).emit('new_message', {
      chatId,
      message
    });

    console.log(`Message relayed in chat ${chatId} by ${socket.userName}`);
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
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userName} (${socket.userId})`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});

