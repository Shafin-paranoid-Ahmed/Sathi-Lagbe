// server/controllers/feedbackController.js - Merged implementation
const Feedback = require('../models/Feedback');
const RideMatch = require('../models/RideMatch');

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