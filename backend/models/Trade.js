const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tradingAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    default: null
  },
  clientId: {
    type: String,
    default: null
  },
  tradeSource: {
    type: String,
    enum: ['manual', 'copied', 'admin'],
    default: 'manual'
  },
  isCopiedTrade: {
    type: Boolean,
    default: false
  },
  masterTradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    default: null
  },
  symbol: {
    type: String,
    required: [true, 'Trading symbol is required'],
    uppercase: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['market', 'limit', 'stop', 'stop-loss', 'take-profit'],
    default: 'market'
  },
  amount: {
    type: Number,
    required: [true, 'Amount/Lot size is required'],
    min: 0.01
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  leverage: {
    type: Number,
    default: 100,
    min: 1,
    max: 2000
  },
  margin: {
    type: Number,
    default: 0
  },
  spread: {
    type: Number,
    default: 0
  },
  spreadCost: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  stopLoss: {
    type: Number,
    default: null
  },
  takeProfit: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'open', 'closed', 'cancelled'],
    default: 'pending'
  },
  closePrice: {
    type: Number,
    default: null
  },
  closeReason: {
    type: String,
    enum: ['manual', 'stop_loss', 'take_profit', 'stop_out', 'margin_call', 'master_closed', 'copied', 'admin_closed', 'admin_cancelled', null],
    default: null
  },
  profit: {
    type: Number,
    default: 0
  },
  rawProfit: {
    type: Number,
    default: 0
  },
  tradingCharge: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  fee: {
    type: Number,
    default: 0
  },
  activatedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Calculate profit/loss (P&L based on actual position size, NOT leveraged)
// Leverage only affects margin required, not P&L
tradeSchema.methods.calculatePL = function(currentPrice) {
  const priceDiff = this.type === 'buy' 
    ? currentPrice - this.price 
    : this.price - currentPrice;
  
  // Get contract size based on symbol
  let contractSize = 100000; // Standard forex
  if (this.symbol.includes('XAU')) contractSize = 100;
  else if (this.symbol.includes('XAG')) contractSize = 5000;
  else if (this.symbol.includes('BTC') || this.symbol.includes('ETH')) contractSize = 1;
  else if (this.symbol.includes('LTC') || this.symbol.includes('XRP') || this.symbol.includes('DOGE') || 
           this.symbol.includes('ADA') || this.symbol.includes('SOL') || this.symbol.includes('LINK') ||
           this.symbol.includes('MATIC') || this.symbol.includes('AVAX') || this.symbol.includes('UNI')) contractSize = 1;
  else if (this.symbol.includes('US30') || this.symbol.includes('US500') || this.symbol.includes('NAS') || 
           this.symbol.includes('UK100') || this.symbol.includes('GER') || this.symbol.includes('JP225')) contractSize = 1;
  else if (this.symbol.includes('OIL')) contractSize = 1000;
  
  return priceDiff * this.amount * contractSize;
};

// Index for faster queries
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });
tradeSchema.index({ clientId: 1 });
tradeSchema.index({ masterTradeId: 1 });

module.exports = mongoose.model('Trade', tradeSchema);
