const Routine = require('../models/Routine');

// Get all routine entries for a user
const getUserRoutine = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const routineEntries = await Routine.find({ userId }).sort({ timeSlot: 1, day: 1 });
    
    res.json({
      success: true,
      data: routineEntries
    });
  } catch (error) {
    console.error('Error fetching user routine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routine'
    });
  }
};

// Add a new routine entry
const addRoutineEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeSlot, day, course } = req.body;
    
    // Validate required fields
    if (!timeSlot || !day || !course) {
      return res.status(400).json({
        success: false,
        error: 'Time slot, day, and course are required'
      });
    }
    
    // Check if entry already exists for this user, time slot, and day
    const existingEntry = await Routine.findOne({ userId, timeSlot, day });
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        error: 'An entry already exists for this time slot and day'
      });
    }
    
    // Create new routine entry
    const newEntry = new Routine({
      userId,
      timeSlot,
      day,
      course: course.trim()
    });
    
    await newEntry.save();
    
    res.status(201).json({
      success: true,
      data: newEntry,
      message: 'Routine entry added successfully'
    });
  } catch (error) {
    console.error('Error adding routine entry:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'An entry already exists for this time slot and day'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add routine entry'
    });
  }
};

// Update a routine entry
const updateRoutineEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entryId } = req.params;
    const { timeSlot, day, course } = req.body;
    
    // Validate required fields
    if (!timeSlot || !day || !course) {
      return res.status(400).json({
        success: false,
        error: 'Time slot, day, and course are required'
      });
    }
    
    // Find and update the entry
    const updatedEntry = await Routine.findOneAndUpdate(
      { _id: entryId, userId },
      { timeSlot, day, course: course.trim() },
      { new: true, runValidators: true }
    );
    
    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        error: 'Routine entry not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedEntry,
      message: 'Routine entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating routine entry:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'An entry already exists for this time slot and day'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update routine entry'
    });
  }
};

// Delete a routine entry
const deleteRoutineEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entryId } = req.params;
    
    const deletedEntry = await Routine.findOneAndDelete({ _id: entryId, userId });
    
    if (!deletedEntry) {
      return res.status(404).json({
        success: false,
        error: 'Routine entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Routine entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting routine entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete routine entry'
    });
  }
};

// Delete all routine entries for a user
const deleteAllUserRoutine = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Routine.deleteMany({ userId });
    
    res.json({
      success: true,
      message: 'All routine entries deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all routine entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete routine entries'
    });
  }
};

module.exports = {
  getUserRoutine,
  addRoutineEntry,
  updateRoutineEntry,
  deleteRoutineEntry,
  deleteAllUserRoutine
};
