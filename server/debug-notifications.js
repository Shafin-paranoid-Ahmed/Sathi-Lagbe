#!/usr/bin/env node

/**
 * Debug script to check notifications and their ride IDs
 * Run with: node debug-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const RideMatch = require('./models/RideMatch');

async function debugNotifications() {
  try {
    console.log('🔍 Starting notification debug...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all ride request notifications
    const rideRequestNotifications = await Notification.find({
      type: 'ride_request'
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${rideRequestNotifications.length} ride request notifications`);
    
    for (const notification of rideRequestNotifications) {
      console.log('\n--- Notification ---');
      console.log('ID:', notification._id);
      console.log('Type:', notification.type);
      console.log('Recipient:', notification.recipient);
      console.log('Sender:', notification.sender);
      console.log('Created:', notification.createdAt);
      console.log('Data:', JSON.stringify(notification.data, null, 2));
      
      if (notification.data?.rideId) {
        const rideId = notification.data.rideId;
        console.log('Ride ID from notification:', rideId);
        console.log('Ride ID type:', typeof rideId);
        
        // Check if ride exists
        const ride = await RideMatch.findById(rideId);
        if (ride) {
          console.log('✅ Ride found:', {
            id: ride._id,
            startLocation: ride.startLocation,
            endLocation: ride.endLocation,
            status: ride.status
          });
        } else {
          console.log('❌ Ride NOT found with ID:', rideId);
          
          // Try different formats
          const rideAsString = await RideMatch.findById(rideId.toString());
          const rideAsObjectId = await RideMatch.findById(new mongoose.Types.ObjectId(rideId));
          
          console.log('  - As string:', rideAsString ? 'Found' : 'Not found');
          console.log('  - As ObjectId:', rideAsObjectId ? 'Found' : 'Not found');
        }
      } else {
        console.log('❌ No rideId in notification data');
      }
    }
    
    // Also check what rides actually exist
    console.log('\n=== EXISTING RIDES ===');
    const existingRides = await RideMatch.find({}).select('_id startLocation endLocation status createdAt').sort({ createdAt: -1 }).limit(10);
    console.log(`Found ${existingRides.length} rides in database:`);
    
    for (const ride of existingRides) {
      console.log(`  - ${ride._id}: ${ride.startLocation} → ${ride.endLocation} (${ride.status}) - Created: ${ride.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the debug
debugNotifications();
