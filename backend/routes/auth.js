const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');
const IBCommissionEngine = require('../services/ibCommissionEngine');
const emailService = require('../services/emailService');
const EmailTemplate = require('../models/EmailTemplate');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, referralCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Process referral if code provided
    if (referralCode) {
      try {
        const ibEngine = new IBCommissionEngine();
        await ibEngine.registerReferral(user, referralCode);
        console.log(`[Auth] User ${user.email} registered with referral: ${referralCode}`);
      } catch (refErr) {
        console.error('[Auth] Referral processing error:', refErr);
        // Don't fail registration if referral fails
      }
    }

    // Generate OTP and send verification email
    const otp = user.generateEmailVerificationOTP();
    await user.save();

    // Send verification OTP email
    try {
      await emailService.sendVerificationOTP(user, otp);
      console.log(`[Auth] Verification OTP sent to ${user.email}`);
    } catch (emailErr) {
      console.error('[Auth] Failed to send verification OTP:', emailErr);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          balance: user.balance,
          emailVerified: user.emailVerified
        },
        token,
        requiresEmailVerification: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password with backward compatibility
    // comparePassword now returns { isMatch, needsRehash, reason }
    const passwordResult = await user.comparePassword(password);
    if (!passwordResult.isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // If password matched with old hash format, migrate to new hash
    // This ensures all future logins use the new hashing algorithm
    if (passwordResult.needsRehash) {
      console.log(`[Auth] Migrating password hash for user ${user.email} (reason: ${passwordResult.reason})`);
      user.password = password; // Will be auto-hashed by pre-save hook with new algorithm
      await user.save();
      console.log(`[Auth] Password hash migrated successfully for ${user.email}`);
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Generate new OTP and send it
      const otp = user.generateEmailVerificationOTP();
      await user.save();
      
      try {
        await emailService.sendVerificationOTP(user, otp);
      } catch (emailErr) {
        console.error('[Auth] Failed to send verification OTP:', emailErr);
      }

      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. A new verification code has been sent.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          balance: user.balance,
          emailVerified: user.emailVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, country } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone, country },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Verify OTP
    if (!user.verifyEmailOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationOTP = '';
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendTemplateEmail(user.email, 'welcome', {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        siteName: 'NalmiFx',
        supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
      });
    } catch (emailErr) {
      console.error('[Auth] Failed to send welcome email:', emailErr);
    }

    // Generate token for auto-login after verification
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          balance: user.balance,
          emailVerified: user.emailVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend verification OTP
// @access  Public
router.post('/resend-otp', [
  body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new OTP
    const otp = user.generateEmailVerificationOTP();
    await user.save();

    // Send verification OTP email
    await emailService.sendVerificationOTP(user, otp);

    res.json({
      success: true,
      message: 'Verification OTP sent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset OTP has been sent.'
      });
    }

    // Generate password reset OTP (reuse the same OTP mechanism)
    const otp = user.generatePasswordResetOTP();
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetOTP(user, otp);
    } catch (emailErr) {
      console.error('[Auth] Failed to send password reset OTP:', emailErr);
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP'
      });
    }

    // Verify password reset OTP
    if (!user.verifyPasswordResetOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetOTP = '';
    user.passwordResetExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendTemplateEmail(user.email, 'password_changed', {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        siteName: 'NalmiFx',
        supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
      });
    } catch (emailErr) {
      console.error('[Auth] Failed to send password changed email:', emailErr);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
