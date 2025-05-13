const Feedback = require('../models/Feedback');
const RideMatch = require('../models/RideMatch');

exports.submitFeedback = async (req, res) => {
  const { rideId, overallScore, comments } = req.body;
  const userId = req.user.userId;  // from authenticateUser middleware

  if (!rideId || !overallScore) {
    return res.status(400).json({ error: 'rideId and overallScore are required' });
  }

  try {
    // Optional: ensure ride exists
    const ride = await RideMatch.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Prevent duplicate feedback by same user
    const exists = await Feedback.findOne({ rideId, userId });
    if (exists) {
      return res.status(400).json({ error: 'You have already submitted feedback' });
    }

    const fb = new Feedback({ rideId, userId, overallScore, comments: comments || '' });
    await fb.save();
    res.json({ message: 'Feedback submitted', feedback: fb });
  } catch (err) {
    console.error('Feedback submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
