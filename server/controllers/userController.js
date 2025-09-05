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
      .select('name email gender location avatarUrl bracuId phone preferences routineSharingEnabled');
      
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
 * Update user's settings, including routine sharing
 */
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { routineSharingEnabled } = req.body;
        
        const updates = {};
        if (typeof routineSharingEnabled === 'boolean') {
            updates.routineSharingEnabled = routineSharingEnabled;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid settings provided' });
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select('name email preferences routineSharingEnabled');
        
        res.json({
            message: 'Settings updated successfully',
            settings: {
                routineSharingEnabled: user.routineSharingEnabled
            }
        });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
};

/**
 * Update user status
 */
exports.updateStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { status, location, isAutoUpdate } = req.body;

    if (!status && typeof isAutoUpdate !== 'boolean') {
      return res.status(400).json({ error: 'Status or isAutoUpdate flag is required' });
    }
    
    // Find the user to check their old status first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldStatus = user.status.current;

    // Prepare the updates
    const updates = { 'status.lastUpdated': new Date() };
    if (status) {
      const validStatuses = ['available', 'busy', 'in_class', 'studying', 'free'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates['status.current'] = status;
    }
    if (location !== undefined) updates['status.location'] = location;
    if (typeof isAutoUpdate === 'boolean') updates['status.isAutoUpdate'] = isAutoUpdate;
    
    // Apply the updates to the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('name email status');

    // --- THIS IS THE CORE FIX ---
    // Only send a notification if the actual status text has changed.
    // This prevents notifications when just toggling the auto-update switch.
    const newStatus = updatedUser.status.current;
    if (status && oldStatus !== newStatus) {
      try {
        const notificationService = require('../services/notificationService');
        await notificationService.sendStatusChangeNotification(userId, newStatus, updatedUser.status.location);
      } catch (notifyErr) {
        console.warn('Failed to send status change notification from controller:', notifyErr.message);
      }
    }
    
    res.json(updatedUser);
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

    // Avatar upload debug logging removed for security

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: 'sathi-lagbe/avatars',
        transformation: [{ width: 256, height: 256, crop: 'thumb', gravity: 'face' }]
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(file.buffer);
    });

    // Delete previous avatar if exists
    const current = await User.findById(userId).select('avatarPublicId');
    if (current?.avatarPublicId) {
      try { 
        await cloudinary.uploader.destroy(current.avatarPublicId); 
        // Avatar deletion logging removed for security
      } catch (destroyErr) {
        console.warn('Failed to delete previous avatar:', destroyErr.message);
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { avatarUrl: uploadResult.secure_url, avatarPublicId: uploadResult.public_id } },
      { new: true }
    ).select('name email gender location avatarUrl');

    // Avatar update success logging removed for security

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

/**
 * Get next class information for auto-status users
 */
exports.getNextClassInfo = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { AutoStatusService } = require('../services/autoStatusService');
    
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
    const { AutoStatusService } = require('../services/autoStatusService');
    const Routine = require('../models/Routine');

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasAnyRoutine = await Routine.exists({ userId });
    if (!hasAnyRoutine) {
      return res.status(400).json({ error: 'No class schedule found. Please add your routine first.' });
    }

    if (!user.status.isAutoUpdate) {
      user.status.isAutoUpdate = true;
      await user.save();
    }

    const updatedUser = await AutoStatusService.updateUserStatus(userId);

    if (!updatedUser) {
      return res.status(400).json({ error: 'No class schedule found for today.' });
    }

    // --- NOTIFICATION LOGIC FIX ---
    // The conditional check has been removed. A notification will now ALWAYS be sent
    // after a successful manual trigger, confirming the action to friends.
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendStatusChangeNotification(
        updatedUser._id,
        updatedUser.status.current,
        updatedUser.status.location
      );
    } catch (notifyErr) {
      // Silently fail if notification fails, but the main action succeeded.
    }

    res.json({
      message: 'Status updated automatically based on your schedule.',
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
    // Debug endpoint logging removed for security
    const userId = req.user.id || req.user.userId;
    
    const Routine = require('../models/Routine');
    const { AutoStatusService } = require('../services/autoStatusService');
    
    // Debug logging removed for security
    
    const user = await User.findById(userId).select('status');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get current day using different methods
    const currentDate = new Date();
    const dayNumber = currentDate.getDay();
    
    const dayNameFromService = AutoStatusService.getDayName(dayNumber);
    const dayNameFromController = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get all routines for the user
    const allRoutines = await Routine.find({ userId }).select('day timeSlot course');
    
    // Check for today's routine using both methods
    const routineFromService = await Routine.findOne({
      userId,
      day: dayNameFromService
    });
    
    const routineFromController = await Routine.findOne({
      userId,
      day: dayNameFromController
    });
    
    // Routine matching logging removed for security
    
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
    
    // Debug response logging removed for security
    res.json(response);
  } catch (err) {
    console.error('❌ Error in debug endpoint:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: err.message || 'Failed to debug auto-status' });
  }
};