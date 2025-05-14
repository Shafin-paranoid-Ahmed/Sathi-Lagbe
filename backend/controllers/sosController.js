const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
const SosContact = require("../models/sosContact");

// Save SOS contacts
router.post("/save-contacts", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const contacts = req.body.contacts;

    const existing = await SosContact.findOne({ user: userId });
    if (existing) {
      existing.contacts = contacts;
      await existing.save();
    } else {
      await SosContact.create({ user: userId, contacts });
    }

    res.send({ success: true, message: "Contacts saved successfully." });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

// Activate SOS alert
router.post("/activate", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const location = req.body.location;

    const contactEntry = await SosContact.findOne({ user: userId }).populate(
      "user"
    );

    if (!contactEntry) {
      return res
        .status(404)
        .send({ success: false, message: "No SOS contacts found." });
    }

    // Simulated alert logic (log it, or integrate SMS/Email in future)
    contactEntry.contacts.forEach((c) => {
      console.log(`Alerting ${c.name} (${c.phone}) - Location: ${location}`);
    });

    res.send({ success: true, message: "SOS alert sent to contacts." });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

// Optional: Get saved contacts
router.get("/get-contacts", authMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;
    const data = await SosContact.findOne({ user: userId });
    res.send({ success: true, data });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

module.exports = router;
