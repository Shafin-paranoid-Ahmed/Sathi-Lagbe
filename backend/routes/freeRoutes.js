// routes/freeRoutes.js
const express = require('express');
const router  = express.Router();
const freeCtrl = require('../controllers/freeController');
const authMiddleware = require('../middleware/auth');

// With authentication
// router.get('/classrooms', authMiddleware, freeCtrl.getClassrooms);
// router.get('/labs', authMiddleware, freeCtrl.getLabs);

// Without authentication
router.get('/classrooms', freeCtrl.getClassrooms);
router.get('/labs', freeCtrl.getLabs);

module.exports = router;