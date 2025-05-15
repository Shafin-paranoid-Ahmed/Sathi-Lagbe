// server/models/User.js - Merged version
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Basic fields from both models
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Fields from server/models/User.js in Sathi_Lagbe
  gender: String,
  location: String,
  schedule: [String],
  
  // Preferences from ONLYGWUB
  preferences: {
    darkMode: { type: Boolean, default: false }
  },
  
  // Ride history from Sathi_Lagbe
  rideHistory: [
    {
      date: String,
      partner: String,
      rating: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 