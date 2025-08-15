// server/controllers/sosController.js - Merged implementation
const Emergency = require('../models/Emergency');
const SosContact = require('../models/sosContact');
const notificationService = require('../services/notificationService');

/**
 * Get all SOS contacts for the current user
 */
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    console.log('=== SOS CONTACTS DEBUG ===');
    console.log('Fetching contacts for user:', userId);
    
    // Try both models for compatibility
    let contacts = [];
    
    // Try SosContact model first (ONLYGWUB style)
    try {
      const contactEntry = await SosContact.findOne({ user: userId });
      if (contactEntry && contactEntry.contacts && contactEntry.contacts.length > 0) {
        const filteredContacts = contactEntry.contacts.filter(c => c.name && c.name.trim() !== '');
        console.log('Found contacts in SosContact model:', filteredContacts.length);
        return res.json({
          success: true,
          data: {
            contacts: filteredContacts
          }
        });
      }
    } catch (err) {
      console.log('SosContact model not found, trying Emergency model');
    }
    
    // Try Emergency model (Sathi_Lagbe style)
    try {
      const emergency = await Emergency.findOne({ userId }).sort('-triggeredAt');
      if (emergency && emergency.contacts && emergency.contacts.length > 0) {
        const filteredContacts = emergency.contacts.filter(c => c.name && c.name.trim() !== '');
        console.log('Found contacts in Emergency model:', filteredContacts.length);
        return res.json({
          success: true,
          data: {
            contacts: filteredContacts
          }
        });
      }
    } catch (err) {
      console.log('Emergency model not found');
    }
    
    console.log('No contacts found for user:', userId);
    // Return empty array if nothing found
    return res.json({
      success: true,
      data: { contacts: [] }
    });
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
    
    // Filter out empty contacts and validate ownership
    const validContacts = contacts.filter(c => 
      c && 
      c.name && 
      c.name.trim() !== '' && 
      (c.phone || c.userId) && // Must have either phone or userId
      c.addedBy === userId // Must be added by the current user
    );
    
    if (validContacts.length === 0) {
      return res.status(400).json({ error: 'At least one valid contact is required' });
    }
    
    // Try SosContact model first (ONLYGWUB style)
    try {
      let contactEntry = await SosContact.findOne({ user: userId });
      
      if (contactEntry) {
        contactEntry.contacts = validContacts;
        await contactEntry.save();
      } else {
        contactEntry = await SosContact.create({ user: userId, contacts: validContacts });
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
      // First, remove any existing contact-only entries for this user
      await Emergency.deleteMany({ 
        userId, 
        triggeredAt: { $exists: false } // Only contact storage entries
      });
      
      // Store as newest emergency with contacts but no trigger
      const emergency = new Emergency({
        userId,
        contacts: validContacts,
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

    console.log('=== SOS TRIGGER DEBUG ===');
    console.log('User ID:', userId);
    console.log('Contacts to use:', JSON.stringify(contactsToUse, null, 2));

    // Send in-app notifications to contacts who are app users (have userId)
    const recipientIds = contactsToUse
      .filter(c => c.userId)
      .map(c => c.userId.toString());

    console.log('Recipient IDs for notifications:', recipientIds);

    if (recipientIds.length > 0) {
      console.log('Sending SOS notifications to:', recipientIds);
      try {
        const result = await notificationService.sendSosNotification({
          recipientIds,
          senderId: userId,
          location: location || '',
          latitude: latitude || null,
          longitude: longitude || null,
          message: message || 'Help needed!'
        });
        console.log('SOS notifications sent successfully:', result.length);
      } catch (error) {
        console.error('Error sending SOS notifications:', error);
      }
    } else {
      console.log('No in-app contacts found for SOS notifications');
    }
    
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