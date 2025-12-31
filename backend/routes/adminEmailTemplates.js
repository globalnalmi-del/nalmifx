const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const emailService = require('../services/emailService');
const { protectAdmin } = require('./adminAuth');

// Default templates to seed
const defaultTemplates = [
  {
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
</html>`
  },
  {
    name: 'Deposit Success',
    slug: 'deposit_success',
    subject: 'Deposit Successful - {{siteName}}',
    description: 'Sent when a deposit is successfully processed',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'amount', 'currency', 'transactionId', 'date', 'time', 'balance', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 40px;">✓</span>
                </div>
                <h2 style="color: #10b981; margin: 0; font-size: 24px;">Deposit Successful!</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Your deposit has been successfully processed and credited to your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Amount</span>
                    <span style="color: #10b981; float: right; font-weight: 600;">+{{amount}} {{currency}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Transaction ID</span>
                    <span style="color: #ffffff; float: right;">{{transactionId}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Date & Time</span>
                    <span style="color: #ffffff; float: right;">{{date}} {{time}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">New Balance</span>
                    <span style="color: #9333ea; float: right; font-weight: 600;">{{balance}} {{currency}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Deposit Pending',
    slug: 'deposit_pending',
    subject: 'Deposit Pending Review - {{siteName}}',
    description: 'Sent when a deposit is pending admin approval',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'amount', 'currency', 'transactionId', 'date', 'time', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">⏳</span>
                </div>
                <h2 style="color: #f59e0b; margin: 0; font-size: 24px;">Deposit Pending</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Your deposit request has been received and is currently under review. We will notify you once it has been processed.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Amount</span>
                    <span style="color: #f59e0b; float: right; font-weight: 600;">{{amount}} {{currency}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Transaction ID</span>
                    <span style="color: #ffffff; float: right;">{{transactionId}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Date & Time</span>
                    <span style="color: #ffffff; float: right;">{{date}} {{time}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Withdrawal Success',
    slug: 'withdrawal_success',
    subject: 'Withdrawal Approved - {{siteName}}',
    description: 'Sent when a withdrawal is approved and processed',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'amount', 'currency', 'transactionId', 'date', 'time', 'balance', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">✓</span>
                </div>
                <h2 style="color: #10b981; margin: 0; font-size: 24px;">Withdrawal Approved!</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Great news! Your withdrawal request has been approved and is being processed. The funds will be transferred to your account shortly.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Amount</span>
                    <span style="color: #10b981; float: right; font-weight: 600;">-{{amount}} {{currency}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Transaction ID</span>
                    <span style="color: #ffffff; float: right;">{{transactionId}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Date & Time</span>
                    <span style="color: #ffffff; float: right;">{{date}} {{time}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Remaining Balance</span>
                    <span style="color: #9333ea; float: right; font-weight: 600;">{{balance}} {{currency}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Withdrawal Pending',
    slug: 'withdrawal_pending',
    subject: 'Withdrawal Request Received - {{siteName}}',
    description: 'Sent when a withdrawal request is submitted',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'amount', 'currency', 'transactionId', 'date', 'time', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">⏳</span>
                </div>
                <h2 style="color: #3b82f6; margin: 0; font-size: 24px;">Withdrawal Request Received</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                We have received your withdrawal request. Our team will review and process it within 24-48 hours.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Amount</span>
                    <span style="color: #3b82f6; float: right; font-weight: 600;">{{amount}} {{currency}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Transaction ID</span>
                    <span style="color: #ffffff; float: right;">{{transactionId}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Date & Time</span>
                    <span style="color: #ffffff; float: right;">{{date}} {{time}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Withdrawal Rejected',
    slug: 'withdrawal_rejected',
    subject: 'Withdrawal Request Rejected - {{siteName}}',
    description: 'Sent when a withdrawal request is rejected',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'amount', 'currency', 'transactionId', 'date', 'time', 'rejectionReason', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">✕</span>
                </div>
                <h2 style="color: #ef4444; margin: 0; font-size: 24px;">Withdrawal Rejected</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Unfortunately, your withdrawal request has been rejected. The funds have been returned to your account balance.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Amount</span>
                    <span style="color: #ef4444; float: right; font-weight: 600;">{{amount}} {{currency}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Transaction ID</span>
                    <span style="color: #ffffff; float: right;">{{transactionId}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Date & Time</span>
                    <span style="color: #ffffff; float: right;">{{date}} {{time}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Reason</span>
                    <span style="color: #ef4444; float: right;">{{rejectionReason}}</span>
                  </td>
                </tr>
              </table>
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                If you believe this was a mistake or need further assistance, please contact our support team.
              </p>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Account Banned',
    slug: 'account_banned',
    subject: 'Account Suspended - {{siteName}}',
    description: 'Sent when a user account is banned/suspended',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'reason', 'date', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">⚠</span>
                </div>
                <h2 style="color: #ef4444; margin: 0; font-size: 24px;">Account Suspended</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                We regret to inform you that your account has been suspended due to a violation of our terms of service.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Account</span>
                    <span style="color: #ffffff; float: right;">{{email}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Date</span>
                    <span style="color: #ffffff; float: right;">{{date}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Reason</span>
                    <span style="color: #ef4444; float: right;">{{reason}}</span>
                  </td>
                </tr>
              </table>
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                If you believe this was a mistake, please contact our support team to appeal this decision.
              </p>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Account Unbanned',
    slug: 'account_unbanned',
    subject: 'Account Reactivated - {{siteName}}',
    description: 'Sent when a user account is unbanned/reactivated',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'date', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">✓</span>
                </div>
                <h2 style="color: #10b981; margin: 0; font-size: 24px;">Account Reactivated!</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Great news! Your account has been reactivated and you can now access all features of {{siteName}} again.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a1a; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 10px 20px; border-bottom: 1px solid #2a2a3e;">
                    <span style="color: #666666;">Account</span>
                    <span style="color: #ffffff; float: right;">{{email}}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 20px;">
                    <span style="color: #666666;">Reactivated On</span>
                    <span style="color: #10b981; float: right;">{{date}}</span>
                  </td>
                </tr>
              </table>
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                Please ensure you follow our terms of service to avoid future suspensions. Welcome back!
              </p>
            </td>
          </tr>
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
</html>`
  },
  {
    name: 'Welcome Email',
    slug: 'welcome',
    subject: 'Welcome to {{siteName}}!',
    description: 'Sent after successful email verification',
    variables: ['firstName', 'lastName', 'fullName', 'email', 'siteName', 'supportEmail'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #9333ea; margin: 0; font-size: 28px;">{{siteName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); border-radius: 50%; margin: 0 auto 20px;">
                  <span style="color: white; font-size: 40px; line-height: 80px;">🎉</span>
                </div>
                <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to {{siteName}}!</h2>
              </div>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi {{firstName}},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Your email has been verified and your account is now fully activated. You're all set to start trading!
              </p>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Here's what you can do next:
              </p>
              <ul style="color: #a0a0a0; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>Complete your KYC verification</li>
                <li>Make your first deposit</li>
                <li>Explore our trading instruments</li>
                <li>Start trading with confidence</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/home" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Trading</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
</html>`
  }
];

// @route   GET /api/admin/email-templates
// @desc    Get all email templates
// @access  Admin
router.get('/', protectAdmin, async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ name: 1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/email-templates/seed
// @desc    Seed default email templates
// @access  Admin
router.post('/seed', protectAdmin, async (req, res) => {
  try {
    const results = [];
    
    for (const template of defaultTemplates) {
      const existing = await EmailTemplate.findOne({ slug: template.slug });
      if (!existing) {
        const created = await EmailTemplate.create(template);
        results.push({ slug: template.slug, status: 'created' });
      } else {
        results.push({ slug: template.slug, status: 'exists' });
      }
    }
    
    res.json({ success: true, message: 'Templates seeded', data: results });
  } catch (error) {
    console.error('Seed templates error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/email-templates/:id
// @desc    Get single email template
// @access  Admin
router.get('/:id', protectAdmin, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/email-templates/:id
// @desc    Update email template
// @access  Admin
router.put('/:id', protectAdmin, async (req, res) => {
  try {
    const { name, subject, htmlContent, textContent, isActive, description } = req.body;
    
    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        subject, 
        htmlContent, 
        textContent, 
        isActive, 
        description,
        updatedBy: req.admin._id
      },
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, data: template, message: 'Template updated' });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/email-templates/test
// @desc    Send test email
// @access  Admin
router.post('/test', protectAdmin, async (req, res) => {
  try {
    const { templateId, email } = req.body;
    
    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Test data
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      email: email,
      verificationUrl: 'https://example.com/verify?token=test123',
      verificationToken: 'test123',
      amount: '100.00',
      currency: 'USD',
      transactionId: 'TXN123456',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      balance: '1000.00',
      rejectionReason: 'Test rejection reason',
      reason: 'Test ban reason',
      siteName: 'NalmiFx',
      supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
    };
    
    const { html, text, subject } = template.parse(testData);
    const result = await emailService.sendEmail(email, subject, html, text);
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/email-templates/verify-smtp
// @desc    Verify SMTP connection
// @access  Admin
router.post('/verify-smtp', protectAdmin, async (req, res) => {
  try {
    const result = await emailService.verifyConnection();
    if (result.success) {
      res.json({ success: true, message: 'SMTP connection verified' });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Verify SMTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Export default templates for seeding
router.defaultTemplates = defaultTemplates;

module.exports = router;
