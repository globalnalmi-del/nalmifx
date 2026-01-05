/**
<<<<<<< HEAD
 * AllTick Service - Real-time crypto price data from AllTick API
 * Complete implementation based on official documentation
 */

const axios = require('axios');
=======
 * AllTick Service - Real-time market data streaming from AllTick API
 * Replaces MetaApi for forex, crypto, commodities, and indices data
 * 
 * WebSocket API: wss://quote.alltick.co/quote-b-ws-api?token=YOUR_TOKEN
 * Documentation: https://github.com/alltick/alltick-realtime-forex-crypto-stock-tick-finance-websocket-api
 */

const WebSocket = require('ws');
>>>>>>> ce6b80a841c546384646b36fc24d9c64a8b8500d
const EventEmitter = require('events');

class AllTickService extends EventEmitter {
  constructor(token) {
    super();
    this.token = token;
<<<<<<< HEAD
    this.baseUrl = 'https://quote.alltick.co';
    this.isConnected = false;
    this.prices = {};
    this.subscribedSymbols = new Set();
    this.pollingInterval = null;
    this.pollingMs = 3000; // Update every 3 seconds (free tier limit)
  }

  /**
   * Initialize AllTick connection
   */
  async connect() {
    try {
      console.log('[AllTick] Testing connection...');
      
      // Test with BTCUSDT
      const testQuery = {
        trace: this.generateTrace(),
        data: {
          symbol_list: [{ code: 'BTCUSDT' }]
        }
      };
      
      const response = await axios.get(`${this.baseUrl}/quote-b-api/trade-tick`, {
        params: {
          token: this.token,
          query: JSON.stringify(testQuery)
        },
        timeout: 10000
      });
      
      if (response.data.ret === 200) {
        this.isConnected = true;
        console.log('[AllTick] ✓ Connected successfully!');
        this.emit('connected');
        return true;
      } else {
        throw new Error(`API returned: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('[AllTick] ✗ Connection failed:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Generate unique trace ID for each request
   */
  generateTrace() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Subscribe to crypto symbols
   */
  async subscribeSymbols(symbols) {
    // Convert to USDT format for AllTick
    const usdtSymbols = symbols.map(symbol => {
      if (symbol.includes('USD') && !symbol.includes('USDT')) {
        return symbol.replace('USD', 'USDT');
      }
      return symbol;
    });

    console.log(`[AllTick] Subscribing to: ${usdtSymbols.join(', ')}`);
    
    usdtSymbols.forEach(symbol => {
      this.subscribedSymbols.add(symbol);
    });

    // Start polling
    this.startPolling();
  }

  /**
   * Start polling for price updates
   */
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    const poll = async () => {
      if (!this.isConnected || this.subscribedSymbols.size === 0) return;

      try {
        const symbolsArray = Array.from(this.subscribedSymbols);
        
        // Create query for all symbols
        const queryData = {
          trace: this.generateTrace(),
          data: {
            symbol_list: symbolsArray.map(symbol => ({ code: symbol }))
          }
        };
        
        console.log(`[AllTick] Querying ${symbolsArray.length} symbols...`);
        
        const response = await axios.get(`${this.baseUrl}/quote-b-api/trade-tick`, {
          params: {
            token: this.token,
            query: JSON.stringify(queryData)
          },
          timeout: 10000
        });

        if (response.data.ret === 200 && response.data.data && response.data.data.tick_list) {
          response.data.data.tick_list.forEach(tick => {
            if (tick.code && tick.price) {
              // Convert back to USD format for consistency
              const symbolUsd = tick.code.replace('USDT', 'USD');
              const price = parseFloat(tick.price);
              
              // Calculate realistic bid/ask spread
              const spread = this.calculateSpread(tick.code, price);
              const bid = price - spread / 2;
              const ask = price + spread / 2;

              const priceData = {
                symbol: symbolUsd,
                bid: bid,
                ask: ask,
                price: price,
                timestamp: parseInt(tick.tick_time) || Date.now()
              };

              // Store price
              this.prices[symbolUsd] = priceData;

              // Emit tick event
              this.emit('tick', {
                symbol: symbolUsd,
                bid: bid,
                ask: ask,
                timestamp: priceData.timestamp
              });

              // Log first few prices
              if (Object.keys(this.prices).length <= 4) {
                console.log(`[AllTick] ${symbolUsd}: $${bid.toFixed(2)}/$${ask.toFixed(2)}`);
              }
            }
          });
        } else {
          console.log('[AllTick] Response:', response.data);
        }
      } catch (error) {
        console.error('[AllTick] Polling error:', error.message);
      }
    };

    // Initial poll
    poll();

    // Set up interval (respecting free tier limits)
    this.pollingInterval = setInterval(poll, this.pollingMs);
    console.log(`[AllTick] Started polling every ${this.pollingMs}ms`);
  }

  /**
   * Calculate realistic spread based on crypto type
   */
  calculateSpread(symbol, price) {
    // Different spreads for different cryptos (in percentage)
    if (symbol.includes('BTC')) return price * 0.0001;  // 0.01% spread
    if (symbol.includes('ETH')) return price * 0.0002; // 0.02% spread
    if (symbol.includes('LTC')) return price * 0.0003; // 0.03% spread
    if (symbol.includes('XRP')) return price * 0.0005; // 0.05% spread
    return price * 0.0005; // Default 0.05% spread
  }

  /**
   * Get current price for a symbol
=======
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
    
    // Symbol mapping: Our symbols -> AllTick codes (AllTick supported only)
    this.symbolMap = {
      // Major Forex (AllTick supported)
      'EURUSD': 'EURUSD', 'GBPUSD': 'GBPUSD', 'USDJPY': 'USDJPY',
      'USDCHF': 'USDCHF', 'AUDUSD': 'AUDUSD', 'NZDUSD': 'NZDUSD',
      'USDCAD': 'USDCAD',
      // Cross Pairs (AllTick supported)
      'EURGBP': 'EURGBP', 'EURJPY': 'EURJPY', 'GBPJPY': 'GBPJPY',
      'EURCHF': 'EURCHF', 'EURAUD': 'EURAUD', 'EURCAD': 'EURCAD',
      'EURNZD': 'EURNZD', 'GBPAUD': 'GBPAUD', 'GBPCAD': 'GBPCAD',
      'GBPCHF': 'GBPCHF', 'GBPNZD': 'GBPNZD', 'AUDCAD': 'AUDCAD',
      'AUDCHF': 'AUDCHF', 'AUDJPY': 'AUDJPY', 'AUDNZD': 'AUDNZD',
      'AUDDKK': 'AUDDKK', 'CADCHF': 'CADCHF', 'CADJPY': 'CADJPY',
      'CHFJPY': 'CHFJPY', 'NZDCAD': 'NZDCAD', 'NZDJPY': 'NZDJPY',
      // Exotic Pairs (AllTick supported)
      'USDCNH': 'USDCNH', 'USDHKD': 'USDHKD', 'USDSGD': 'USDSGD',
      'USDTHB': 'USDTHB', 'USDVND': 'USDVND', 'USDKRW': 'USDKRW',
      // KRW pairs (AllTick supported)
      'EURKRW': 'EURKRW', 'JPYKRW': 'JPYKRW', 'CNYKRW': 'CNYKRW',
      'GBPKRW': 'GBPKRW', 'AUDKRW': 'AUDKRW', 'CADKRW': 'CADKRW',
      'NZDKRW': 'NZDKRW', 'CHFKRW': 'CHFKRW', 'SGDKRW': 'SGDKRW',
      'THBKRW': 'THBKRW', 'INRKRW': 'INRKRW',
      // Metals (AllTick supported)
      'XAUUSD': 'XAUUSD', 'XAUEUR': 'XAUEUR', 'XAUAUD': 'XAUAUD',
      'XAUCNH': 'XAUCNH', 'XAUSGD': 'XAUSGD', 'XAUTHB': 'XAUTHB',
      'XAGEUR': 'XAGEUR', 'XAGSGD': 'XAGSGD',
      // Crypto (AllTick supported - Popular) - Format: Binance.SYMBOL
      'BTCUSDT': 'Binance.BTCUSDT', 'ETHUSDT': 'Binance.ETHUSDT', 'BNBUSDT': 'Binance.BNBUSDT',
      'SOLUSDT': 'Binance.SOLUSDT', 'XRPUSDT': 'Binance.XRPUSDT', 'DOGEUSDT': 'Binance.DOGEUSDT',
      'ADAUSDT': 'Binance.ADAUSDT', 'AVAXUSDT': 'Binance.AVAXUSDT', 'DOTUSDT': 'Binance.DOTUSDT',
      'LINKUSDT': 'Binance.LINKUSDT', 'LTCUSDT': 'Binance.LTCUSDT', 'MATICUSDT': 'Binance.MATICUSDT',
      'SHIBUSDT': 'Binance.SHIBUSDT', 'TRXUSDT': 'Binance.TRXUSDT', 'ATOMUSDT': 'Binance.ATOMUSDT',
      'UNIUSDT': 'Binance.UNIUSDT', 'XLMUSDT': 'Binance.XLMUSDT', 'NEARUSDT': 'Binance.NEARUSDT',
      'APTUSDT': 'Binance.APTUSDT', 'ARBUSDT': 'Binance.ARBUSDT', 'OPUSDT': 'Binance.OPUSDT',
      'INJUSDT': 'Binance.INJUSDT', 'PEPEUSDT': 'Binance.PEPEUSDT', 'SUIUSDT': 'Binance.SUIUSDT',
      'TONUSDT': 'Binance.TONUSDT', 'RENDERUSDT': 'Binance.RENDERUSDT', 'FETUSDT': 'Binance.FETUSDT',
      'WIFUSDT': 'Binance.WIFUSDT', 'BONKUSDT': 'Binance.BONKUSDT', 'FLOKIUSDT': 'Binance.FLOKIUSDT',
      // US Stocks (AllTick supported - Popular)
      'AAPL.US': 'AAPL.US', 'MSFT.US': 'MSFT.US', 'GOOG.US': 'GOOG.US', 'GOOGL.US': 'GOOGL.US',
      'AMZN.US': 'AMZN.US', 'NVDA.US': 'NVDA.US', 'TSLA.US': 'TSLA.US', 'META.US': 'META.US',
      'LLY.US': 'LLY.US', 'UNH.US': 'UNH.US', 'XOM.US': 'XOM.US', 'V.US': 'V.US',
      'WMT.US': 'WMT.US', 'JPM.US': 'JPM.US', 'JNJ.US': 'JNJ.US', 'MA.US': 'MA.US',
      'PG.US': 'PG.US', 'AVGO.US': 'AVGO.US', 'CVX.US': 'CVX.US', 'HD.US': 'HD.US',
      'ORCL.US': 'ORCL.US', 'MRK.US': 'MRK.US', 'ABBV.US': 'ABBV.US', 'KO.US': 'KO.US',
      'COST.US': 'COST.US', 'PEP.US': 'PEP.US', 'ADBE.US': 'ADBE.US', 'BABA.US': 'BABA.US',
      'BAC.US': 'BAC.US', 'CSCO.US': 'CSCO.US', 'CRM.US': 'CRM.US', 'ACN.US': 'ACN.US',
      'MCD.US': 'MCD.US', 'TMO.US': 'TMO.US', 'NFLX.US': 'NFLX.US', 'AMD.US': 'AMD.US',
      'WFC.US': 'WFC.US', 'DIS.US': 'DIS.US', 'INTC.US': 'INTC.US', 'VZ.US': 'VZ.US',
      'CAT.US': 'CAT.US', 'NKE.US': 'NKE.US', 'MS.US': 'MS.US', 'IBM.US': 'IBM.US',
      'UPS.US': 'UPS.US', 'HON.US': 'HON.US', 'LOW.US': 'LOW.US', 'GE.US': 'GE.US',
      'QCOM.US': 'QCOM.US', 'BA.US': 'BA.US', 'AMAT.US': 'AMAT.US', 'NOW.US': 'NOW.US',
      'AXP.US': 'AXP.US', 'DE.US': 'DE.US', 'BKNG.US': 'BKNG.US', 'T.US': 'T.US',
      'GS.US': 'GS.US', 'SBUX.US': 'SBUX.US', 'ISRG.US': 'ISRG.US', 'BLK.US': 'BLK.US',
      'UBER.US': 'UBER.US', 'ABNB.US': 'ABNB.US', 'C.US': 'C.US', 'AMT.US': 'AMT.US',
      'MU.US': 'MU.US', 'PYPL.US': 'PYPL.US', 'SQ.US': 'SQ.US', 'COIN.US': 'COIN.US'
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
>>>>>>> ce6b80a841c546384646b36fc24d9c64a8b8500d
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
<<<<<<< HEAD
   * Get all current prices
   */
  getAllPrices() {
    return this.prices;
  }

  /**
   * Disconnect from AllTick
   */
  disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isConnected = false;
    console.log('[AllTick] Disconnected');
    this.emit('disconnected');
=======
   * Get all cached prices
   */
  getAllPrices() {
    return { ...this.prices };
>>>>>>> ce6b80a841c546384646b36fc24d9c64a8b8500d
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
<<<<<<< HEAD
      symbols: Array.from(this.subscribedSymbols),
      priceCount: Object.keys(this.prices).length
    };
  }
=======
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
>>>>>>> ce6b80a841c546384646b36fc24d9c64a8b8500d
}

module.exports = AllTickService;
