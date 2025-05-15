// server/controllers/userController.js
const User = require('../models/User');

/**
 * Get all users (except the current user)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user.userId;
    
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('name email location');
      
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
};

/**
 * Search for users by name or email
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id || req.user.userId;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('name email location');
    
    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: err.message || 'Failed to search users' });
  }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('name email gender location');
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
};

/**
 * Update current user's profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { name, location, gender } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (gender) updates.gender = gender;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('name email gender location');
    
    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
};