#!/usr/bin/env node

/**
 * Standalone script to clean up orphaned notifications
 * Run with: node cleanup-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const RideMatch = require('./models/RideMatch');

async function cleanupOrphanedNotifications() {
  try {
    console.log('🧹 Starting cleanup of orphaned notifications...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all ride-related notifications
    const rideNotifications = await Notification.find({
      type: { $in: ['ride_invitation', 'ride_cancellation', 'eta_change', 'ride_confirmation', 'ride_completion', 'ride_request'] }
    });
    
    console.log(`📊 Found ${rideNotifications.length} ride-related notifications`);
    
    let deletedCount = 0;
    let validCount = 0;
    
    for (const notification of rideNotifications) {
      if (notification.data?.rideId) {
        // Check if the ride still exists
        const ride = await RideMatch.findById(notification.data.rideId);
        if (!ride) {
          // Ride doesn't exist, delete the notification
          await Notification.findByIdAndDelete(notification._id);
          deletedCount++;
          console.log(`🗑️ Deleted orphaned notification for deleted ride: ${notification.data.rideId}`);
        } else {
          validCount++;
        }
      }
    }
    
    console.log(`✅ Cleanup complete!`);
    console.log(`📊 Results:`);
    console.log(`   - Total notifications checked: ${rideNotifications.length}`);
    console.log(`   - Valid notifications: ${validCount}`);
    console.log(`   - Deleted orphaned notifications: ${deletedCount}`);
    
    if (deletedCount > 0) {
      console.log(`🎉 Successfully cleaned up ${deletedCount} orphaned notifications!`);
    } else {
      console.log(`✨ No orphaned notifications found. Database is clean!`);
    }
    
  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanupOrphanedNotifications();
