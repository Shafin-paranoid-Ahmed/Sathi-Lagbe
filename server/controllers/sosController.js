// server/controllers/sosController.js - Merged implementation
const Emergency = require('../models/Emergency');
const SosContact = require('../models/sosContact');

/**
 * Get all SOS contacts for the current user
 */
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Try both models for compatibility
    let contacts = [];
    
    // Try SosContact model first (ONLYGWUB style)
    try {
      const contactEntry = await SosContact.findOne({ user: userId });
      if (contactEntry) {
        return res.json({
          success: true,
          data: contactEntry
        });
      }
    } catch (err) {
      console.log('SosContact model not found, trying Emergency model');
    }
    
    // Try Emergency model (Sathi_Lagbe style)
    try {
      const emergency = await Emergency.findOne({ userId }).sort('-triggeredAt');
      if (emergency) {
        return res.json(emergency.contacts || []);
      }
    } catch (err) {
      console.log('Emergency model not found');
    }
    
    // Return empty array if nothing found
    return res.json([]);
  } catch (err) {
    console.error('Error fetching SOS contacts:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch contacts' });
  }
};

/**
 * Save SOS contacts
 */
exports.saveContacts = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const contacts = req.body.contacts;
    
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts must be an array' });
    }
    
    // Try SosContact model first (ONLYGWUB style)
    try {
      let contactEntry = await SosContact.findOne({ user: userId });
      
      if (contactEntry) {
        contactEntry.contacts = contacts;
        await contactEntry.save();
      } else {
        contactEntry = await SosContact.create({ user: userId, contacts });
      }
      
      return res.json({ 
        success: true, 
        message: "Contacts saved successfully.",
        data: contactEntry
      });
    } catch (err) {
      console.log('SosContact model failed, trying Emergency model');
    }
    
    // Try Emergency model as fallback (Sathi_Lagbe style)
    try {
      // Store as newest emergency with contacts but no trigger
      const emergency = new Emergency({
        userId,
        contacts,
        // Don't set triggeredAt to indicate it's just contacts storage
      });
      
      await emergency.save();
      return res.json({ 
        message: "Contacts saved", 
        success: true
      });
    } catch (err) {
      throw new Error('Failed to save contacts to either model');
    }
  } catch (err) {
    console.error('Error saving SOS contacts:', err);
    res.status(500).json({ error: err.message || 'Failed to save contacts' });
  }
};

/**
 * Trigger SOS alert
 */
exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { contacts, location, message, latitude, longitude } = req.body;
    
    // Try to get stored contacts if not provided
    let contactsToUse = contacts;
    
    if (!contactsToUse || !Array.isArray(contactsToUse) || contactsToUse.length === 0) {
      // Try to find stored contacts
      try {
        const contactEntry = await SosContact.findOne({ user: userId });
        if (contactEntry && contactEntry.contacts) {
          contactsToUse = contactEntry.contacts;
        }
      } catch (err) {
        // Fallback to previous emergency
        try {
          const prevEmergency = await Emergency.findOne({ userId }).sort('-triggeredAt');
          if (prevEmergency && prevEmergency.contacts) {
            contactsToUse = prevEmergency.contacts;
          }
        } catch (innerErr) {
          // No contacts found
        }
      }
    }
    
    if (!contactsToUse || contactsToUse.length === 0) {
      return res.status(400).json({ error: 'No contacts provided or stored' });
    }
    
    // Create emergency record
    const emergency = new Emergency({
      userId,
      contacts: contactsToUse,
      triggeredAt: Date.now(),
      location: location || 'Unknown location',
      message: message || 'Help needed!',
      coordinates: {
        latitude: latitude || null,
        longitude: longitude || null
      }
    });
    
    await emergency.save();
    
    // Here you would integrate with SMS/notification service
    // This is a simplified version
    console.log(`SOS Alert triggered by user ${userId}`);
    console.log(`Location: ${location || 'Unknown'}`);
    console.log(`Message: ${message || 'Help needed!'}`);
    contactsToUse.forEach(contact => {
      console.log(`Alert sent to ${contact.name || 'Unknown'} at ${contact.phone || 'Unknown phone'}`);
    });
    
    res.json({ 
      message: "SOS alert triggered", 
      emergency,
      success: true 
    });
  } catch (err) {
    console.error('Error triggering SOS:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger SOS' });
  }
};

/**
 * Alias for triggerSOS - used by ONLYGWUB
 */
exports.activate = exports.triggerSOS;

/**
 * Get SOS history
 */
exports.getSOS = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const history = await Emergency.find({ userId }).sort('-triggeredAt');
    res.json(history);
  } catch (err) {
    console.error('Error fetching SOS history:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch SOS history' });
  }
};