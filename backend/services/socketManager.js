const { Server } = require('socket.io');
const AllTickService = require('./AllTickService');
const tradeEngine = require('./TradeEngine');
const TradingCharge = require('../models/TradingCharge');
const jwt = require('jsonwebtoken');

class SocketManager {
  constructor(server, config = {}) {
    // Optimized Socket.IO for low latency
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      // Low latency optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      perMessageDeflate: false // Disable compression for lower latency
    });

    this.config = config;
    this.allTick = null;
    this.clients = new Map();
    this.prices = {};
    this.lastEmitTime = {};
    this.throttleMs = 50; // Minimum 50ms between emissions per symbol (20 updates/sec max)
    this.spreads = {}; // Cached spreads from admin config

    this.setupSocketHandlers();
    this.loadSpreads(); // Load spreads on startup
  }

  /**
   * Load spreads from TradingCharge model
   */
  async loadSpreads() {
    try {
      const charges = await TradingCharge.find({ isActive: true });
      
      // Default spreads by segment (in pips)
      const defaultSpreads = {
        forex: 1.5,
        metals: 30,
        crypto: 50,
        indices: 100
      };
      
      // Get segment for symbol
      const getSegment = (symbol) => {
        if (['XAUUSD', 'XAGUSD'].includes(symbol)) return 'metals';
        if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD'].includes(symbol)) return 'crypto';
        if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(symbol)) return 'indices';
        return 'forex';
      };
      
      // All symbols
      const symbols = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
        'EURGBP', 'EURJPY', 'GBPJPY', 'EURAUD', 'EURCAD', 'EURCHF', 'GBPAUD',
        'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD'
      ];
      
      const globalCharge = charges.find(c => c.scopeType === 'global');
      
      for (const symbol of symbols) {
        const segment = getSegment(symbol);
        const symbolCharge = charges.find(c => c.scopeType === 'symbol' && c.symbol === symbol);
        const segmentCharge = charges.find(c => c.scopeType === 'segment' && c.segment === segment);
        
        if (symbolCharge && symbolCharge.spreadPips > 0) {
          this.spreads[symbol] = symbolCharge.spreadPips;
        } else if (segmentCharge && segmentCharge.spreadPips > 0) {
          this.spreads[symbol] = segmentCharge.spreadPips;
        } else if (globalCharge && globalCharge.spreadPips > 0) {
          this.spreads[symbol] = globalCharge.spreadPips;
        } else {
          this.spreads[symbol] = defaultSpreads[segment];
        }
      }
      
      console.log('[SocketManager] Spreads loaded:', Object.keys(this.spreads).length, 'symbols');
      
      // Refresh spreads every 60 seconds
      setTimeout(() => this.loadSpreads(), 60000);
    } catch (error) {
      console.error('[SocketManager] Error loading spreads:', error.message);
      // Retry in 10 seconds
      setTimeout(() => this.loadSpreads(), 10000);
    }
  }

  /**
   * Apply spread to price data
   */
  applySpread(symbol, bid, ask) {
    const spreadPips = this.spreads[symbol] || 1.5;
    
    // Convert pips to price based on symbol type
    let pipValue = 0.0001; // Default for forex
    if (symbol.includes('JPY')) pipValue = 0.01;
    else if (symbol.includes('XAU')) pipValue = 0.1;
    else if (symbol.includes('XAG')) pipValue = 0.01;
    else if (symbol.includes('BTC')) pipValue = 1;
    else if (symbol.includes('ETH')) pipValue = 0.1;
    else if (symbol.includes('LTC') || symbol.includes('XRP')) pipValue = 0.001;
    
    const spreadValue = spreadPips * pipValue;
    const halfSpread = spreadValue / 2;
    
    // Apply spread symmetrically around mid price
    const midPrice = (bid + ask) / 2;
    return {
      bid: midPrice - halfSpread,
      ask: midPrice + halfSpread
    };
  }

  /**
   * Initialize AllTick connection
   */
  async initAllTick() {
    if (!this.config.allTickToken) {
      console.log('[SocketManager] AllTick not configured - skipping');
      return false;
    }

    this.allTick = new AllTickService(this.config.allTickToken);

    this.setupAllTickHandlers();
    
    try {
      const connected = await this.allTick.connect();
      if (connected) {
        await this.subscribeDefaultSymbols();
      }
      return connected;
    } catch (error) {
      console.error('[SocketManager] AllTick connection failed:', error.message);
      return false;
    }
  }

  /**
   * Set up AllTick event handlers
   */
  setupAllTickHandlers() {
    const self = this;
    let tickCount = 0;
    
    // Stream ticks to clients AND feed to TradeEngine for order execution
    this.allTick.on('tick', (tickData) => {
      if (tickData && tickData.symbol) {
        // Apply admin-configured spread
        const { bid, ask } = self.applySpread(tickData.symbol, tickData.bid, tickData.ask);
        
        const priceWithSpread = {
          symbol: tickData.symbol,
          bid: bid,
          ask: ask,
          time: Date.now()
        };
        
        // Store price
        self.prices[tickData.symbol] = priceWithSpread;
        
        // Send to frontend with spread applied
        self.io.emit('tick', priceWithSpread);
        
        // Feed to TradeEngine for order execution (with spread)
        tradeEngine.updatePrice(tickData.symbol, {
          bid: bid,
          ask: ask,
          price: (bid + ask) / 2,
          spread: ask - bid
        });
        
        // Log first few ticks
        if (tickCount < 10) {
          console.log(`[Socket.IO] Tick: ${tickData.symbol} ${bid.toFixed(5)}/${ask.toFixed(5)} (spread applied)`);
          tickCount++;
        }
      }
    });

    this.allTick.on('connected', () => {
      console.log('[SocketManager] AllTick connected - streaming to clients');
      self.io.emit('provider:connected', { source: 'alltick' });
    });

    this.allTick.on('disconnected', () => {
      console.log('[SocketManager] AllTick disconnected');
      self.io.emit('provider:disconnected', { source: 'alltick' });
    });

    this.allTick.on('error', (error) => {
      console.error('[SocketManager] AllTick error:', error.message);
    });
    
    this.allTick.on('maxReconnectAttemptsReached', () => {
      console.error('[SocketManager] AllTick max reconnect attempts reached');
      self.io.emit('provider:error', { source: 'alltick', message: 'Connection lost' });
    });
  }

  /**
   * Handle price update with throttling for optimal performance
   */
  handlePriceUpdate(priceData) {
    const symbol = priceData.symbol;
    const now = Date.now();

    // Store latest price
    this.prices[symbol] = priceData;

    // Throttle emissions to prevent flooding (max 20 updates/sec per symbol)
    const lastEmit = this.lastEmitTime[symbol] || 0;
    if (now - lastEmit >= this.throttleMs) {
      this.lastEmitTime[symbol] = now;

      // Log first few emissions for debugging
      if (!this.loggedSymbols) this.loggedSymbols = new Set();
      if (!this.loggedSymbols.has(symbol)) {
        console.log(`[Socket.IO] Emitting ${symbol}: bid=${priceData.bid}, ask=${priceData.ask}`);
        this.loggedSymbols.add(symbol);
      }

      // Emit to all clients
      this.io.emit('tick', priceData);
      this.io.emit('prices', this.prices);
    }
  }

  /**
   * Subscribe to default trading symbols
   */
  async subscribeDefaultSymbols() {
    const symbols = [
      // Major Forex pairs
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
      'AUDUSD', 'NZDUSD', 'USDCAD',
      // Cross pairs
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF',
      'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD',
      'CADCHF', 'CADJPY', 'CHFJPY',
      'EURAUD', 'EURCAD', 'EURNZD',
      'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
      'NZDCAD', 'NZDCHF', 'NZDJPY',
      // Metals
      'XAUUSD', 'XAGUSD',
      // Crypto
      'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD',
      'BNBUSD', 'ADAUSD', 'SOLUSD', 'DOGEUSD',
      // Energy
      'USOIL', 'UKOIL'
    ];

    console.log(`[SocketManager] Subscribing to ${symbols.length} symbols via AllTick...`);
    await this.allTick.subscribeSymbols(symbols);
  }

  /**
   * Set up Socket.IO client handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
      
      this.clients.set(socket.id, {
        subscribedSymbols: new Set(),
        connectedAt: Date.now(),
        userId: null
      });

      // Authenticate user and join their room for personalized events
      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.id || decoded.userId;
          if (userId) {
            socket.join(`user_${userId}`);
            const client = this.clients.get(socket.id);
            if (client) client.userId = userId;
            console.log(`[Socket.IO] User ${userId} joined room user_${userId}`);
          }
        } catch (err) {
          console.log(`[Socket.IO] Token verification failed:`, err.message);
        }
      }

      // Send current status and prices
      socket.emit('status', this.getStatus());
      socket.emit('prices', this.prices);

      // Handle symbol subscription
      socket.on('subscribe', async (data) => {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
        console.log(`[Socket.IO] Client ${socket.id} subscribing to:`, symbols);
        
        const client = this.clients.get(socket.id);
        if (client) {
          symbols.forEach(s => client.subscribedSymbols.add(s));
        }

        // Subscribe via AllTick if connected
        if (this.allTick && this.allTick.isConnected) {
          await this.allTick.subscribeSymbols(symbols);
        }

        socket.emit('subscribed', { symbols });
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data) => {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
        const client = this.clients.get(socket.id);
        if (client) {
          symbols.forEach(s => client.subscribedSymbols.delete(s));
        }
        socket.emit('unsubscribed', { symbols });
      });

      // Get current status
      socket.on('getStatus', () => {
        socket.emit('status', this.getStatus());
      });

      // Get all prices
      socket.on('getPrices', () => {
        socket.emit('prices', this.prices);
      });

      // Get specific symbol price
      socket.on('getPrice', (symbol) => {
        socket.emit('price', this.prices[symbol] || null);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        this.clients.delete(socket.id);
      });

      socket.on('error', (error) => {
        console.error(`[Socket.IO] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Start the socket manager
   */
  async start() {
    console.log('[SocketManager] Starting...');
    
    if (this.config.allTickToken) {
      const connected = await this.initAllTick();
      if (!connected) {
        console.log('[SocketManager] AllTick failed, starting fallback price simulation');
        this.startFallbackPrices();
      }
    } else {
      console.log('[SocketManager] No ALLTICK_TOKEN - starting fallback price simulation');
      this.startFallbackPrices();
    }
  }

  /**
   * Fallback: Generate simulated prices when AllTick is not available
   */
  startFallbackPrices() {
    // Base prices for simulation
    const basePrices = {
      'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 149.50, 'USDCHF': 0.8750,
      'AUDUSD': 0.6550, 'NZDUSD': 0.6150, 'USDCAD': 1.3550,
      'EURGBP': 0.8580, 'EURJPY': 162.20, 'GBPJPY': 189.10, 'EURCHF': 0.9490,
      'EURAUD': 1.6550, 'EURCAD': 1.4700, 'EURNZD': 1.7650,
      'GBPAUD': 1.9300, 'GBPCAD': 1.7150, 'GBPCHF': 1.1060, 'GBPNZD': 2.0580,
      'AUDCAD': 0.8880, 'AUDCHF': 0.5730, 'AUDJPY': 97.90, 'AUDNZD': 1.0650,
      'CADCHF': 0.6450, 'CADJPY': 110.30, 'CHFJPY': 170.90,
      'NZDCAD': 0.8340, 'NZDCHF': 0.5380, 'NZDJPY': 91.95,
      'XAUUSD': 2650.00, 'XAGUSD': 31.50,
      'BTCUSD': 98500, 'ETHUSD': 3450, 'LTCUSD': 105, 'XRPUSD': 2.35,
      'BNBUSD': 710, 'ADAUSD': 1.05, 'SOLUSD': 195, 'DOGEUSD': 0.38,
      'USOIL': 71.50, 'UKOIL': 75.20
    };

    // Spread in pips for each symbol type
    const getSpread = (symbol) => {
      if (symbol.includes('XAU')) return 0.50;
      if (symbol.includes('XAG')) return 0.05;
      if (symbol.includes('BTC')) return 50;
      if (symbol.includes('ETH')) return 5;
      if (symbol.includes('LTC') || symbol.includes('XRP') || symbol.includes('DOGE')) return 0.01;
      if (symbol.includes('BNB') || symbol.includes('ADA') || symbol.includes('SOL')) return 1;
      if (symbol.includes('OIL')) return 0.05;
      if (symbol.includes('JPY')) return 0.03;
      return 0.0002; // Forex default
    };

    // Initialize prices
    Object.entries(basePrices).forEach(([symbol, basePrice]) => {
      const spread = getSpread(symbol);
      this.prices[symbol] = {
        symbol,
        bid: basePrice - spread / 2,
        ask: basePrice + spread / 2,
        time: Date.now()
      };
    });

    // Emit initial prices
    this.io.emit('prices', this.prices);
    console.log(`[SocketManager] Fallback: Initialized ${Object.keys(this.prices).length} symbols`);

    // Simulate price movements every 500ms
    this.fallbackInterval = setInterval(() => {
      Object.entries(basePrices).forEach(([symbol, basePrice]) => {
        // Random walk: ±0.02% movement
        const change = (Math.random() - 0.5) * 0.0004 * basePrice;
        const newPrice = this.prices[symbol] ? 
          (this.prices[symbol].bid + this.prices[symbol].ask) / 2 + change : 
          basePrice + change;
        
        const spread = getSpread(symbol);
        const priceData = {
          symbol,
          bid: newPrice - spread / 2,
          ask: newPrice + spread / 2,
          time: Date.now()
        };

        this.prices[symbol] = priceData;
        
        // Emit tick
        this.io.emit('tick', priceData);
        
        // Update TradeEngine
        tradeEngine.updatePrice(symbol, {
          bid: priceData.bid,
          ask: priceData.ask,
          price: newPrice,
          spread: spread
        });
      });

      // Emit all prices periodically
      this.io.emit('prices', this.prices);
    }, 500);

    this.io.emit('provider:connected', { source: 'simulation' });
  }

  /**
   * Stop and cleanup
   */
  async stop() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }
    if (this.allTick) {
      await this.allTick.disconnect();
    }
    this.io.close();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      connected: true,
      allTickConnected: this.allTick?.isConnected || false,
      subscribedSymbols: this.allTick ? Array.from(this.allTick.subscribedSymbols) : [],
      priceCount: Object.keys(this.prices).length,
      clientCount: this.clients.size,
      source: this.allTick?.isConnected ? 'alltick' : 'none'
    };
  }

  /**
   * Get all prices
   */
  getAllPrices() {
    return this.prices;
  }

  /**
   * Get price for symbol
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
   * Manually emit price (for external data sources)
   */
  emitPrice(priceData) {
    this.handlePriceUpdate(priceData);
  }
}

module.exports = SocketManager;
