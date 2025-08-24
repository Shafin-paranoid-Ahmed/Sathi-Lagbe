const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      // Ride-related notifications
      'ride_request', 'ride_invitation', 'ride_confirmation', 'ride_cancellation', 
      'ride_completion', 'eta_change', 'route_change', 'capacity_alert',
      
      // Social notifications
      'friend_request', 'friend_activity', 'group_ride_suggestion', 'safety_checkin',
      
      // Smart matching notifications
      'better_match_found', 'recurring_ride_alert', 'location_suggestion', 'schedule_conflict',
      
      // Community notifications
      'campus_event', 'emergency_alert', 'service_update',
      
      // Personalized notifications
      'ride_insights', 'cost_savings', 'environmental_impact', 'achievement_badge',
      
      // Status and general notifications
      'status_change', 'message', 'sos'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }, // Additional data like rideId, location, coordinates, etc.
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  category: { 
    type: String, 
    enum: ['ride', 'social', 'matching', 'community', 'personal', 'system'], 
    default: 'system' 
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  expiresAt: { type: Date }, // For time-sensitive notifications
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient querying
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

module.exports = mongoose.model('Notification', NotificationSchema);
