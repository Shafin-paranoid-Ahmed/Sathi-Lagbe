// server/models/Emergency.js - Merged implementation
const mongoose = require('mongoose');

const EmergencySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  contacts: [{
    name: String,
    phone: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For app users
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Track who added this contact
  }],
  triggeredAt: Date,
  location: String,
  // Additional fields from both implementations
  message: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emergency', EmergencySchema);