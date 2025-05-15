const mongoose = require('mongoose');

// Define the schema (structure of the data)
const rideMatchSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
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
    requestedRiders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],  confirmedRiders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  recurring: {
  type: {
    days: [String],
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'weekly'
    }
  },
  ratings: [{
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number, min: 1, max: 5 },
  comment: { type: String }
  }],
  default: null
}
}, { timestamps: true }); 


const RideMatch = mongoose.model('RideMatch', rideMatchSchema);


module.exports = RideMatch;