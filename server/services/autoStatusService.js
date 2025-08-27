// server/services/autoStatusService.js
// Periodically updates user status based on Routine timeslots and notifies friends

const mongoose = require('mongoose');
const Routine = require('../models/Routine');
const User = require('../models/User');
const notificationService = require('./notificationService');

// Map of known timeslots in ascending order
const TIMESLOTS = [
  '08:00 AM-09:20 AM',
  '09:30 AM-10:50 AM',
  '11:00 AM-12:20 PM',
  '12:30 PM-01:50 PM',
  '02:00 PM-03:20 PM',
  '03:30 PM-04:50 PM',
  '05:00 PM-06:20 PM'
];

function parseTimeToMinutes(t12) {
  // t12 like '08:00 AM' or '03:30 PM'
  const [time, ampm] = t12.trim().split(' ');
  const [hh, mm] = time.split(':').map(Number);
  let h = hh % 12;
  if (ampm.toUpperCase() === 'PM') h += 12;
  return h * 60 + mm;
}

function parseSlot(slot) {
  // slot like '08:00 AM-09:20 AM'
  const [start, end] = slot.split('-');
  return [parseTimeToMinutes(start), parseTimeToMinutes(end)];
}

function getCurrentDayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

function getCurrentTimeslot() {
  try {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (const slot of TIMESLOTS) {
      const [start, end] = parseSlot(slot);
      if (minutes >= start && minutes <= end) return slot;
    }
    return null;
  } catch {
    return null;
  }
}

async function setInClassForUsers(currentDay, currentSlot) {
  // Find all routine entries for this day + slot
  const entries = await Routine.find({ day: currentDay, timeSlot: currentSlot }).lean();
  if (!entries.length) return { setCount: 0 };

  // Group by userId with most recent course (any)
  const byUser = new Map();
  entries.forEach(e => { byUser.set(e.userId.toString(), e); });

  const userIds = Array.from(byUser.keys());
  if (!userIds.length) return { setCount: 0 };

  // Load users who enabled auto-update
  const users = await User.find({ _id: { $in: userIds }, 'status.isAutoUpdate': true })
    .select('_id name status').lean();

  let setCount = 0;
  for (const u of users) {
    const entry = byUser.get(u._id.toString());
    const newLocation = entry?.course || 'Class';
    if (u.status?.current !== 'in_class' || (u.status?.location || '') !== newLocation) {
      await User.findByIdAndUpdate(u._id, {
        $set: {
          'status.current': 'in_class',
          'status.location': newLocation,
          'status.lastUpdated': new Date()
        }
      });
      try {
        await notificationService.sendStatusChangeNotification(u._id, 'in_class', newLocation);
      } catch {}
      setCount++;
    }
  }
  return { setCount };
}

async function clearInClassForUsersNotInSlot(currentDay, currentSlot) {
  // Users currently in_class with auto-update on
  const users = await User.find({ 'status.isAutoUpdate': true, 'status.current': 'in_class' })
    .select('_id status').lean();
  if (!users.length) return { clearedCount: 0 };

  const userIds = users.map(u => u._id);
  // Which of these users actually have class now?
  const stillInClassUserIds = await Routine.find({
    userId: { $in: userIds },
    day: currentDay,
    timeSlot: currentSlot
  }).distinct('userId');

  const stillSet = new Set(stillInClassUserIds.map(id => id.toString()))
  let clearedCount = 0;

  for (const u of users) {
    if (stillSet.has(u._id.toString())) continue; // keep in_class
    // Clear to 'available'
    await User.findByIdAndUpdate(u._id, {
      $set: {
        'status.current': 'available',
        'status.location': '',
        'status.lastUpdated': new Date()
      }
    });
    try {
      await notificationService.sendStatusChangeNotification(u._id, 'available', '');
    } catch {}
    clearedCount++;
  }
  return { clearedCount };
}

async function tick() {
  // Ensure DB is connected
  if (mongoose.connection.readyState !== 1) return;

  const day = getCurrentDayName();
  const slot = getCurrentTimeslot();
  try {
    if (slot) {
      const { setCount } = await setInClassForUsers(day, slot);
      const { clearedCount } = await clearInClassForUsersNotInSlot(day, slot);
      if (setCount || clearedCount) {
        console.log(`[AutoStatus] Updated statuses. Set in_class: ${setCount}, cleared: ${clearedCount} (day=${day}, slot=${slot})`);
      }
    } else {
      // Outside any slot: clear users auto-marked as in_class
      const { clearedCount } = await clearInClassForUsersNotInSlot(day, null);
      if (clearedCount) {
        console.log(`[AutoStatus] Cleared in_class outside slots: ${clearedCount} (day=${day})`);
      }
    }
  } catch (err) {
    console.error('[AutoStatus] Error during tick:', err);
  }
}

function startAutoStatusScheduler({ intervalMs = 5 * 60 * 1000 } = {}) {
  // Kick once shortly after startup
  setTimeout(() => tick(), 10 * 1000);
  // Then run periodically
  setInterval(tick, intervalMs);
  console.log(`[AutoStatus] Scheduler started. Interval ${Math.round(intervalMs / 1000)}s`);
}

module.exports = { startAutoStatusScheduler };

