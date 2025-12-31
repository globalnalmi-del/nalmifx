const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.initialized = true;
    console.log('✅ Email service initialized');
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTemplateEmail(to, templateSlug, data) {
    try {
      const template = await EmailTemplate.getBySlug(templateSlug);
      
      if (!template) {
        console.error(`[EmailService] Template not found: ${templateSlug}`);
        return { success: false, error: 'Template not found' };
      }

      const { html, text, subject } = template.parse(data);
      return await this.sendEmail(to, subject, html, text);
    } catch (error) {
      console.error('[EmailService] Error sending template email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification OTP
  async sendVerificationOTP(user, otp) {
    const data = {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      otp,
      siteName: 'NalmiFx',
      supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
    };

    return await this.sendTemplateEmail(user.email, 'email_verification', data);
  }

  // Send deposit notification
  async sendDepositEmail(user, transaction, status = 'success') {
    const templateSlug = status === 'success' ? 'deposit_success' : 'deposit_pending';
    
    const data = {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      transactionId: transaction._id,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      balance: user.balance,
      siteName: 'NalmiFx',
      supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
    };

    return await this.sendTemplateEmail(user.email, templateSlug, data);
  }

  // Send withdrawal notification
  async sendWithdrawalEmail(user, transaction, status = 'success') {
    let templateSlug = 'withdrawal_pending';
    if (status === 'success' || status === 'approved') templateSlug = 'withdrawal_success';
    if (status === 'rejected') templateSlug = 'withdrawal_rejected';
    
    const data = {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      transactionId: transaction._id,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      balance: user.balance,
      rejectionReason: transaction.rejectionReason || '',
      siteName: 'NalmiFx',
      supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
    };

    return await this.sendTemplateEmail(user.email, templateSlug, data);
  }

  // Send account ban notification
  async sendAccountBanEmail(user, reason = '', isBanned = true) {
    const templateSlug = isBanned ? 'account_banned' : 'account_unbanned';
    
    const data = {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      reason,
      date: new Date().toLocaleDateString(),
      siteName: 'NalmiFx',
      supportEmail: process.env.SMTP_USER || 'support@NalmiFx.com'
    };

    return await this.sendTemplateEmail(user.email, templateSlug, data);
  }

  // Verify SMTP connection
  async verifyConnection() {
    try {
      if (!this.initialized) {
        this.initialize();
      }
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified');
      return { success: true };
    } catch (error) {
      console.error('[EmailService] SMTP verification failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
