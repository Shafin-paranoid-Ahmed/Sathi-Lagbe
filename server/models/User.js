// server/models/User.js - Merged version
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Basic fields from both models
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // BRACU ID (student ID)
  bracuId: { type: String, unique: true, trim: true },
  phone: { type: String, required: true, match: /^\+880\d{10}$/ },
  
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
  ],
  
  // Profile image
  avatarUrl: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  
  // Status and location tracking
  status: {
    current: { type: String, enum: ['available', 'busy', 'in_class', 'studying', 'free'], default: 'available' },
    location: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    isAutoUpdate: { type: Boolean, default: false }
  },
  
  // Rating fields
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 