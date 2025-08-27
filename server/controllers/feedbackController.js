// server/controllers/feedbackController.js - Merged implementation
const Feedback = require('../models/Feedback');
const RideMatch = require('../models/RideMatch');
const User = require('../models/User');

/**
 * Submit feedback for a ride
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { rideId, overallScore, comments } = req.body;
    const userId = req.user.id || req.user.userId;
    
    if (!rideId || !overallScore) {
      return res.status(400).json({ error: 'rideId and overallScore are required' });
    }
    
    // Validate score
    if (overallScore < 1 || overallScore > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }
    
    // Ensure ride exists
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Prevent duplicate feedback by same user
    const exists = await Feedback.findOne({ rideId, userId });
    if (exists) {
      return res.status(400).json({ error: 'You have already submitted feedback for this ride' });
    }
    
    // Create and save feedback
    const feedback = new Feedback({
      rideId,
      userId,
      overallScore: Number(overallScore),
      comments: comments || ''
    });
    
    await feedback.save();
    
    res.json({
      message: 'Feedback submitted',
      feedback
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: err.message || 'Failed to submit feedback' });
  }
};

/**
 * Get feedback for a ride
 */
exports.getRideFeedback = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const feedback = await Feedback.find({ rideId })
      .populate('userId', 'name');
      
    res.json(feedback);
  } catch (err) {
    console.error('Error getting feedback:', err);
    res.status(500).json({ error: err.message || 'Failed to get feedback' });
  }
};

/**
 * Get feedback by a user
 */
exports.getUserFeedback = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const feedback = await Feedback.find({ userId })
      .populate('rideId');
      
    res.json(feedback);
  } catch (err) {
    console.error('Error getting user feedback:', err);
    res.status(500).json({ error: err.message || 'Failed to get user feedback' });
  }
};

/**
 * Breakdown feedback for a ride: passenger feedback and owner's feedback about riders
 */
exports.getRideFeedbackBreakdown = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await RideMatch.findById(rideId).lean();
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    const ownerId = ride.riderId.toString();
    const confirmedUserIds = (ride.confirmedRiders || []).map(cr => cr.user.toString());

    // Segment 1a: feedback written by passengers (Feedback collection)
    const riderFeedbackDocs = await Feedback.find({ rideId, userId: { $in: confirmedUserIds } })
      .populate('userId', 'name avatarUrl')
      .lean();

    // Segment 1b: ratings written by passengers about the owner (RideMatch.ratings)
    const passengerRatingsOnOwner = (ride.ratings || []).filter(rt => {
      return rt.riderId && rt.raterId && rt.riderId.toString() === ownerId && confirmedUserIds.includes(rt.raterId.toString());
    });

    // Map rater info
    const passengerRaterIds = [...new Set(passengerRatingsOnOwner.map(rt => rt.raterId.toString()))];
    const passengerRaters = passengerRaterIds.length ? await User.find({ _id: { $in: passengerRaterIds } }).select('name avatarUrl').lean() : [];
    const raterMap = new Map(passengerRaters.map(u => [u._id.toString(), u]));
    const riderRatingsCombined = passengerRatingsOnOwner.map(rt => ({
      userId: { _id: rt.raterId.toString(), name: (raterMap.get(rt.raterId.toString())?.name) || 'User', avatarUrl: raterMap.get(rt.raterId.toString())?.avatarUrl || null },
      overallScore: rt.score,
      comments: rt.comment || ''
    }));

    // Merge feedback docs and ratings on owner
    const riderFeedback = [...riderFeedbackDocs, ...riderRatingsCombined];

    // Segment 2: owner's feedback about riders (use ratings made by owner about riders)
    const ownerAbout = (ride.ratings || []).filter(rt => {
      return rt.raterId && rt.raterId.toString() === ownerId && confirmedUserIds.includes(rt.riderId.toString());
    });

    const targetIds = [...new Set(ownerAbout.map(rt => rt.riderId.toString()))];
    const users = targetIds.length ? await User.find({ _id: { $in: targetIds } }).select('name avatarUrl').lean() : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const ownerAboutRiders = ownerAbout.map(rt => ({
      riderId: rt.riderId.toString(),
      raterId: rt.raterId ? rt.raterId.toString() : null,
      score: rt.score,
      comment: rt.comment || '',
      rider: userMap.get(rt.riderId.toString()) || null
    }));

    return res.json({ riderFeedback, ownerAboutRiders });
  } catch (err) {
    console.error('Error getting feedback breakdown:', err);
    res.status(500).json({ error: err.message || 'Failed to get feedback breakdown' });
  }
};