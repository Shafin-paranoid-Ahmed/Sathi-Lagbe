// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true }, 
  // add additional fields if needed (e.g., role, phone, etc.)
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
