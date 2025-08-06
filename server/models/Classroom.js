const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  roomNumber: String,
  building: String,
  capacity: Number,
  status: { type: String, enum: ['Available', 'Occupied'], default: 'Available' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Classroom', ClassroomSchema);
