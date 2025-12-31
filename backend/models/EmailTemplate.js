const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: ['email_verification', 'deposit_success', 'deposit_pending', 'withdrawal_success', 'withdrawal_pending', 'withdrawal_rejected', 'account_banned', 'account_unbanned', 'password_reset', 'welcome']
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String,
    default: ''
  },
  variables: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Get template by slug
emailTemplateSchema.statics.getBySlug = async function(slug) {
  return await this.findOne({ slug, isActive: true });
};

// Parse template with variables
emailTemplateSchema.methods.parse = function(data) {
  let html = this.htmlContent;
  let text = this.textContent;
  let subject = this.subject;
  
  // Replace all {{variable}} placeholders with actual values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key] || '');
    text = text.replace(regex, data[key] || '');
    subject = subject.replace(regex, data[key] || '');
  });
  
  return { html, text, subject };
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
