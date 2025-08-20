const Rating = require('../models/Rating');
const User = require('../models/User');
const RideMatch = require('../models/RideMatch');

// Submit a rating
exports.submitRating = async (req, res) => {
  try {
    const { rateeId, rideId, rating, comment, category, isRiderRating } = req.body;
    const raterId = req.user.id || req.user.userId;

    // Validate input
    if (!rateeId || !rideId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating data. Rating must be between 1-5.'
      });
    }

    // Check if user is rating themselves
    if (raterId === rateeId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot rate yourself.'
      });
    }

    // Verify the ride exists and user was part of it
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found.'
      });
    }

    // Check if user was part of this ride
    const isPartOfRide = ride.rider.toString() === raterId || 
                        ride.passengers.some(p => p.userId.toString() === raterId);
    
    if (!isPartOfRide) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate users who were part of this ride.'
      });
    }

    // Check if ride is completed (you might want to add a status field to RideMatch)
    // For now, we'll assume completed rides can be rated

    // Check if user already rated this person for this ride
    const existingRating = await Rating.findOne({
      rater: raterId,
      ratee: rateeId,
      rideId: rideId,
      isRiderRating: isRiderRating
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this user for this ride.'
      });
    }

    // Create the rating
    const newRating = new Rating({
      rater: raterId,
      ratee: rateeId,
      rideId: rideId,
      rating: rating,
      comment: comment || '',
      category: category || 'overall',
      isRiderRating: isRiderRating !== undefined ? isRiderRating : true
    });

    await newRating.save();

    // Update user's average rating
    const avgRating = await Rating.getAverageRating(rateeId);
    await User.findByIdAndUpdate(rateeId, {
      averageRating: avgRating.averageRating,
      totalRatings: avgRating.totalRatings
    });

    // Populate the rating with user details
    await newRating.populate('rater', 'name email avatarUrl');
    await newRating.populate('ratee', 'name email avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully.',
      data: newRating
    });

  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating.',
      error: error.message
    });
  }
};

// Get all ratings for a user
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, category } = req.query;

    const query = { ratee: userId };
    if (category && category !== 'all') {
      query.category = category;
    }

    const ratings = await Rating.find(query)
      .populate('rater', 'name email avatarUrl')
      .populate('ratee', 'name email avatarUrl')
      .populate('rideId', 'origin destination date')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Rating.countDocuments(query);

    const avgRating = await Rating.getAverageRating(userId);
    const ratingsByCategory = await Rating.getRatingsByCategory(userId);

    res.json({
      success: true,
      data: {
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRatings: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        },
        statistics: {
          averageRating: avgRating.averageRating,
          totalRatings: avgRating.totalRatings,
          ratingsByCategory
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings.',
      error: error.message
    });
  }
};

// Get average rating for a user
exports.getAverageRating = async (req, res) => {
  try {
    const { userId } = req.params;

    const avgRating = await Rating.getAverageRating(userId);
    const ratingsByCategory = await Rating.getRatingsByCategory(userId);

    res.json({
      success: true,
      data: {
        averageRating: avgRating.averageRating,
        totalRatings: avgRating.totalRatings,
        ratingsByCategory
      }
    });

  } catch (error) {
    console.error('Error fetching average rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch average rating.',
      error: error.message
    });
  }
};

// Get ratings given by a user
exports.getRatingsGiven = async (req, res) => {
  try {
    const raterId = req.user.id || req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ rater: raterId })
      .populate('ratee', 'name email avatarUrl')
      .populate('rideId', 'origin destination date')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Rating.countDocuments({ rater: raterId });

    res.json({
      success: true,
      data: {
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRatings: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching ratings given:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings given.',
      error: error.message
    });
  }
};

// Update a rating
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rating, comment, category } = req.body;
    const userId = req.user.id || req.user.userId;

    const existingRating = await Rating.findById(ratingId);
    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found.'
      });
    }

    // Check if user owns this rating
    if (existingRating.rater.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own ratings.'
      });
    }

    // Update the rating
    const updatedRating = await Rating.findByIdAndUpdate(
      ratingId,
      {
        rating: rating || existingRating.rating,
        comment: comment !== undefined ? comment : existingRating.comment,
        category: category || existingRating.category
      },
      { new: true }
    ).populate('rater', 'name email avatarUrl')
     .populate('ratee', 'name email avatarUrl');

    // Update user's average rating
    const avgRating = await Rating.getAverageRating(existingRating.ratee);
    await User.findByIdAndUpdate(existingRating.ratee, {
      averageRating: avgRating.averageRating,
      totalRatings: avgRating.totalRatings
    });

    res.json({
      success: true,
      message: 'Rating updated successfully.',
      data: updatedRating
    });

  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rating.',
      error: error.message
    });
  }
};

// Delete a rating
exports.deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id || req.user.userId;

    const existingRating = await Rating.findById(ratingId);
    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found.'
      });
    }

    // Check if user owns this rating
    if (existingRating.rater.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own ratings.'
      });
    }

    await Rating.findByIdAndDelete(ratingId);

    // Update user's average rating
    const avgRating = await Rating.getAverageRating(existingRating.ratee);
    await User.findByIdAndUpdate(existingRating.ratee, {
      averageRating: avgRating.averageRating,
      totalRatings: avgRating.totalRatings
    });

    res.json({
      success: true,
      message: 'Rating deleted successfully.'
    });

  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rating.',
      error: error.message
    });
  }
};
