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
    
    // Send notification to friends only when user becomes 'available' or 'free'
    try {
      const shouldNotify = ['available', 'free'].includes(String(status).toLowerCase());
      if (shouldNotify) {
        const notificationService = require('../services/notificationService');
        await notificationService.sendStatusChangeNotification(userId, status, location);
      }
    } catch (notifyErr) {
      console.warn('Status change notification skipped/failed:', notifyErr?.message);
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
 * Get next class information for auto-status users
 */
exports.getNextClassInfo = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const AutoStatusService = require('../services/autoStatusService');
    
    const nextClassInfo = await AutoStatusService.getNextClassTime(userId);
    
    res.json({
      nextClass: nextClassInfo,
      currentTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching next class info:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch next class info' });
  }
};

/**
 * Manually trigger auto-status update for current user
 */
exports.triggerAutoStatusUpdate = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const AutoStatusService = require('../services/autoStatusService');
    const Routine = require('../models/Routine');
    
    // First check if user has auto-update enabled
    const user = await User.findById(userId).select('status');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.status.isAutoUpdate) {
      return res.status(400).json({ 
        error: 'Auto-status update is not enabled. Please enable it first in your status settings.' 
      });
    }
    
    // Check if user has any routine entries
    const hasRoutine = await Routine.exists({ userId });
    if (!hasRoutine) {
      return res.status(400).json({ 
        error: 'No class schedule found. Please add your class routine first before using auto-status updates.' 
      });
    }
    
    const updatedUser = await AutoStatusService.updateUserStatus(userId);
    
    if (!updatedUser) {
      return res.status(400).json({ 
        error: 'Auto-status update failed. Please check if you have a class schedule set up for today.' 
      });
    }
    
    res.json({
      message: 'Status updated automatically',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error triggering auto-status update:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger auto-status update' });
  }
};

/**
 * Get user's routine for today
 */
exports.getTodayRoutine = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const Routine = require('../models/Routine');
    
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayRoutine = await Routine.findOne({
      userId,
      day: currentDay
    });
    
    res.json({
      todayRoutine,
      currentDay,
      hasRoutine: !!todayRoutine
    });
  } catch (err) {
    console.error('Error fetching today\'s routine:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch today\'s routine' });
  }
};

/**
 * Check user's auto-status setup status
 */
exports.checkAutoStatusSetup = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const Routine = require('../models/Routine');
    
    const user = await User.findById(userId).select('status');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayRoutine = await Routine.findOne({
      userId,
      day: currentDay
    });
    
    const totalRoutines = await Routine.countDocuments({ userId });
    
    res.json({
      autoUpdateEnabled: user.status.isAutoUpdate,
      hasRoutineToday: !!todayRoutine,
      totalRoutines,
      currentDay,
      todayRoutine,
      setupComplete: user.status.isAutoUpdate && totalRoutines > 0,
      message: user.status.isAutoUpdate 
        ? (totalRoutines > 0 
          ? 'Auto-status is properly configured' 
          : 'Auto-status enabled but no class routine found')
        : 'Auto-status is not enabled'
    });
  } catch (err) {
    console.error('Error checking auto-status setup:', err);
    res.status(500).json({ error: err.message || 'Failed to check auto-status setup' });
  }
};

/**
 * Debug endpoint to check day names and routine matching
 */
exports.debugAutoStatus = async (req, res) => {
  try {
    console.log('🔍 Debug endpoint called');
    const userId = req.user.id || req.user.userId;
    console.log('👤 User ID:', userId);
    
    const Routine = require('../models/Routine');
    const AutoStatusService = require('../services/autoStatusService');
    
    console.log('📚 Models loaded successfully');
    
    const user = await User.findById(userId).select('status');
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found, status:', user.status);
    
    // Get current day using different methods
    const currentDate = new Date();
    const dayNumber = currentDate.getDay();
    console.log('📅 Current date:', currentDate.toISOString(), 'Day number:', dayNumber);
    
    const dayNameFromService = AutoStatusService.getDayName(dayNumber);
    const dayNameFromController = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    console.log('📅 Day names - Service:', dayNameFromService, 'Controller:', dayNameFromController);
    
    // Get all routines for the user
    const allRoutines = await Routine.find({ userId }).select('day timeSlot course');
    console.log('📚 Total routines found:', allRoutines.length);
    
    // Check for today's routine using both methods
    const routineFromService = await Routine.findOne({
      userId,
      day: dayNameFromService
    });
    
    const routineFromController = await Routine.findOne({
      userId,
      day: dayNameFromController
    });
    
    console.log('📚 Routines - Service method:', routineFromService ? 'Found' : 'Not found', 'Controller method:', routineFromController ? 'Found' : 'Not found');
    
    const response = {
      debug: {
        currentDate: currentDate.toISOString(),
        dayNumber,
        dayNameFromService,
        dayNameFromController,
        dayNamesMatch: dayNameFromService === dayNameFromController,
        userAutoUpdate: user.status.isAutoUpdate,
        totalRoutines: allRoutines.length,
        allRoutineDays: allRoutines.map(r => r.day),
        routineFromService: routineFromService ? {
          day: routineFromService.day,
          timeSlot: routineFromService.timeSlot,
          course: routineFromService.course
        } : null,
        routineFromController: routineFromController ? {
          day: routineFromController.day,
          timeSlot: routineFromController.timeSlot,
          course: routineFromController.course
        } : null
      }
    };
    
    console.log('✅ Debug response prepared, sending...');
    res.json(response);
  } catch (err) {
    console.error('❌ Error in debug endpoint:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: err.message || 'Failed to debug auto-status' });
  }
};