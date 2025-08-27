# Auto-Status Feature Documentation

## Overview
The auto-status feature automatically updates a user's status based on their class schedule. Users can choose between manual status updates or automatic updates that change according to their class times.

## Features

### 1. Manual Status Updates
- Users can manually select their status from: Available, Busy, In Class, Studying, Free
- Users can set their location
- Status updates are sent to friends when becoming available or free

### 2. Automatic Status Updates
- **Auto Mode**: Status automatically changes based on class schedule
- **Status Logic**:
  - **In Class**: When current time is within class time slot
  - **Busy**: When between classes (20 minutes after class ends) or preparing for next class (15 minutes before)
  - **Free**: When no classes are scheduled for the day
  - **Available**: Default status when no specific condition is met

### 3. Schedule Integration
- Integrates with existing Routine model
- Supports daily class schedules
- Time slots: 8:00 AM - 6:20 PM (7 time slots per day)

## Backend Implementation

### AutoStatusService (`server/services/autoStatusService.js`)
- Core service for automatic status management
- Time parsing and comparison utilities
- Status update logic based on class schedule
- Batch updates for all auto-enabled users

### New API Endpoints
- `GET /api/users/next-class` - Get next class information
- `POST /api/users/trigger-auto-status` - Manually trigger auto-status update
- `GET /api/users/today-routine` - Get today's class schedule

### Scheduled Updates
- Server runs auto-status updates every 5 minutes
- Updates all users with `isAutoUpdate: true`

## Frontend Implementation

### StatusUpdate Component (`client/src/components/StatusUpdate.jsx`)
- Toggle between manual and auto mode
- Display next class information when auto mode is enabled
- Show today's schedule
- Manual trigger button for immediate auto-update

### New API Functions
- `getNextClassInfo()` - Fetch next class details
- `triggerAutoStatusUpdate()` - Trigger immediate auto-update
- `getTodayRoutine()` - Get today's schedule

## Database Schema

### User Model Updates
```javascript
status: {
  current: { type: String, enum: ['available', 'busy', 'in_class', 'studying', 'free'] },
  location: String,
  lastUpdated: Date,
  isAutoUpdate: { type: Boolean, default: false }  // NEW FIELD
}
```

### Routine Model (Existing)
```javascript
{
  userId: ObjectId,
  timeSlot: String,  // e.g., "09:30 AM-10:50 AM"
  day: String,       // e.g., "Monday"
  course: String     // e.g., "CSE341-02-SBAW-10A-04C"
}
```

## Usage

### Enabling Auto-Status
1. Go to Status Update section
2. Check "Enable automatic status updates based on class schedule"
3. Save changes

### Manual Status Update
1. Select desired status from options
2. Enter location (optional)
3. Click "Update Status Manually"

### Auto Status Update
1. With auto mode enabled, click "Update Status Automatically"
2. Status will update based on current time and schedule

## Configuration

### Update Intervals
- **Server**: Every 5 minutes (configurable in `server/index.js`)
- **Client**: On-demand via manual trigger

### Time Windows
- **Class Preparation**: 15 minutes before class starts
- **Between Classes**: 20 minutes after class ends
- **Class Duration**: Full time slot duration

## Testing

### Test Script
Run `node server/test-auto-status.js` to test the service functionality:
- Time parsing and formatting
- Day name conversion
- Time slot checking
- Status logic validation

## Benefits

1. **Automatic**: No need to manually update status during busy class schedules
2. **Accurate**: Status reflects actual academic activities
3. **Flexible**: Users can still manually override when needed
4. **Real-time**: Updates every 5 minutes for current status
5. **Smart Logic**: Considers preparation time and breaks between classes

## Future Enhancements

1. **Multiple Classes**: Support for multiple classes per day
2. **Custom Time Windows**: User-configurable preparation and break times
3. **Location Integration**: Automatic location updates based on class location
4. **Notification Preferences**: Customize when status change notifications are sent
5. **Schedule Conflicts**: Handle overlapping or conflicting class schedules
