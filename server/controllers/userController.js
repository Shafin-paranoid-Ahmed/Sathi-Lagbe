// server/controllers/userController.js
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');
const mongoose = require('mongoose');

/**
 * Get all users (except the current user)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user.userId;
    
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('name email location avatarUrl bracuId');
      
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
    }).select('name email location avatarUrl bracuId');
    
    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: err.message || 'Failed to search users' });
  }
};

/**
 * Get current user's profile
 */
exports.getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const user = await User.findById(userId)
      .select('name email gender location avatarUrl bracuId phone preferences');
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching current user profile:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
};

/**
 * Get user profile by ID
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('name email gender location avatarUrl bracuId');
      
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
    const { name, location, gender, phone, bracuId } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (gender) updates.gender = gender;
    if (bracuId) updates.bracuId = bracuId;
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
    ).select('name email gender location phone bracuId avatarUrl');
    
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
    
    // Send notification to friends for any status change
    try {
        const notificationService = require('../services/notificationService');
        await notificationService.sendStatusChangeNotification(userId, status, location);
    } catch (notifyErr) {
      // silently fail
    }
    
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
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must be less than 5MB' });
    }

    // Verify user exists and owns this profile
    const userExists = await User.findById(userId).select('_id name');
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('=== AVATAR UPLOAD DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Name:', userExists.name);
    console.log('File:', file.originalname, file.size, file.mimetype);

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: 'sathi-lagbe/avatars',
      transformation: [{ width: 256, height: 256, crop: 'thumb', gravity: 'face' }]
    });

    // Delete previous avatar if exists
    const current = await User.findById(userId).select('avatarPublicId');
    if (current?.avatarPublicId) {
      try { 
        await cloudinary.uploader.destroy(current.avatarPublicId); 
        console.log('Previous avatar deleted:', current.avatarPublicId);
      } catch (destroyErr) {
        console.warn('Failed to delete previous avatar:', destroyErr.message);
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { avatarUrl: uploadResult.secure_url, avatarPublicId: uploadResult.public_id } },
      { new: true }
    ).select('name email gender location avatarUrl');

    console.log('Avatar updated successfully for user:', userId);
    console.log('New avatar URL:', uploadResult.secure_url);

    // Cleanup temp file
    try { fs.unlink(file.path, () => {}); } catch {}

    res.json({ 
      message: 'Avatar updated successfully', 
      user: updated,
      success: true 
    });
  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ error: err.message || 'Failed to update avatar' });
  }
};

/**
 * Add a classroom to bookmarks
 */
exports.addBookmark = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { classroomId } = req.params;

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { bookmarkedClassrooms: classroomId } },
      { new: true }
    );

    res.json({ success: true, message: 'Classroom bookmarked' });
  } catch (err) {
    console.error('Error adding bookmark:', err);
    res.status(500).json({ error: err.message || 'Failed to add bookmark' });
  }
};

/**
 * Remove a classroom from bookmarks
 */
exports.removeBookmark = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { classroomId } = req.params;

    await User.findByIdAndUpdate(
      userId,
      { $pull: { bookmarkedClassrooms: classroomId } },
      { new: true }
    );

    res.json({ success: true, message: 'Classroom bookmark removed' });
  } catch (err) {
    console.error('Error removing bookmark:', err);
    res.status(500).json({ error: err.message || 'Failed to remove bookmark' });
  }
};

/**
 * Get bookmarked classrooms for the current user
 */
exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const user = await User.findById(userId).select('bookmarkedClassrooms').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawBookmarks = Array.isArray(user.bookmarkedClassrooms) ? user.bookmarkedClassrooms : [];

    // Validate IDs to prevent cast errors
    const validIds = rawBookmarks.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Fetch classrooms for valid IDs only
    const classrooms = await Classroom.find({ _id: { $in: validIds } }).lean();

    res.json({ success: true, bookmarks: classrooms });
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch bookmarks' });
  }
};