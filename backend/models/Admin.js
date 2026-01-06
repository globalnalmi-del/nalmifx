const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    default: 'Admin'
  },
  lastName: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  permissions: {
    users: { type: Boolean, default: true },
    trades: { type: Boolean, default: true },
    funds: { type: Boolean, default: true },
    ib: { type: Boolean, default: true },
    charges: { type: Boolean, default: true },
    copyTrade: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method with backward compatibility
// Supports multiple hash formats for migration from old systems:
// - $2a$ (bcryptjs with various salt rounds)
// - $2b$ (native bcrypt)
// - Different salt rounds (10, 12, etc.)
adminSchema.methods.comparePassword = async function(candidatePassword) {
  // Try 1: Direct comparison with stored hash (NEW system - bcryptjs, 12 rounds)
  const directMatch = await bcrypt.compare(candidatePassword, this.password);
  if (directMatch) {
    return { isMatch: true, needsRehash: false };
  }

  // Try 2: Trimmed password (OLD system may not have trimmed)
  const trimmedMatch = await bcrypt.compare(candidatePassword.trim(), this.password);
  if (trimmedMatch) {
    return { isMatch: true, needsRehash: true, reason: 'trimming' };
  }

  // Try 3: Handle $2b$ vs $2a$ prefix mismatch
  if (this.password.startsWith('$2b$')) {
    const convertedHash = this.password.replace('$2b$', '$2a$');
    const convertedMatch = await bcrypt.compare(candidatePassword, convertedHash);
    if (convertedMatch) {
      return { isMatch: true, needsRehash: true, reason: 'hash_prefix' };
    }
  }

  // Try 4: Lowercase normalization fallback
  const lowercaseMatch = await bcrypt.compare(candidatePassword.toLowerCase(), this.password);
  if (lowercaseMatch) {
    return { isMatch: true, needsRehash: true, reason: 'case_normalization' };
  }

  // No match found
  return { isMatch: false, needsRehash: false };
};

// Simple password comparison (for backward compatibility)
adminSchema.methods.comparePasswordSimple = async function(candidatePassword) {
  const result = await this.comparePassword(candidatePassword);
  return result.isMatch;
};

// Get full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('Admin', adminSchema);
