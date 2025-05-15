const mongoose = require('mongoose');

const FriendStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isFree: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FriendStatus', FriendStatusSchema);