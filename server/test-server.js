// server/test-server.js - Simple server test
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Test auth route
app.post('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth route is working!', body: req.body });
});

// Check environment variables
console.log('Environment check:');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'NOT SET');
console.log('SECRET_KEY:', process.env.SECRET_KEY ? 'Set' : 'NOT SET');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sathi-lagbe')
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Test server running on port ${PORT}`);
      console.log(`✅ Test URL: http://localhost:${PORT}/test`);
      console.log(`✅ Auth test URL: http://localhost:${PORT}/api/auth/test`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('Please check your MONGO_URI in .env file');
  });
