
// server/routes/freeRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const freeController = require('../controllers/freeController');
const auth = require('../middleware/auth');

// Routes can be accessed with or without authentication for flexibility
router.get('/classrooms', freeController.getClassrooms);
router.get('/labs', freeController.getLabs);

module.exports = router;