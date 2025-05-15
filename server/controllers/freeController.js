// server/controllers/freeController.js - Merged implementation
const { FreeClassroom, FreeLab } = require('../models/freeModels');

/**
 * Get free classrooms
 */
exports.getClassrooms = async (req, res) => {
  try {
    const data = await FreeClassroom.find().lean();
    res.json(data);
  } catch (err) {
    console.error('Error fetching free classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch free classrooms' });
  }
};

/**
 * Get free labs
 */
exports.getLabs = async (req, res) => {
  try {
    const data = await FreeLab.find().lean();
    res.json(data);
  } catch (err) {
    console.error('Error fetching free labs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch free labs' });
  }
};