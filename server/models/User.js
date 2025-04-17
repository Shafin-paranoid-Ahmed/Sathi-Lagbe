const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  gender: String,
  location: String,
  schedule: [String],
  preferences: {
    darkMode: { type: Boolean, default: false }
  },
  rideHistory: [
    {
      date: String,
      partner: String,
      rating: Number
    }
  ]
});

module.exports = mongoose.model('User', UserSchema);