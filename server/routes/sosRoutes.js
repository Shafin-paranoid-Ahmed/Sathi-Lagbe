// server/routes/sosRoutes.js - Merged implementation
const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const auth = require('../middleware/auth');

// Get contacts
router.get('/contacts', auth, sosController.getContacts);
router.get('/get-contacts', auth, sosController.getContacts); // Compatibility

// Save contacts
router.post('/save-contacts', auth, sosController.saveContacts);

// Trigger SOS alert - support multiple endpoint names for compatibility
router.post('/trigger', auth, sosController.triggerSOS);
router.post('/alert', auth, sosController.triggerSOS);
router.post('/activate', auth, sosController.triggerSOS);

// Get SOS history
router.get('/', auth, sosController.getSOS);

module.exports = router;