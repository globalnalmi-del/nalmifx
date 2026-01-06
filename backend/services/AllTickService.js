/**
 * AllTick Service - Real-time crypto price data from AllTick API
 * Complete implementation based on official documentation
 */

const axios = require('axios');
const EventEmitter = require('events');

class AllTickService extends EventEmitter {
  constructor(token) {
    super();
    this.token = token;
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
   * Subscribe to symbols
   * Crypto symbols are converted to USDT format (e.g., BTCUSD -> BTCUSDT)
   * Forex pairs and metals are kept as-is (e.g., EURUSD, XAUUSD stay unchanged)
   */
  async subscribeSymbols(symbols) {
    // Crypto base currencies that should be converted to USDT format
    // NOTE: XAU and XAG are metals, NOT crypto - they should NOT be converted
    const cryptoBases = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 
                         'LTC', 'MATIC', 'SHIB', 'TRX', 'ATOM', 'UNI', 'NEAR', 'APT', 'ARB', 'OP',
                         'INJ', 'PEPE', 'SUI', 'TON', 'BONK', 'FLOKI', 'XLM'];
    
    const convertedSymbols = symbols.map(symbol => {
      // Check if it's a crypto symbol that needs USDT conversion
      const isCrypto = cryptoBases.some(base => symbol.startsWith(base) && symbol.endsWith('USD') && !symbol.endsWith('USDT'));
      if (isCrypto) {
        return symbol.replace('USD', 'USDT');
      }
      // Keep forex, metals, and other symbols as-is
      return symbol;
    });

    console.log(`[AllTick] Subscribing to: ${convertedSymbols.slice(0, 10).join(', ')}... (${convertedSymbols.length} total)`);
    
    convertedSymbols.forEach(symbol => {
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
              // Keep symbol as-is (BTCUSDT stays BTCUSDT, EURUSD stays EURUSD)
              const symbol = tick.code;
              const price = parseFloat(tick.price);
              
              // Calculate realistic bid/ask spread
              const spread = this.calculateSpread(tick.code, price);
              const bid = price - spread / 2;
              const ask = price + spread / 2;

              const priceData = {
                symbol: symbol,
                bid: bid,
                ask: ask,
                price: price,
                timestamp: parseInt(tick.tick_time) || Date.now()
              };

              // Store price
              this.prices[symbol] = priceData;

              // Emit tick event
              this.emit('tick', {
                symbol: symbol,
                bid: bid,
                ask: ask,
                timestamp: priceData.timestamp
              });

              // Log first few prices
              if (Object.keys(this.prices).length <= 4) {
                console.log(`[AllTick] ${symbol}: $${bid.toFixed(2)}/$${ask.toFixed(2)}`);
              }
            }
          });
        } else {
          console.log('[AllTick] Response:', response.data);
        }
      } catch (error) {
        console.error('[AllTick] Polling error:', error.message);
        this.emit('error', error);
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
   */
  getPrice(symbol) {
    return this.prices[symbol] || null;
  }

  /**
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
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      symbols: Array.from(this.subscribedSymbols),
      priceCount: Object.keys(this.prices).length
    };
  }
}

module.exports = AllTickService;
