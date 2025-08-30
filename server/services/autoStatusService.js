// server/services/autoStatusService.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Routine = require('../models/Routine');
const notificationService = require('./notificationService');

class AutoStatusService {
  /**
   * Update user status based on their current class schedule
   */
  static async updateUserStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.status.isAutoUpdate) {
        return null; // User doesn't exist or auto-update is disabled
      }

      const currentTime = new Date();
      const currentDay = this.getDayName(currentTime.getDay());
      
      // Get all of the user's routine entries for today
      const todayRoutines = await Routine.find({ userId, day: currentDay }).lean();

      if (!todayRoutines.length) {
        // No classes today, set status to 'available' if it's not already
        return this.setUserStatus(user, 'available', 'No classes scheduled');
      }
      
      // Check each of today's classes
      for (const entry of todayRoutines) {
        const isInClass = this.isTimeInSlot(currentTime, entry.timeSlot);
        if (isInClass) {
          return this.setUserStatus(user, 'in_class', entry.course);
        }
      }

      // If not in any class, the user is now 'available'
      // This handles the case where a class has just ended.
      return this.setUserStatus(user, 'available', '');

    } catch (error) {
      console.error(`Error updating auto-status for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Set user status and location, but only if it has changed, then notify.
   */
  static async setUserStatus(user, newStatus, newLocation) {
    try {
      const oldStatus = user.status.current;
      const oldLocation = user.status.location;

      // Only update and notify if the status or location has actually changed.
      if (oldStatus === newStatus && oldLocation === newLocation) {
        return null; // No change needed
      }

      user.status.current = newStatus;
      user.status.location = newLocation;
      user.status.lastUpdated = new Date();
      
      await user.save();

      // Send notification about the status change
      try {
        await notificationService.sendStatusChangeNotification(user._id, newStatus, newLocation);
      } catch (notifyErr) {
        console.warn(`Failed to send status change notification for user ${user._id}:`, notifyErr.message);
      }

      return user;
    } catch (error)
    {
      console.error(`Error setting user status for ${user._id}:`, error);
      return null;
    }
  }

  /**
   * Get day name from day number (0=Sunday)
   */
  static getDayName(dayNumber) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNumber];
  }

  /**
   * Parse a 12-hour time string (e.g., '08:00 AM') into total minutes from midnight.
   */
  static parseTimeToMinutes(time12h) {
    const [time, ampm] = time12h.trim().split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let h = hours % 12;
    if (ampm.toUpperCase() === 'PM') h += 12;
    return h * 60 + minutes;
  }
  
  /**
   * Check if the current time falls within a given timeslot string (e.g., '08:00 AM-09:20 AM')
   */
  static isTimeInSlot(currentTime, timeSlot) {
    const [startStr, endStr] = timeSlot.split('-');
    const startMinutes = this.parseTimeToMinutes(startStr);
    const endMinutes = this.parseTimeToMinutes(endStr);
    
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Update status for all users with auto-update enabled
   */
  static async updateAllAutoUsers() {
    try {
      const autoUsers = await User.find({ 'status.isAutoUpdate': true });
      const results = [];
      
      for (const user of autoUsers) {
        const result = await this.updateUserStatus(user._id);
        if (result) {
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating all auto users:', error);
      return [];
    }
  }

  /**
   * Get next class time for a user today
   */
  static async getNextClassTime(userId) {
    try {
      const currentTime = new Date();
      const currentDay = this.getDayName(currentTime.getDay());
      
      const todayRoutines = await Routine.find({ userId, day: currentDay }).lean();
      if (!todayRoutines.length) return null;

      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      
      let nextClass = null;
      
      for (const routine of todayRoutines) {
          const [startStr, endStr] = routine.timeSlot.split('-');
          const startMinutes = this.parseTimeToMinutes(startStr);
          const endMinutes = this.parseTimeToMinutes(endStr);

          // If currently in this class
          if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
              return { time: endStr.trim(), course: routine.course, type: 'ongoing' };
          }
          
          // If this class is in the future today
          if (startMinutes > currentMinutes) {
              // If we haven't found a future class yet, or if this one is earlier
              if (!nextClass || startMinutes < this.parseTimeToMinutes(nextClass.time)) {
                  nextClass = { time: startStr.trim(), course: routine.course, type: 'upcoming' };
              }
          }
      }

      return nextClass; // This will be the soonest upcoming class, or null if all are past
    } catch (error) {
      console.error('Error getting next class time:', error);
      return null;
    }
  }
}

/**
 * The main periodic function that triggers updates.
 */
async function tick() {
  if (mongoose.connection.readyState !== 1) {
    console.warn('Auto-status tick skipped: DB not connected.');
    return;
  }
  
  try {
    const updatedUsers = await AutoStatusService.updateAllAutoUsers();
    if (updatedUsers.length > 0) {
      console.log(`✅ Auto-status updates completed. Updated ${updatedUsers.length} users.`);
    }
  } catch (err) {
    console.error('❌ Error during scheduled auto-status tick:', err);
  }
}

/**
 * Initializes and starts the scheduler for automatic status updates.
 * @param {object} options - Configuration for the scheduler.
 * @param {number} [options.intervalMs=300000] - The interval in milliseconds (defaults to 5 minutes).
 */
function startAutoStatusScheduler({ intervalMs = 5 * 60 * 1000 } = {}) {
  console.log(`🔄 Scheduled auto-status updates set to run every ${intervalMs / 60000} minutes.`);
  
  // Run once shortly after server startup
  setTimeout(() => tick(), 15 * 1000); // 15 seconds after start
  
  // Then run periodically
  setInterval(tick, intervalMs);
}

module.exports = { AutoStatusService, startAutoStatusScheduler };