const notificationService = require('./services/notificationService');
const mongoose = require('mongoose');

// Test script to demonstrate all notification types
async function testNotifications() {
  try {
    // Connect to MongoDB (replace with your connection string)
    await mongoose.connect('mongodb://localhost:27017/sathi-lagbe', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Test user IDs (replace with actual user IDs from your database)
    const testUserId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
    const testFriendId = '507f1f77bcf86cd799439012'; // Replace with actual user ID
    const testRideId = '507f1f77bcf86cd799439013'; // Replace with actual ride ID
    
    console.log('\n=== Testing Comprehensive Notification System ===\n');
    
    // 1. Test Ride-related notifications
    console.log('1. Testing Ride-related notifications...');
    
    // Ride request notification
    await notificationService.sendRideRequestNotification(testRideId, testUserId, testFriendId);
    console.log('✅ Ride request notification sent');
    
    // ETA change notification
    await notificationService.sendEtaChangeNotification(testRideId, testFriendId, new Date(Date.now() + 30 * 60 * 1000), 'Traffic delay');
    console.log('✅ ETA change notification sent');
    
    // Route change notification
    await notificationService.sendRouteChangeNotification(testRideId, testFriendId, 'New Pickup Location', 'New Dropoff Location');
    console.log('✅ Route change notification sent');
    
    // Capacity alert notification
    await notificationService.sendCapacityAlertNotification(testRideId, testFriendId, 2);
    console.log('✅ Capacity alert notification sent');
    
    // Ride completion notification
    await notificationService.sendRideCompletionNotification(testRideId, testFriendId, [testUserId]);
    console.log('✅ Ride completion notification sent');
    
    // 2. Test Social notifications
    console.log('\n2. Testing Social notifications...');
    
    // Friend activity notification
    await notificationService.sendFriendActivityNotification(testUserId, testFriendId, 'joined_ride', testRideId);
    console.log('✅ Friend activity notification sent');
    
    // Group ride suggestion notification
    await notificationService.sendGroupRideSuggestionNotification(testUserId, [testFriendId], testRideId);
    console.log('✅ Group ride suggestion notification sent');
    
    // Safety check-in notification
    await notificationService.sendSafetyCheckinNotification(testUserId, 'BRACU Campus', 'safe');
    console.log('✅ Safety check-in notification sent');
    
    // 3. Test Smart matching notifications
    console.log('\n3. Testing Smart matching notifications...');
    
    // Better match found notification
    await notificationService.sendBetterMatchNotification(testUserId, testRideId, testRideId, 95);
    console.log('✅ Better match found notification sent');
    
    // Recurring ride alert notification
    await notificationService.sendRecurringRideAlertNotification(testUserId, testRideId, new Date(Date.now() + 30 * 60 * 1000));
    console.log('✅ Recurring ride alert notification sent');
    
    // 4. Test Personalized notifications
    console.log('\n4. Testing Personalized notifications...');
    
    // Ride insights notification
    await notificationService.sendRideInsightsNotification(testUserId, {
      moneySaved: 25.50,
      carbonReduction: 12.5,
      ridesCompleted: 8,
      totalDistance: 120
    });
    console.log('✅ Ride insights notification sent');
    
    // Achievement badge notification
    await notificationService.sendAchievementBadgeNotification(testUserId, 'first_ride', 'First Ride Badge');
    console.log('✅ Achievement badge notification sent');
    
    // 5. Test Status change notification
    console.log('\n5. Testing Status change notification...');
    
    await notificationService.sendStatusChangeNotification(testUserId, 'in_class', 'Room 501');
    console.log('✅ Status change notification sent');
    
    // 6. Test SOS notification
    console.log('\n6. Testing SOS notification...');
    
    await notificationService.sendSosNotification({
      recipientIds: [testFriendId],
      senderId: testUserId,
      location: 'BRACU Campus',
      latitude: 23.7937,
      longitude: 90.4066,
      message: 'Need immediate assistance!'
    });
    console.log('✅ SOS notification sent');
    
    console.log('\n=== All notification tests completed successfully! ===');
    console.log('\nYou can now check the notification center to see all these different types of notifications.');
    console.log('Each notification type has different icons, priorities, and categories.');
    
  } catch (error) {
    console.error('Error testing notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNotifications();
}

module.exports = { testNotifications };
