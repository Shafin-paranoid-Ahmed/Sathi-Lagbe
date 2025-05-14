// controllers/freeController.js
const { FreeClassroom, FreeLab } = require('../models/freeModels');

// GET /api/free/classrooms
exports.getClassrooms = async (req, res) => {
  try {
    const data = await FreeClassroom.find().lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch free classrooms' });
  }
};

// GET /api/free/labs
exports.getLabs = async (req, res) => {
  try {
    const data = await FreeLab.find().lean();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch free labs' });
  }
};
