const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideMatch',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500,
    default: ''
  },
  category: {
    type: String,
    enum: ['punctuality', 'cleanliness', 'communication', 'safety', 'overall'],
    default: 'overall'
  },
  isRiderRating: {
    type: Boolean,
    required: true,
    default: true // true if rating the rider, false if rating the passenger
  }
}, {
  timestamps: true
});

// Prevent duplicate ratings for the same ride by the same user
ratingSchema.index({ rater: 1, ratee: 1, rideId: 1, isRiderRating: 1 }, { unique: true });

// Calculate average rating for a user
ratingSchema.statics.getAverageRating = async function(userId) {
  const result = await this.aggregate([
    { $match: { ratee: userId } },
    { $group: { _id: null, averageRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
  ]);
  
  return result.length > 0 ? {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalRatings: result[0].totalRatings
  } : { averageRating: 0, totalRatings: 0 };
};

// Get ratings by category
ratingSchema.statics.getRatingsByCategory = async function(userId) {
  const result = await this.aggregate([
    { $match: { ratee: userId } },
    { $group: { 
      _id: '$category', 
      averageRating: { $avg: '$rating' }, 
      totalRatings: { $sum: 1 } 
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return result.reduce((acc, item) => {
    acc[item._id] = {
      averageRating: Math.round(item.averageRating * 10) / 10,
      totalRatings: item.totalRatings
    };
    return acc;
  }, {});
};

module.exports = mongoose.model('Rating', ratingSchema);
