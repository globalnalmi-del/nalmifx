const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const BankSettings = require('../models/BankSettings');
const User = require('../models/User');
const { protectAdmin } = require('./adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

// =============== BANK SETTINGS ===============

// @route   GET /api/admin/wallet/bank-settings
// @desc    Get bank settings
// @access  Admin
router.get('/bank-settings', async (req, res) => {
  try {
    const settings = await BankSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get bank settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/bank-settings
// @desc    Update bank settings
// @access  Admin
router.put('/bank-settings', async (req, res) => {
  try {
    const {
      // Multiple accounts (new)
      bankAccounts,
      upiAccounts,
      cryptoWallets,
      // Stripe
      stripeEnabled,
      stripePublicKey,
      stripeSecretKey,
      stripeWebhookSecret,
      // Legacy single fields
      bankName,
      accountNumber,
      accountHolderName,
      ifscCode,
      bankBranch,
      upiId,
      qrCode,
      paymentInstructions,
      minDeposit,
      maxDeposit,
      minWithdrawal,
      maxWithdrawal,
      isActive
    } = req.body;

    let settings = await BankSettings.getSettings();

    // Multiple accounts (new)
    if (bankAccounts !== undefined) settings.bankAccounts = bankAccounts;
    if (upiAccounts !== undefined) settings.upiAccounts = upiAccounts;
    if (cryptoWallets !== undefined) settings.cryptoWallets = cryptoWallets;
    
    // Stripe settings
    if (stripeEnabled !== undefined) settings.stripeEnabled = stripeEnabled;
    if (stripePublicKey !== undefined) settings.stripePublicKey = stripePublicKey;
    if (stripeSecretKey !== undefined) settings.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret !== undefined) settings.stripeWebhookSecret = stripeWebhookSecret;
    
    // Legacy single fields
    if (bankName !== undefined) settings.bankName = bankName;
    if (accountNumber !== undefined) settings.accountNumber = accountNumber;
    if (accountHolderName !== undefined) settings.accountHolderName = accountHolderName;
    if (ifscCode !== undefined) settings.ifscCode = ifscCode;
    if (bankBranch !== undefined) settings.bankBranch = bankBranch;
    if (upiId !== undefined) settings.upiId = upiId;
    if (qrCode !== undefined) settings.qrCode = qrCode;
    if (paymentInstructions !== undefined) settings.paymentInstructions = paymentInstructions;
    if (minDeposit !== undefined) settings.minDeposit = minDeposit;
    if (maxDeposit !== undefined) settings.maxDeposit = maxDeposit;
    if (minWithdrawal !== undefined) settings.minWithdrawal = minWithdrawal;
    if (maxWithdrawal !== undefined) settings.maxWithdrawal = maxWithdrawal;
    if (isActive !== undefined) settings.isActive = isActive;
    
    settings.updatedBy = req.admin._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Bank settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update bank settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== CRYPTO WALLET MANAGEMENT ===============

// @route   POST /api/admin/wallet/crypto-wallets
// @desc    Add a new crypto wallet
// @access  Admin
router.post('/crypto-wallets', async (req, res) => {
  try {
    const { walletType, walletName, walletAddress, network, networkName, acceptedTokens, qrCode } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' });
    }
    
    let settings = await BankSettings.getSettings();
    
    settings.cryptoWallets.push({
      walletType: walletType || 'metamask',
      walletName: walletName || 'MetaMask',
      walletAddress,
      network: network || 'ethereum',
      networkName: networkName || 'Ethereum Mainnet',
      acceptedTokens: acceptedTokens || [{ symbol: 'ETH', contractAddress: '', decimals: 18 }],
      qrCode: qrCode || '',
      isActive: true
    });
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Crypto wallet added successfully',
      data: settings.cryptoWallets
    });
  } catch (error) {
    console.error('Add crypto wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/crypto-wallets/:walletId
// @desc    Update a crypto wallet
// @access  Admin
router.put('/crypto-wallets/:walletId', async (req, res) => {
  try {
    const { walletType, walletName, walletAddress, network, networkName, acceptedTokens, qrCode, isActive } = req.body;
    
    let settings = await BankSettings.getSettings();
    const wallet = settings.cryptoWallets.id(req.params.walletId);
    
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    if (walletType !== undefined) wallet.walletType = walletType;
    if (walletName !== undefined) wallet.walletName = walletName;
    if (walletAddress !== undefined) wallet.walletAddress = walletAddress;
    if (network !== undefined) wallet.network = network;
    if (networkName !== undefined) wallet.networkName = networkName;
    if (acceptedTokens !== undefined) wallet.acceptedTokens = acceptedTokens;
    if (qrCode !== undefined) wallet.qrCode = qrCode;
    if (isActive !== undefined) wallet.isActive = isActive;
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Crypto wallet updated successfully',
      data: wallet
    });
  } catch (error) {
    console.error('Update crypto wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/wallet/crypto-wallets/:walletId
// @desc    Delete a crypto wallet
// @access  Admin
router.delete('/crypto-wallets/:walletId', async (req, res) => {
  try {
    let settings = await BankSettings.getSettings();
    const wallet = settings.cryptoWallets.id(req.params.walletId);
    
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    
    wallet.deleteOne();
    await settings.save();
    
    res.json({
      success: true,
      message: 'Crypto wallet deleted successfully'
    });
  } catch (error) {
    console.error('Delete crypto wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== ADMIN MANUAL FUND MANAGEMENT ===============

// @route   POST /api/admin/wallet/add-funds
// @desc    Admin manually add funds to user account (marked as admin_credit)
// @access  Admin
router.post('/add-funds', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'User ID and positive amount required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const balanceBefore = user.balance;
    user.balance += parseFloat(amount);
    await user.save();
    
    // Create transaction with admin source
    const transaction = await Transaction.create({
      user: userId,
      type: 'admin_credit',
      amount: parseFloat(amount),
      status: 'completed',
      source: 'admin',
      description: description || 'Manual credit by admin',
      balanceBefore,
      balanceAfter: user.balance,
      processedAt: new Date(),
      processedBy: req.admin._id,
      adminNote: `Added by admin: ${req.admin.email || req.admin.username}`
    });
    
    res.json({
      success: true,
      message: `$${amount} added to user account successfully`,
      data: { transaction, newBalance: user.balance }
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/wallet/deduct-funds
// @desc    Admin manually deduct funds from user account (marked as admin_debit)
// @access  Admin
router.post('/deduct-funds', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'User ID and positive amount required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'User has insufficient balance' });
    }
    
    const balanceBefore = user.balance;
    user.balance -= parseFloat(amount);
    await user.save();
    
    // Create transaction with admin source
    const transaction = await Transaction.create({
      user: userId,
      type: 'admin_debit',
      amount: -parseFloat(amount),
      status: 'completed',
      source: 'admin',
      description: description || 'Manual debit by admin',
      balanceBefore,
      balanceAfter: user.balance,
      processedAt: new Date(),
      processedBy: req.admin._id,
      adminNote: `Deducted by admin: ${req.admin.email || req.admin.username}`
    });
    
    res.json({
      success: true,
      message: `$${amount} deducted from user account successfully`,
      data: { transaction, newBalance: user.balance }
    });
  } catch (error) {
    console.error('Deduct funds error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== ADMIN TRANSACTIONS (Credits/Debits) ===============

// @route   GET /api/admin/wallet/transactions
// @desc    Get admin credit/debit transactions
// @access  Admin
router.get('/transactions', async (req, res) => {
  try {
    const { types, limit = 100, page = 1 } = req.query;
    
    // Parse types from comma-separated string
    const typeList = types ? types.split(',') : ['admin_credit', 'admin_debit'];
    
    const query = { type: { $in: typeList } };

    const transactions = await Transaction.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== DEPOSIT REQUESTS ===============

// @route   GET /api/admin/wallet/deposits
// @desc    Get all deposit requests
// @access  Admin
router.get('/deposits', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const query = { type: 'deposit' };
    if (status) query.status = status;

    const deposits = await Transaction.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);
    const pending = await Transaction.countDocuments({ type: 'deposit', status: 'pending' });

    res.json({
      success: true,
      data: deposits,
      stats: { total, pending },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/deposits/:id/approve
// @desc    Approve deposit request
// @access  Admin
router.put('/deposits/:id/approve', async (req, res) => {
  try {
    const { adminNote } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ success: false, message: 'Not a deposit transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    // Update user balance
    const user = await User.findById(transaction.user);
    const balanceBefore = user.balance;
    user.balance += transaction.amount;
    await user.save();

    // Update transaction
    transaction.status = 'completed';
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = user.balance;
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    if (adminNote) transaction.adminNote = adminNote;
    await transaction.save();

    res.json({
      success: true,
      message: 'Deposit approved successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/deposits/:id/reject
// @desc    Reject deposit request
// @access  Admin
router.put('/deposits/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ success: false, message: 'Not a deposit transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    transaction.rejectionReason = rejectionReason || 'Rejected by admin';
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    await transaction.save();

    res.json({
      success: true,
      message: 'Deposit rejected',
      data: transaction
    });
  } catch (error) {
    console.error('Reject deposit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============== WITHDRAWAL REQUESTS ===============

// @route   GET /api/admin/wallet/withdrawals
// @desc    Get all withdrawal requests
// @access  Admin
router.get('/withdrawals', async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const query = { type: 'withdrawal' };
    if (status) query.status = status;

    const withdrawals = await Transaction.find(query)
      .populate('user', 'firstName lastName email balance')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);
    const pending = await Transaction.countDocuments({ type: 'withdrawal', status: 'pending' });

    res.json({
      success: true,
      data: withdrawals,
      stats: { total, pending },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/withdrawals/:id/approve
// @desc    Approve withdrawal request
// @access  Admin
router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const { adminNote } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ success: false, message: 'Not a withdrawal transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    // Check and deduct user balance
    const user = await User.findById(transaction.user);
    if (user.balance < transaction.amount) {
      return res.status(400).json({ success: false, message: 'User has insufficient balance' });
    }

    const balanceBefore = user.balance;
    user.balance -= transaction.amount;
    await user.save();

    // Update transaction
    transaction.status = 'completed';
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = user.balance;
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    if (adminNote) transaction.adminNote = adminNote;
    await transaction.save();

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/wallet/withdrawals/:id/reject
// @desc    Reject withdrawal request
// @access  Admin
router.put('/withdrawals/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ success: false, message: 'Not a withdrawal transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    transaction.rejectionReason = rejectionReason || 'Rejected by admin';
    transaction.processedAt = new Date();
    transaction.processedBy = req.admin._id;
    await transaction.save();

    res.json({
      success: true,
      message: 'Withdrawal rejected',
      data: transaction
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/wallet/stats
// @desc    Get wallet statistics
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const [
      totalDeposits,
      pendingDeposits,
      completedDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      completedWithdrawals
    ] = await Promise.all([
      Transaction.countDocuments({ type: 'deposit' }),
      Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.countDocuments({ type: 'withdrawal' }),
      Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'withdrawal', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        deposits: {
          total: totalDeposits,
          pending: pendingDeposits,
          completedAmount: completedDeposits[0]?.total || 0
        },
        withdrawals: {
          total: totalWithdrawals,
          pending: pendingWithdrawals,
          completedAmount: completedWithdrawals[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
