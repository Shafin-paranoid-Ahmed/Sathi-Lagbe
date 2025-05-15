// models/freeModels.js
const mongoose = require('mongoose');

// Loose schema for Free Classroom
const FreeClassroomSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'Free Classrooms'      // exactly your Atlas collection name
});
const FreeLabSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'Free Labs'
});

module.exports = {
  FreeClassroom: mongoose.model('FreeClassroom', FreeClassroomSchema),
  FreeLab:       mongoose.model('FreeLab', FreeLabSchema)
};
