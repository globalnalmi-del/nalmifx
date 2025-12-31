// Script to update email verification template to OTP format
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');

const newOTPTemplate = {
  name: 'Email Verification OTP',
  slug: 'email_verification',
  subject: 'Your Verification Code - {{siteName}}',
  description: 'Sent when a user registers to verify their email with OTP',
  variables: ['firstName', 'lastName', 'fullName', 'email', 'otp', 'siteName', 'supportEmail'],
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #ffffff; margin: 0 0 20px; font-size: 24px;">Verify Your Email Address</h2>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Thank you for registering with {{siteName}}! Use the verification code below to complete your registration.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); border-radius: 12px; padding: 30px 40px; display: inline-block;">
                      <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                      <p style="color: #ffffff; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px;">{{otp}}</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                Enter this code in the verification page to activate your account.
              </p>
              <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                ⏰ This code will expire in 10 minutes.
              </p>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                If you didn't create an account with {{siteName}}, please ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #2a2a3e;">
              <p style="color: #666666; font-size: 12px; margin: 0; text-align: center;">
                © 2024 {{siteName}}. All rights reserved.<br>
                Need help? Contact us at {{supportEmail}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  isActive: true
};

async function updateTemplate() {
  try {
    await connectDB();
    
    const EmailTemplate = require('../models/EmailTemplate');
    
    // Find and update the email_verification template
    const result = await EmailTemplate.findOneAndUpdate(
      { slug: 'email_verification' },
      newOTPTemplate,
      { upsert: true, new: true }
    );
    
    console.log('✅ Email verification template updated to OTP format!');
    console.log('Template ID:', result._id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating template:', error);
    process.exit(1);
  }
}

updateTemplate();
