const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  roomNumber: String,
  building: String,
  floor: { type: Number, required: true }, // Added for floor-based filtering
  capacity: Number,
  status: { type: String, enum: ['Available', 'Occupied'], default: 'Available' },
  updatedAt: { type: Date, default: Date.now },
  
  // Module 3: University Timetable Integration
  timetable: {
    // Weekly schedule with timeslots
    schedule: {
      sunday: [{ 
        timeSlot: String, // e.g., "08:00-09:20"
        course: String,   // e.g., "CSE341-02-SBAW-10A-04C"
        isOccupied: { type: Boolean, default: false }
      }],
      monday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }],
      tuesday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }],
      wednesday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }],
      thursday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }],
      friday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }],
      saturday: [{ 
        timeSlot: String,
        course: String,
        isOccupied: { type: Boolean, default: false }
      }]
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Module 3: Additional metadata for filtering
  roomType: { 
    type: String, 
    enum: ['Classroom', 'Lab', 'Conference', 'Seminar'], 
    default: 'Classroom' 
  },
  facilities: [String], // e.g., ['Projector', 'AC', 'Whiteboard']
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Module 3: Index for efficient querying
ClassroomSchema.index({ building: 1, floor: 1, capacity: 1 });
ClassroomSchema.index({ 'timetable.schedule': 1 });

module.exports = mongoose.model('Classroom', ClassroomSchema);
