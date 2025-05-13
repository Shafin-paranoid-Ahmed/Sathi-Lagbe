const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideMatch',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallScore: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comments: String
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
