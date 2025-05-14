// Load environment variables from .env file
require('dotenv').config();

// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require("morgan");

// const dotenv = require("dotenv");
// dotenv.config();

const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const freeRoutes = require('./routes/freeRoutes');
// Initialize Express
const app = express();

// Middleware (tools that process requests)
app.use(cors());  
app.use(morgan('dev'));
app.use(express.json()); // Lets the server understand JSON data
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/free', freeRoutes);
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.log('MongoDB connection error:', err));

// Basic route to test if the server works
app.get('/', (req, res) => {
  res.send('Welcome to the Ride Matching API!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// server.js
// const rideRoutes = require('./routes/rideRoutes');
// app.use('/api/rides', rideRoutes); // <-- This line must exist