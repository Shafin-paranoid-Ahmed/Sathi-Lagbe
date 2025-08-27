const mongoose = require('mongoose');

const routineEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timeSlot: {
    type: String,
    required: true,
    enum: [
      '08:00 AM-09:20 AM',
      '09:30 AM-10:50 AM', 
      '11:00 AM-12:20 PM',
      '12:30 PM-01:50 PM',
      '02:00 PM-03:20 PM',
      '03:30 PM-04:50 PM',
      '05:00 PM-06:20 PM'
    ]
  },
  day: {
    type: String,
    required: true,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique entries per user, time slot, and day
routineEntrySchema.index({ userId: 1, timeSlot: 1, day: 1 }, { unique: true });

// Update the updatedAt field before saving
routineEntrySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Routine', routineEntrySchema);
