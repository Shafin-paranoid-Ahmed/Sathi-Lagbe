const mongoose = require('mongoose');
const RideMatch = require('../models/RideMatch');

// Helper to send 501 for unimplemented routes
function notImplemented(res, name) {
	return res.status(501).json({ success: false, message: `${name} not implemented in current build` });
}

// POST /api/ratings
exports.submitRating = async (req, res) => {
  try {
    const { rideId, riderId, score, comment, category } = req.body;
    const raterId = req.user.id || req.user.userId;
    
    if (!rideId || !riderId || !score || score < 1 || score > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid rating data. Score must be 1-5.' 
      });
    }
    
    // For now, store in RideMatch model (you might want a separate Rating model)
    const rating = {
      raterId,
      score,
      comment: comment || '',
      category: category || 'general',
      createdAt: new Date()
    };
    
    // Update or create rating in RideMatch
    const result = await RideMatch.findOneAndUpdate(
      { _id: rideId },
      { 
        $push: { ratings: rating },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    );
    
    res.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      rating 
    });
  } catch (error) {
    console.error('submitRating error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to submit rating' 
    });
  }
};

// GET /api/ratings/user/:userId
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, category = 'all' } = req.query;
    
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid userId' 
      });
    }
    
    const skip = (page - 1) * limit;
    const matchStage = { 'ratings.riderId': new mongoose.Types.ObjectId(userId) };
    
    if (category !== 'all') {
      matchStage['ratings.category'] = category;
    }
    
    const pipeline = [
      { $unwind: '$ratings' },
      { $match: matchStage },
      { $sort: { 'ratings.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $project: {
        rating: '$ratings',
        rideId: '$_id'
      }}
    ];
    
    const ratings = await RideMatch.aggregate(pipeline);
    
    res.json({
      success: true,
      data: ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.length
      }
    });
  } catch (error) {
    console.error('getUserRatings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get user ratings' 
    });
  }
};

// GET /api/ratings/given
exports.getRatingsGiven = async (req, res) => {
  try {
    const raterId = req.user.id || req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const pipeline = [
      { $unwind: '$ratings' },
      { $match: { 'ratings.raterId': new mongoose.Types.ObjectId(raterId) } },
      { $sort: { 'ratings.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $project: {
        rating: '$ratings',
        rideId: '$_id'
      }}
    ];
    
    const ratings = await RideMatch.aggregate(pipeline);
    
    res.json({
      success: true,
      data: ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratings.length
      }
    });
  } catch (error) {
    console.error('getRatingsGiven error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get ratings given' 
    });
  }
};

// PUT /api/ratings/:ratingId
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { score, comment, category } = req.body;
    const userId = req.user.id || req.user.userId;
    
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid score. Must be 1-5.' 
      });
    }
    
    const result = await RideMatch.updateOne(
      { 
        'ratings._id': new mongoose.Types.ObjectId(ratingId),
        'ratings.raterId': new mongoose.Types.ObjectId(userId)
      },
      { 
        $set: {
          'ratings.$.score': score,
          'ratings.$.comment': comment || '',
          'ratings.$.category': category || 'general',
          'ratings.$.updatedAt': new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rating not found or not owned by user' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Rating updated successfully' 
    });
  } catch (error) {
    console.error('updateRating error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update rating' 
    });
  }
};

// DELETE /api/ratings/:ratingId
exports.deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id || req.user.userId;
    
    const result = await RideMatch.updateOne(
      { 
        'ratings._id': new mongoose.Types.ObjectId(ratingId),
        'ratings.raterId': new mongoose.Types.ObjectId(userId)
      },
      { $pull: { ratings: { _id: new mongoose.Types.ObjectId(ratingId) } } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rating not found or not owned by user' 
    });
    }
    
    res.json({ 
      success: true, 
      message: 'Rating deleted successfully' 
    });
  } catch (error) {
    console.error('deleteRating error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete rating' 
    });
  }
};

// GET /api/ratings/user/:userId/average
exports.getAverageRating = async (req, res) => {
	try {
		const { userId } = req.params;
		if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
			return res.status(400).json({ success: false, message: 'Invalid userId' });
		}
		const riderObjectId = new mongoose.Types.ObjectId(userId);
		const pipeline = [
			{ $unwind: '$ratings' },
			{ $match: { 'ratings.riderId': riderObjectId } },
			{ $group: { _id: '$ratings.riderId', averageRating: { $avg: '$ratings.score' }, totalRatings: { $sum: 1 } } }
		];
		const result = await RideMatch.aggregate(pipeline);
		if (!result || result.length === 0) {
			return res.json({ success: true, data: { averageRating: 0, totalRatings: 0 } });
		}
		const avg = Number(result[0].averageRating.toFixed(1));
		return res.json({ success: true, data: { averageRating: avg, totalRatings: result[0].totalRatings } });
	} catch (error) {
		console.error('getAverageRating error:', error);
		return res.status(500).json({ success: false, message: error.message || 'Failed to compute average rating' });
	}
};