// routes/freeRoutes.js
const express = require('express');
const router  = express.Router();
const freeCtrl = require('../controllers/freeController');
// const { authenticateUser } = require('../middleware/auth');

// router.get('/classrooms', authenticateUser, freeCtrl.getClassrooms);
// router.get('/labs',       authenticateUser, freeCtrl.getLabs);

router.get('/classrooms',freeCtrl.getClassrooms);
router.get('/labs', freeCtrl.getLabs);

module.exports = router;
