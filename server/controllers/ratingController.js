const mongoose = require('mongoose');
const RideMatch = require('../models/RideMatch');

// Helper to send 501 for unimplemented routes
function notImplemented(res, name) {
	return res.status(501).json({ success: false, message: `${name} not implemented in current build` });
}

// POST /api/ratings
exports.submitRating = (req, res) => notImplemented(res, 'submitRating');

// GET /api/ratings/user/:userId
exports.getUserRatings = (req, res) => notImplemented(res, 'getUserRatings');

// GET /api/ratings/given
exports.getRatingsGiven = (req, res) => notImplemented(res, 'getRatingsGiven');

// PUT /api/ratings/:ratingId
exports.updateRating = (req, res) => notImplemented(res, 'updateRating');

// DELETE /api/ratings/:ratingId
exports.deleteRating = (req, res) => notImplemented(res, 'deleteRating');

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