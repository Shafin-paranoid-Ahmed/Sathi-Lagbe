// server/controllers/friendController.js - Merged implementation
const FriendStatus = require('../models/FriendStatus');

/**
 * Set user availability status
 */
exports.setStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { isFree } = req.body;
    
    if (typeof isFree !== 'boolean') {
      return res.status(400).json({ error: 'isFree must be a boolean' });
    }
    
    let record = await FriendStatus.findOne({ userId });
    
    if (!record) {
      record = new FriendStatus({ userId });
    }
    
    record.isFree = isFree;
    record.lastUpdated = Date.now();
    
    await record.save();
    
    res.json(record);
  } catch (err) {
    console.error('Error setting status:', err);
    res.status(500).json({ error: err.message || 'Failed to set status' });
  }
};

/**
 * Get all free friends
 */
exports.getFreeFriends = async (req, res) => {
  try {
    const freeStatuses = await FriendStatus.find({ isFree: true })
      .populate('userId', 'name location');
      
    res.json(freeStatuses);
  } catch (err) {
    console.error('Error getting free friends:', err);
    res.status(500).json({ error: err.message || 'Failed to get free friends' });
  }
};