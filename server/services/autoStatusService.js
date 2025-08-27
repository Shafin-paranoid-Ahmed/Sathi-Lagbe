const User = require('../models/User');
const Routine = require('../models/Routine');

class AutoStatusService {
  /**
   * Update user status based on their current class schedule
   */
  static async updateUserStatus(userId) {
    try {
      console.log(`🔄 Starting auto-status update for user: ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return null; // User doesn't exist
      }
      
      console.log(`👤 User found: ${user.name}, Auto-update enabled: ${user.status.isAutoUpdate}`);
      
      if (!user.status.isAutoUpdate) {
        console.log(`❌ Auto-update not enabled for user: ${userId}`);
        return null; // Auto-update is disabled
      }

      const currentTime = new Date();
      const currentDay = this.getDayName(currentTime.getDay());
      const currentTimeString = this.formatTime(currentTime);
      
      console.log(`🕐 Updating status for user ${userId} on ${currentDay} at ${currentTimeString}`);
      
      // Get user's routine for today
      const todayRoutine = await Routine.findOne({
        userId,
        day: currentDay
      });

      if (!todayRoutine) {
        // No classes today, set status to 'free'
        console.log(`📅 No routine found for ${currentDay}, setting status to 'free'`);
        const result = await this.setUserStatus(userId, 'free', 'No classes scheduled today');
        console.log(`✅ Status updated to 'free':`, result ? 'Success' : 'Failed');
        return result;
      }

      console.log(`📚 Found routine: ${todayRoutine.course} at ${todayRoutine.timeSlot}`);

      // Check if user is currently in class
      const isInClass = this.isTimeInSlot(currentTimeString, todayRoutine.timeSlot);
      
      if (isInClass) {
        console.log(`🎓 User is in class: ${todayRoutine.course}`);
        const result = await this.setUserStatus(userId, 'in_class', `In class: ${todayRoutine.course}`);
        console.log(`✅ Status updated to 'in_class':`, result ? 'Success' : 'Failed');
        return result;
      }

      // Check if user is between classes (busy)
      const isBetweenClasses = this.isBetweenClasses(currentTimeString, todayRoutine.timeSlot);
      
      if (isBetweenClasses) {
        console.log(`⏰ User is between classes`);
        const result = await this.setUserStatus(userId, 'busy', 'Between classes');
        console.log(`✅ Status updated to 'busy' (between classes):`, result ? 'Success' : 'Failed');
        return result;
      }

      // Check if user is preparing for next class (within 15 minutes)
      const isPreparingForClass = this.isPreparingForClass(currentTimeString, todayRoutine.timeSlot);
      
      if (isPreparingForClass) {
        console.log(`📝 User is preparing for class: ${todayRoutine.course}`);
        const result = await this.setUserStatus(userId, 'busy', `Preparing for next class: ${todayRoutine.course}`);
        console.log(`✅ Status updated to 'busy' (preparing):`, result ? 'Success' : 'Failed');
        return result;
      }

      // Default to available if no specific condition is met
      console.log(`✅ No specific condition met, setting status to 'available'`);
      const result = await this.setUserStatus(userId, 'available', 'Available');
      console.log(`✅ Status updated to 'available':`, result ? 'Success' : 'Failed');
      return result;
    } catch (error) {
      console.error('❌ Error updating user status automatically:', error);
      return null;
    }
  }

  /**
   * Set user status and location
   */
  static async setUserStatus(userId, status, location) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'status.current': status,
            'status.location': location,
            'status.lastUpdated': new Date()
            // Don't change isAutoUpdate - preserve user's setting
          }
        },
        { new: true }
      ).select('name email status');

      return user;
    } catch (error) {
      console.error('Error setting user status:', error);
      return null;
    }
  }

  /**
   * Get day name from day number
   */
  static getDayName(dayNumber) {
    // Use the same format as the controller methods for consistency
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }

  /**
   * Format time to match routine time slot format
   */
  static formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }

  /**
   * Check if current time is within a class time slot
   */
  static isTimeInSlot(currentTime, timeSlot) {
    const [startTime, endTime] = timeSlot.split('-');
    return this.isTimeBetween(currentTime, startTime, endTime);
  }

  /**
   * Check if current time is between classes
   */
  static isBetweenClasses(currentTime, timeSlot) {
    const [startTime, endTime] = timeSlot.split('-');
    const endTimeObj = this.parseTime(endTime);
    const currentTimeObj = this.parseTime(currentTime);
    
    // Check if current time is within 20 minutes after class ends
    const twentyMinutesLater = new Date(endTimeObj.getTime() + 20 * 60000);
    return currentTimeObj >= endTimeObj && currentTimeObj <= twentyMinutesLater;
  }

  /**
   * Check if user is preparing for next class (within 15 minutes)
   */
  static isPreparingForClass(currentTime, timeSlot) {
    const [startTime, endTime] = timeSlot.split('-');
    const startTimeObj = this.parseTime(startTime);
    const currentTimeObj = this.parseTime(currentTime);
    
    // Check if current time is within 15 minutes before class starts
    const fifteenMinutesBefore = new Date(startTimeObj.getTime() - 15 * 60000);
    return currentTimeObj >= fifteenMinutesBefore && currentTimeObj <= startTimeObj;
  }

  /**
   * Check if time is between two times
   */
  static isTimeBetween(currentTime, startTime, endTime) {
    const current = this.parseTime(currentTime);
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    return current >= start && current <= end;
  }

  /**
   * Parse time string to Date object
   */
  static parseTime(timeString) {
    const [time, period] = timeString.trim().split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    const date = new Date();
    date.setHours(hour, parseInt(minutes), 0, 0);
    return date;
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
   * Get next class time for a user
   */
  static async getNextClassTime(userId) {
    try {
      const currentTime = new Date();
      const currentDay = this.getDayName(currentTime.getDay());
      const currentTimeString = this.formatTime(currentTime);
      
      // Get today's routine
      const todayRoutine = await Routine.findOne({
        userId,
        day: currentDay
      });

      if (!todayRoutine) {
        return null;
      }

      const [startTime, endTime] = todayRoutine.timeSlot.split('-');
      const startTimeObj = this.parseTime(startTime);
      const currentTimeObj = this.parseTime(currentTime);

      // If class hasn't started yet, return start time
      if (currentTimeObj < startTimeObj) {
        return {
          time: startTime,
          course: todayRoutine.course,
          type: 'upcoming'
        };
      }

      // If class is ongoing, return end time
      if (this.isTimeInSlot(currentTimeString, todayRoutine.timeSlot)) {
        return {
          time: endTime,
          course: todayRoutine.course,
          type: 'ongoing'
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting next class time:', error);
      return null;
    }
  }
}

module.exports = AutoStatusService;
