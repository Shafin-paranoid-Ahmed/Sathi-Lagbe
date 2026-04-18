
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^@\s]+@(?:g\.)?bracu\.ac\.bd$/i, 'Invalid BRACU email format']
  },
  password: { type: String, required: true },
  bracuId: {
    type: String,
    unique: true,
    trim: true,
    match: [/^\d{8}$/, 'bracuId must be exactly 8 digits']
  },
  phone: { type: String, required: true, match: /^\+880\d{10}$/ },
  lastLogin: { type: Date },

  gender: String,
  location: String,
  schedule: [String],

  preferences: {
    darkMode: { type: Boolean, default: false }
  },

  routineSharingEnabled: { type: Boolean, default: true },

  rideHistory: [
    {
      date: String,
      partner: String,
      rating: Number
    }
  ],

  avatarUrl: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },

  status: {
    current: { type: String, enum: ['available', 'busy', 'in_class', 'studying', 'free'], default: 'available' },
    location: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    isAutoUpdate: { type: Boolean, default: false }
  },

  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0, min: 0 },

  bookmarkedClassrooms: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }],
    default: []
  }
}, { timestamps: true });

// unique: true on email/bracuId already creates indexes — do not duplicate them here
UserSchema.index({ 'status.current': 1 });
UserSchema.index({ name: 1 });
UserSchema.index({ bookmarkedClassrooms: 1 });
UserSchema.index({ averageRating: -1 });

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  // Skip if already hashed (e.g. auth controller hashed before create)
  if (typeof this.password === 'string' && this.password.startsWith('$2')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.updateLastLogin = async function updateLastLogin() {
  this.lastLogin = new Date();
  await this.save();
};

UserSchema.methods.updateStatus = async function updateStatus(current) {
  this.status = this.status || {};
  this.status.current = current;
  this.status.lastUpdated = new Date();
  await this.save();
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
