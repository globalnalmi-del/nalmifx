const mongoose = require('mongoose');

const tradingAccountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    required: true
  },
  nickname: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0
  },
  equity: {
    type: Number,
    default: 0
  },
  margin: {
    type: Number,
    default: 0
  },
  freeMargin: {
    type: Number,
    default: 0
  },
  marginLevel: {
    type: Number,
    default: 0
  },
  leverage: {
    type: Number,
    default: 100
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'active'
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  // Trading statistics
  totalDeposits: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  winningTrades: {
    type: Number,
    default: 0
  },
  losingTrades: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  totalLoss: {
    type: Number,
    default: 0
  },
  // Server/Platform info (for future MT4/MT5 integration)
  server: {
    type: String,
    default: 'HCF-Live'
  },
  platform: {
    type: String,
    enum: ['WebTrader', 'MT4', 'MT5'],
    default: 'WebTrader'
  },
  // Challenge account flag
  isChallenge: {
    type: Boolean,
    default: false
  },
  // Link to UserChallenge if this is a challenge account
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserChallenge'
  },
  // Timestamps
  lastTradeAt: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique account number before saving
tradingAccountSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    const prefix = this.isDemo ? 'DEMO' : 'HCF';
    const count = await this.constructor.countDocuments();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.accountNumber = `${prefix}-${randomNum + count}`;
  }
  next();
});

/**
 * MT5-Style Account Calculations:
 * - Balance: Deposited funds (only changes on deposit/withdraw/trade close)
 * - Equity: Balance + Floating P/L (real-time account value)
 * - Margin: Amount locked for open positions
 * - Free Margin: Equity - Margin (available for new trades)
 * - Margin Level: (Equity / Margin) × 100%
 */

// Calculate equity (balance + floating P/L)
tradingAccountSchema.methods.calculateEquity = function(floatingPnL = 0) {
  this.equity = this.balance + floatingPnL;
  return this.equity;
};

// Calculate free margin (equity - used margin)
tradingAccountSchema.methods.calculateFreeMargin = function(floatingPnL = 0) {
  const equity = this.balance + floatingPnL;
  this.freeMargin = equity - this.margin;
  return this.freeMargin;
};

// Calculate margin level percentage
tradingAccountSchema.methods.calculateMarginLevel = function(floatingPnL = 0) {
  const equity = this.balance + floatingPnL;
  if (this.margin > 0) {
    this.marginLevel = (equity / this.margin) * 100;
  } else {
    this.marginLevel = 0;
  }
  return this.marginLevel;
};

// Check if account has enough free margin for a new trade
tradingAccountSchema.methods.hasEnoughMargin = function(requiredMargin, floatingPnL = 0) {
  const freeMargin = this.calculateFreeMargin(floatingPnL);
  return freeMargin >= requiredMargin;
};

// Lock margin for a new trade (doesn't deduct from balance)
tradingAccountSchema.methods.lockMargin = function(marginAmount) {
  this.margin += marginAmount;
  this.freeMargin = this.equity - this.margin;
  return this.margin;
};

// Release margin when trade closes
tradingAccountSchema.methods.releaseMargin = function(marginAmount) {
  this.margin -= marginAmount;
  if (this.margin < 0) this.margin = 0;
  this.freeMargin = this.equity - this.margin;
  return this.margin;
};

// Settle trade P/L to balance (called when trade closes)
tradingAccountSchema.methods.settlePnL = function(pnl) {
  this.balance += pnl;
  if (this.balance < 0) this.balance = 0; // Prevent negative balance
  this.equity = this.balance; // Reset equity to balance (no floating PnL after close)
  this.freeMargin = this.equity - this.margin;
  return this.balance;
};

// Get full account status with all calculations
tradingAccountSchema.methods.getAccountStatus = function(floatingPnL = 0) {
  const equity = this.balance + floatingPnL;
  const freeMargin = equity - this.margin;
  const marginLevel = this.margin > 0 ? (equity / this.margin) * 100 : 0;
  
  return {
    balance: this.balance,
    equity: equity,
    margin: this.margin,
    freeMargin: freeMargin,
    marginLevel: marginLevel,
    floatingPnL: floatingPnL
  };
};

// Indexes
tradingAccountSchema.index({ user: 1, status: 1 });
tradingAccountSchema.index({ accountNumber: 1 });
tradingAccountSchema.index({ accountType: 1 });

module.exports = mongoose.model('TradingAccount', tradingAccountSchema);
