// server/controllers/classroomController.js - Merged implementation
const Classroom = require('../models/Classroom');

/**
 * Get all available classrooms
 */
exports.getAvailableClassrooms = async (req, res) => {
  try {
    const rooms = await Classroom.find({ status: 'Available' });
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching available classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch classrooms' });
  }
};

/**
 * Update classroom status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ error: 'ID and status are required' });
    }
    
    if (!['Available', 'Occupied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Available or Occupied' });
    }
    
    const room = await Classroom.findById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    
    room.status = status;
    room.updatedAt = Date.now();
    
    await room.save();
    
    res.json(room);
  } catch (err) {
    console.error('Error updating classroom status:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
};

/**
 * Get all classrooms
 */
exports.getAllClassrooms = async (req, res) => {
  try {
    const rooms = await Classroom.find();
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch classrooms' });
  }
};