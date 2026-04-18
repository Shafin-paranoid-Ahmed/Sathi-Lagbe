const express = require('express');
const rideNotificationService = require('../services/rideNotificationService');
const { AutoStatusService } = require('../services/autoStatusService');

const router = express.Router();

function verifyCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(503).json({ success: false, error: 'CRON_SECRET is not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const provided = req.headers['x-cron-secret'] || bearer;

  if (provided !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized cron request' });
  }

  return next();
}

router.post('/cron/cleanup-notifications', verifyCronSecret, async (_req, res) => {
  try {
    const deletedCount = await rideNotificationService.cleanupOrphanedNotifications();
    return res.json({
      success: true,
      message: 'Orphaned notification cleanup completed',
      deletedCount
    });
  } catch (error) {
    console.error('Cron cleanup-notifications error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cleanup notifications' });
  }
});

router.post('/cron/auto-status-tick', verifyCronSecret, async (_req, res) => {
  try {
    const updatedUsers = await AutoStatusService.updateAllAutoUsers();
    return res.json({
      success: true,
      message: 'Auto-status tick completed',
      updatedCount: updatedUsers.length
    });
  } catch (error) {
    console.error('Cron auto-status-tick error:', error);
    return res.status(500).json({ success: false, error: 'Failed to execute auto-status tick' });
  }
});

module.exports = router;
