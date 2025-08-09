// server/controllers/userController.js
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

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
    const { name, location, gender, phone } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (gender) updates.gender = gender;
    if (phone) {
      const bdPhoneRegex = /^\+880\d{10}$/;
      if (!bdPhoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Phone must be in Bangladeshi format +880XXXXXXXXXX (10 digits)' });
      }
      updates.phone = phone;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('name email gender location phone avatarUrl');
    
    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
};

/**
 * Update user status
 */
exports.updateStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status, location, isAutoUpdate = false } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const validStatuses = ['available', 'busy', 'in_class', 'studying', 'free'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'status.current': status,
          'status.location': location || '',
          'status.lastUpdated': new Date(),
          'status.isAutoUpdate': isAutoUpdate
        }
      },
      { new: true }
    ).select('name email status');
    
    // Send notification to friends about status change
    const notificationService = require('../services/notificationService');
    await notificationService.sendStatusChangeNotification(userId, status, location);
    
    res.json(user);
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
};

/**
 * Get user status
 */
exports.getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('name email status');
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      userId: user._id,
      name: user.name,
      status: user.status
    });
  } catch (err) {
    console.error('Error fetching user status:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user status' });
  }
};

/**
 * Upload or update profile picture
 */
exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: 'sathi-lagbe/avatars',
      transformation: [{ width: 256, height: 256, crop: 'thumb', gravity: 'face' }]
    });

    // Delete previous avatar if exists
    const current = await User.findById(userId).select('avatarPublicId');
    if (current?.avatarPublicId) {
      try { await cloudinary.uploader.destroy(current.avatarPublicId); } catch {}
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { avatarUrl: uploadResult.secure_url, avatarPublicId: uploadResult.public_id } },
      { new: true }
    ).select('name email gender location avatarUrl');

    // Cleanup temp file
    try { fs.unlink(file.path, () => {}); } catch {}

    res.json({ message: 'Avatar updated', user: updated });
  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ error: err.message || 'Failed to update avatar' });
  }
};