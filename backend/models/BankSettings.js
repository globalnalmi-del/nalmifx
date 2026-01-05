const mongoose = require('mongoose');

// Schema for individual bank account
const bankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankBranch: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { _id: true });

// Schema for individual UPI
const upiSchema = new mongoose.Schema({
  upiId: { type: String, required: true },
  upiName: { type: String, default: '' }, // Display name like "GPay", "PhonePe"
  qrCode: { type: String, default: '' }, // QR code image (base64 or URL)
  isActive: { type: Boolean, default: true }
}, { _id: true });

// Schema for crypto wallet (MetaMask, etc.)
const cryptoWalletSchema = new mongoose.Schema({
  walletType: { type: String, enum: ['metamask', 'trustwallet', 'coinbase', 'other'], default: 'metamask' },
  walletName: { type: String, default: 'MetaMask' }, // Display name
  walletAddress: { type: String, required: true },
  network: { type: String, enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'other'], default: 'ethereum' },
  networkName: { type: String, default: 'Ethereum Mainnet' },
  acceptedTokens: [{ 
    symbol: { type: String }, // USDT, USDC, ETH, BNB, etc.
    contractAddress: { type: String, default: '' }, // For ERC20 tokens
    decimals: { type: Number, default: 18 }
  }],
  qrCode: { type: String, default: '' }, // QR code for wallet address
  isActive: { type: Boolean, default: true }
}, { _id: true });

const bankSettingsSchema = new mongoose.Schema({
  // Multiple Bank Accounts
  bankAccounts: {
    type: [bankAccountSchema],
    default: []
  },
  
  // Multiple UPI IDs
  upiAccounts: {
    type: [upiSchema],
    default: []
  },
  
  // Crypto Wallets (MetaMask, etc.)
  cryptoWallets: {
    type: [cryptoWalletSchema],
    default: []
  },
  
  // Stripe Integration
  stripeEnabled: { type: Boolean, default: false },
  stripePublicKey: { type: String, default: '' },
  stripeSecretKey: { type: String, default: '', select: false }, // Hidden by default
  stripeWebhookSecret: { type: String, default: '', select: false },
  
  // Legacy single fields (for backward compatibility)
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  accountHolderName: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  upiId: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  
  // Additional payment methods
  paymentInstructions: { type: String, default: '' },
  
  // Minimum/Maximum limits
  minDeposit: { type: Number, default: 100 },
  maxDeposit: { type: Number, default: 100000 },
  minWithdrawal: { type: Number, default: 100 },
  maxWithdrawal: { type: Number, default: 50000 },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
bankSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get active bank accounts
bankSettingsSchema.statics.getActiveBankAccounts = async function() {
  const settings = await this.getSettings();
  return settings.bankAccounts.filter(acc => acc.isActive);
};

// Get active UPI accounts
bankSettingsSchema.statics.getActiveUPIAccounts = async function() {
  const settings = await this.getSettings();
  return settings.upiAccounts.filter(upi => upi.isActive);
};

// Get active crypto wallets
bankSettingsSchema.statics.getActiveCryptoWallets = async function() {
  const settings = await this.getSettings();
  return settings.cryptoWallets.filter(wallet => wallet.isActive);
};

module.exports = mongoose.model('BankSettings', bankSettingsSchema);
