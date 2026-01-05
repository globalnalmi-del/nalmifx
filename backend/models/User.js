const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
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
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    type: String,
    default: ''
  },
  emailVerificationExpires: {
    type: Date
  },
  // Password Reset
  passwordResetOTP: {
    type: String,
    default: ''
  },
  passwordResetExpires: {
    type: Date
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  // KYC Verification
  kycVerified: {
    type: Boolean,
    default: false
  },
  kycStatus: {
    type: String,
    enum: ['not_submitted', 'pending', 'approved', 'rejected'],
    default: 'not_submitted'
  },
  kycDocuments: {
    idType: { type: String, enum: ['', 'passport', 'national_id', 'driving_license'], default: '' },
    idNumber: { type: String, default: '' },
    idFrontImage: { type: String, default: '' },
    idBackImage: { type: String, default: '' },
    selfieImage: { type: String, default: '' },
    addressProof: { type: String, default: '' },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, default: '' }
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  // IB Referral tracking
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IB'
  },
  referralCode: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Generate 6-digit OTP for email verification
userSchema.methods.generateEmailVerificationOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.emailVerificationOTP = otp;
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Verify email OTP
userSchema.methods.verifyEmailOTP = function(otp) {
  return this.emailVerificationOTP === otp && this.emailVerificationExpires > Date.now();
};

// Generate 6-digit OTP for password reset
userSchema.methods.generatePasswordResetOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.passwordResetOTP = otp;
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return otp;
};

// Verify password reset OTP
userSchema.methods.verifyPasswordResetOTP = function(otp) {
  return this.passwordResetOTP === otp && this.passwordResetExpires > Date.now();
};

module.exports = mongoose.model('User', userSchema);
