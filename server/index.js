// server/index.js - Simplified version without socket.io
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');

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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});