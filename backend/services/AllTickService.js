/**
 * AllTick Service - Real-time market data streaming from AllTick API
 * Replaces MetaApi for forex, crypto, commodities, and indices data
 * 
 * WebSocket API: wss://quote.alltick.co/quote-b-ws-api?token=YOUR_TOKEN
 * Documentation: https://github.com/alltick/alltick-realtime-forex-crypto-stock-tick-finance-websocket-api
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class AllTickService extends EventEmitter {
  constructor(token) {
    super();
    this.token = token;
    this.ws = null;
    this.isConnected = false;
    this.subscribedSymbols = new Set();
    this.prices = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    
    // AllTick WebSocket endpoints
    this.wsUrl = `wss://quote.alltick.co/quote-b-ws-api?token=${token}`;
    
    // Symbol mapping: Our symbols -> AllTick codes
    this.symbolMap = {
      // Major Forex
      'EURUSD': 'EURUSD', 'GBPUSD': 'GBPUSD', 'USDJPY': 'USDJPY',
      'USDCHF': 'USDCHF', 'AUDUSD': 'AUDUSD', 'NZDUSD': 'NZDUSD',
      'USDCAD': 'USDCAD',
      // Cross Pairs
      'EURGBP': 'EURGBP', 'EURJPY': 'EURJPY', 'GBPJPY': 'GBPJPY',
      'EURCHF': 'EURCHF', 'EURAUD': 'EURAUD', 'EURCAD': 'EURCAD',
      'EURNZD': 'EURNZD', 'GBPAUD': 'GBPAUD', 'GBPCAD': 'GBPCAD',
      'GBPCHF': 'GBPCHF', 'GBPNZD': 'GBPNZD', 'AUDCAD': 'AUDCAD',
      'AUDCHF': 'AUDCHF', 'AUDJPY': 'AUDJPY', 'AUDNZD': 'AUDNZD',
      'CADCHF': 'CADCHF', 'CADJPY': 'CADJPY', 'CHFJPY': 'CHFJPY',
      'NZDCAD': 'NZDCAD', 'NZDCHF': 'NZDCHF', 'NZDJPY': 'NZDJPY',
      // Exotic Pairs
      'USDSGD': 'USDSGD', 'USDHKD': 'USDHKD', 'USDMXN': 'USDMXN',
      'USDZAR': 'USDZAR', 'USDTRY': 'USDTRY', 'USDSEK': 'USDSEK',
      'USDNOK': 'USDNOK', 'EURTRY': 'EURTRY', 'EURPLN': 'EURPLN',
      // Metals
      'XAUUSD': 'XAUUSD', 'XAGUSD': 'XAGUSD', 'XAUEUR': 'XAUEUR',
      'XPTUSD': 'XPTUSD', 'XPDUSD': 'XPDUSD',
      // Energy
      'USOIL': 'USOIL', 'UKOIL': 'UKOIL', 'XNGUSD': 'XNGUSD',
      // Crypto (AllTick format)
      'BTCUSD': 'BTCUSD', 'ETHUSD': 'ETHUSD', 'LTCUSD': 'LTCUSD',
      'XRPUSD': 'XRPUSD', 'BNBUSD': 'BNBUSD', 'ADAUSD': 'ADAUSD',
      'SOLUSD': 'SOLUSD', 'DOTUSD': 'DOTUSD', 'DOGEUSD': 'DOGEUSD',
      'MATICUSD': 'MATICUSD', 'LINKUSD': 'LINKUSD', 'AVAXUSD': 'AVAXUSD',
      // Indices (check AllTick availability)
      'US30': 'US30', 'US500': 'US500', 'NAS100': 'NAS100',
      'UK100': 'UK100', 'GER40': 'GER40', 'JP225': 'JP225'
    };
    
    // Reverse mapping for incoming data
    this.reverseSymbolMap = {};
    Object.entries(this.symbolMap).forEach(([key, value]) => {
      this.reverseSymbolMap[value] = key;
    });
  }

  /**
   * Connect to AllTick WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('[AllTick] Connecting to WebSocket...');
        
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.on('open', () => {
          console.log('[AllTick] WebSocket connected!');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve(true);
        });
        
        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('close', (code, reason) => {
          console.log(`[AllTick] WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.scheduleReconnect();
        });
        
        this.ws.on('error', (error) => {
          console.error('[AllTick] WebSocket error:', error.message);
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });
        
        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws.terminate();
            reject(new Error('Connection timeout'));
          }
        }, 30000);
        
      } catch (error) {
        console.error('[AllTick] Connection error:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(rawData) {
    try {
      const data = JSON.parse(rawData.toString());
      
      // Handle different protocol numbers
      // cmd_id is used in responses, cmd is used in pushes
      const cmdId = data.cmd_id || data.cmd;
      
      // Log first few messages for debugging
      if (!this.loggedMessages) this.loggedMessages = 0;
      if (this.loggedMessages < 10) {
        console.log('[AllTick] Message received:', JSON.stringify(data).substring(0, 200));
        this.loggedMessages++;
      }
      
      if (cmdId === 22999 && data.data) {
        // Order book push - contains bid/ask prices
        this.handleOrderBookPush(data.data);
      } else if (cmdId === 22998 && data.data) {
        // Transaction quote push - contains last price
        this.handleTransactionPush(data.data);
      } else if (cmdId === 22003 || cmdId === 22005) {
        // Subscription confirmation
        if (data.ret === 200) {
          console.log('[AllTick] Subscription confirmed:', data.msg);
        }
      } else if (cmdId === 20000 || cmdId === 20001) {
        // Heartbeat response - ignore
      } else if (data.ret !== undefined && data.ret !== 200 && data.ret !== 0) {
        console.error('[AllTick] Error response:', data);
      }
    } catch (error) {
      // May receive binary data or non-JSON, ignore
    }
  }

  /**
   * Handle order book push (Protocol 22999) - Contains bid/ask
   */
  handleOrderBookPush(data) {
    const code = data.code;
    const symbol = this.reverseSymbolMap[code] || code;
    
    if (data.bids && data.bids.length > 0 && data.asks && data.asks.length > 0) {
      const bid = parseFloat(data.bids[0].price);
      const ask = parseFloat(data.asks[0].price);
      
      if (!isNaN(bid) && !isNaN(ask) && bid > 0 && ask > 0) {
        this.prices[symbol] = { bid, ask, timestamp: Date.now() };
        
        this.emit('tick', {
          symbol,
          bid,
          ask,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handle transaction push (Protocol 22998) - Contains last price
   * We derive bid/ask from last price with small spread
   */
  handleTransactionPush(data) {
    const code = data.code;
    const symbol = this.reverseSymbolMap[code] || code;
    const price = parseFloat(data.price);
    
    if (!isNaN(price) && price > 0) {
      // If we already have bid/ask from order book, update with transaction
      // Otherwise derive bid/ask from last price
      const existing = this.prices[symbol];
      
      if (existing && existing.bid && existing.ask) {
        // Keep existing spread, adjust around new price
        const spread = existing.ask - existing.bid;
        const halfSpread = spread / 2;
        this.prices[symbol] = {
          bid: price - halfSpread,
          ask: price + halfSpread,
          price,
          timestamp: Date.now()
        };
      } else {
        // Derive minimal spread based on symbol type
        let spreadPips = 0.0001; // Default forex
        if (symbol.includes('JPY')) spreadPips = 0.01;
        else if (symbol.includes('XAU')) spreadPips = 0.5;
        else if (symbol.includes('XAG')) spreadPips = 0.05;
        else if (symbol.includes('BTC')) spreadPips = 10;
        else if (symbol.includes('ETH')) spreadPips = 1;
        
        this.prices[symbol] = {
          bid: price - spreadPips / 2,
          ask: price + spreadPips / 2,
          price,
          timestamp: Date.now()
        };
      }
      
      this.emit('tick', {
        symbol,
        bid: this.prices[symbol].bid,
        ask: this.prices[symbol].ask,
        price,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Subscribe to order book quotes (bid/ask)
   * Protocol 22002
   */
  subscribeOrderBook(symbols) {
    if (!this.isConnected || !this.ws) {
      console.warn('[AllTick] Cannot subscribe - not connected');
      return false;
    }
    
    const symbolList = symbols.map(s => ({
      code: this.symbolMap[s] || s
    }));
    
    // seq_id must be uint32 (max ~4 billion)
    const seqId = Math.floor(Math.random() * 1000000000);
    
    const request = {
      cmd_id: 22002,
      seq_id: seqId,
      trace: `ob_${seqId}`,
      data: {
        symbol_list: symbolList
      }
    };
    
    console.log(`[AllTick] Subscribing to order book for ${symbols.length} symbols`);
    this.ws.send(JSON.stringify(request));
    
    symbols.forEach(s => this.subscribedSymbols.add(s));
    return true;
  }

  /**
   * Subscribe to transaction quotes (last price)
   * Protocol 22004
   */
  subscribeTransaction(symbols) {
    if (!this.isConnected || !this.ws) {
      console.warn('[AllTick] Cannot subscribe - not connected');
      return false;
    }
    
    const symbolList = symbols.map(s => ({
      code: this.symbolMap[s] || s
    }));
    
    // seq_id must be uint32 (max ~4 billion)
    const seqId = Math.floor(Math.random() * 1000000000);
    
    const request = {
      cmd_id: 22004,
      seq_id: seqId,
      trace: `tx_${seqId}`,
      data: {
        symbol_list: symbolList
      }
    };
    
    console.log(`[AllTick] Subscribing to transactions for ${symbols.length} symbols`);
    this.ws.send(JSON.stringify(request));
    
    symbols.forEach(s => this.subscribedSymbols.add(s));
    return true;
  }

  /**
   * Subscribe to symbols (both order book and transactions)
   */
  async subscribeSymbols(symbols) {
    if (!this.isConnected) {
      console.warn('[AllTick] Cannot subscribe - not connected');
      return false;
    }
    
    // Subscribe to order book for bid/ask
    this.subscribeOrderBook(symbols);
    
    // Also subscribe to transactions for last price updates
    setTimeout(() => {
      this.subscribeTransaction(symbols);
    }, 1000);
    
    return true;
  }

  /**
   * Subscribe to a single symbol
   */
  async subscribeSymbol(symbol) {
    return this.subscribeSymbols([symbol]);
  }

  /**
   * Start heartbeat to keep connection alive
   * AllTick requires heartbeat every 10 seconds
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        const seqId = Math.floor(Math.random() * 1000000000);
        const heartbeat = {
          cmd_id: 20000,
          seq_id: seqId,
          trace: `hb_${seqId}`,
          data: {}
        };
        this.ws.send(JSON.stringify(heartbeat));
      }
    }, 10000); // Every 10 seconds
    
    console.log('[AllTick] Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AllTick] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[AllTick] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        // Re-subscribe to symbols after reconnect
        if (this.subscribedSymbols.size > 0) {
          const symbols = Array.from(this.subscribedSymbols);
          await this.subscribeSymbols(symbols);
        }
      } catch (error) {
        console.error('[AllTick] Reconnection failed:', error.message);
      }
    }, delay);
  }

  /**
   * Get current price for symbol
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
   * Get all cached prices
   */
  getAllPrices() {
    return { ...this.prices };
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      subscribedSymbols: Array.from(this.subscribedSymbols),
      priceCount: Object.keys(this.prices).length,
      source: 'alltick'
    };
  }

  /**
   * Disconnect from AllTick
   */
  async disconnect() {
    try {
      this.stopHeartbeat();
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.isConnected = false;
      this.subscribedSymbols.clear();
      this.prices = {};
      console.log('[AllTick] Disconnected');
    } catch (error) {
      console.error('[AllTick] Disconnect error:', error.message);
    }
  }
}

module.exports = AllTickService;
