const mongoose = require('mongoose');

// Define the schema (structure of the data)
const rideMatchSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Store user info directly to avoid population issues
  riderName: {
    type: String,
    default: 'Anonymous User'
  },
  riderGender: {
    type: String,
    default: ''
  },
  departureTime: {
    type: Date,
    required: true
  },
  startLocation: {
    type: String,
    required: true
  },
  endLocation: {
    type: String,
    required: true
  },
  schedule: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed'],
    default: 'pending'
  }, 
  // Capacity for the ride (total seats available including driver exclusions)
  availableSeats: {
    type: Number,
    min: 1,
    default: 1
  },
  // Riders who have requested to join with their seat counts
  requestedRiders: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      seatCount: { type: Number, min: 1, default: 1 }
    }
    ],
  // Riders confirmed for the ride with their seat counts
  confirmedRiders: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      seatCount: { type: Number, min: 1, default: 1 }
    }
  ],
  recurring: {
    type: {
      days: [String],
      frequency: {
        type: String,
        enum: ['daily', 'weekly'],
        default: 'weekly'
      }
    },
    default: null
  },
    ratings: [
    {
      riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      raterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String }
    }
  ]
}, { timestamps: true });

const RideMatch = mongoose.model('RideMatch', rideMatchSchema);


module.exports = RideMatch;