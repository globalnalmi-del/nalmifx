import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, ChevronDown } from 'lucide-react'
import axios from 'axios'
import TradingChart from '../TradingChart'
import { useTheme } from '../../context/ThemeContext'

// Lot size presets for quick selection
const LOT_PRESETS = [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
const LEVERAGE_OPTIONS = [30, 50, 100, 200, 400, 500, 600, 800, 1000]

const MobileChart = () => {
  const { isDark } = useTheme()
  const [chartTabs, setChartTabs] = useState(() => {
    const saved = localStorage.getItem('selectedSymbol') || 'XAUUSD'
    return [{ id: 1, symbol: saved }]
  })
  const [activeTabId, setActiveTabId] = useState(1)
  const [prices, setPrices] = useState({})
  const [quickLots, setQuickLots] = useState(() => {
    const saved = localStorage.getItem('lastLotSize')
    return saved ? parseFloat(saved) : 0.01
  })
  const [lotInputValue, setLotInputValue] = useState(() => {
    const saved = localStorage.getItem('lastLotSize')
    return saved || '0.01'
  })
  const [loading, setLoading] = useState(false)
  const [showSymbolPicker, setShowSymbolPicker] = useState(false)
  const [showLotPicker, setShowLotPicker] = useState(false)
  const [instruments, setInstruments] = useState([])
  
  // Trading panel state
  const [selectedLeverage, setSelectedLeverage] = useState(100)
  const [maxLeverage, setMaxLeverage] = useState(1000)
  const [showStopLoss, setShowStopLoss] = useState(false)
  const [showTakeProfit, setShowTakeProfit] = useState(false)
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [orderMode, setOrderMode] = useState('market') // 'market' or 'pending'
  const [pendingType, setPendingType] = useState('BUY') // Simplified: just 'BUY' or 'SELL'
  const [entryPrice, setEntryPrice] = useState('')

  const activeTab = chartTabs.find(t => t.id === activeTabId) || chartTabs[0]
  const selectedSymbol = activeTab?.symbol || 'XAUUSD'

  // Get decimals based on symbol (matching instrument settings)
  const getDecimals = (symbol) => {
    if (!symbol) return 5
    if (symbol.includes('JPY')) return 3
    if (symbol.includes('BTC')) return 2
    if (symbol.includes('ETH')) return 2
    if (symbol.includes('XAU')) return 2
    if (symbol.includes('XAG')) return 3
    if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('DE30') || symbol.includes('UK100')) return 1
    if (symbol.includes('JP225')) return 0
    if (symbol.includes('OIL')) return 2
    if (symbol.includes('XNG')) return 3
    if (symbol.includes('LTC') || symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('SOL')) return 4
    return 5
  }

  const formatPrice = (price, symbol) => {
    if (!price) return '---'
    return parseFloat(price.toFixed(getDecimals(symbol))).toString()
  }

  useEffect(() => {
    fetchPrices()
    fetchInstruments()
    fetchAccountData()
    const interval = setInterval(fetchPrices, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch account data for leverage
  const fetchAccountData = async () => {
    const savedAccount = localStorage.getItem('activeTradingAccount')
    if (savedAccount) {
      try {
        const token = localStorage.getItem('token')
        const accountData = JSON.parse(savedAccount)
        const res = await axios.get(`/api/trading-accounts/${accountData._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.success && res.data.data) {
          setMaxLeverage(res.data.data.leverage || 1000)
        }
      } catch (err) {}
    }
  }

  // Adjust volume
  const adjustVolume = (delta) => {
    const newVol = Math.max(0.01, Math.round((quickLots + delta) * 100) / 100)
    setQuickLots(newVol)
    setLotInputValue(newVol.toString())
    localStorage.setItem('lastLotSize', newVol.toString())
  }

  const fetchPrices = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/trades/prices', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setPrices(res.data.data || {})
      }
    } catch (err) {}
  }

  const fetchInstruments = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/market/instruments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setInstruments(res.data.data || [])
      }
    } catch (err) {}
  }

  const addTab = (symbol) => {
    const newId = Math.max(...chartTabs.map(t => t.id), 0) + 1
    setChartTabs([...chartTabs, { id: newId, symbol }])
    setActiveTabId(newId)
    setShowSymbolPicker(false)
  }

  const closeTab = (tabId) => {
    if (chartTabs.length === 1) return
    const newTabs = chartTabs.filter(t => t.id !== tabId)
    setChartTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
  }

  // Check if trading is locked (kill switch)
  const isTradingLocked = () => {
    const savedLockEnd = localStorage.getItem('tradingLockEnd')
    if (savedLockEnd) {
      const endTime = new Date(savedLockEnd)
      if (endTime > new Date()) return true
      else localStorage.removeItem('tradingLockEnd')
    }
    return false
  }

  const handleTrade = async (type) => {
    // Check kill switch
    if (isTradingLocked()) {
      alert('Trading is currently locked. Kill switch is active.')
      return
    }

    const activeAccount = JSON.parse(localStorage.getItem('activeTradingAccount') || '{}')
    if (!activeAccount._id) {
      alert('Please select a trading account first')
      return
    }

    if (!quickLots || quickLots < 0.01) {
      alert('Invalid lot size')
      return
    }
    
    // For pending orders, validate entry price
    if (orderMode === 'pending' && !entryPrice) {
      alert('Please enter a price for pending order')
      return
    }
    
    // Save last used lot size
    localStorage.setItem('lastLotSize', quickLots.toString())

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login first')
        setLoading(false)
        return
      }

      const tradeData = {
        symbol: selectedSymbol,
        type,
        amount: quickLots,
        orderType: orderMode === 'pending' ? 'pending' : 'market', // Simplified: just 'pending', backend auto-maps
        tradingAccountId: activeAccount._id,
        leverage: selectedLeverage
      }
      
      // Add trigger price for pending orders
      if (orderMode === 'pending') {
        tradeData.price = parseFloat(entryPrice)
        tradeData.type = pendingType.toLowerCase() // 'buy' or 'sell'
      }
      
      // DEBUG: Log what we're sending
      console.log('[MobileChart] ========== SENDING ORDER ==========');
      console.log('[MobileChart] orderMode:', orderMode);
      console.log('[MobileChart] orderType:', tradeData.orderType);
      console.log('[MobileChart] type:', tradeData.type);
      console.log('[MobileChart] price:', tradeData.price);
      console.log('[MobileChart] Backend will auto-map to limit/stop based on price');
      
      // Add SL/TP if enabled
      if (showStopLoss && stopLoss) {
        tradeData.stopLoss = parseFloat(stopLoss)
      }
      if (showTakeProfit && takeProfit) {
        tradeData.takeProfit = parseFloat(takeProfit)
      }

      const res = await axios.post('/api/trades', tradeData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        window.dispatchEvent(new Event('tradeCreated'))
        // Reset fields
        setStopLoss('')
        setTakeProfit('')
        setEntryPrice('')
        if (orderMode === 'pending') {
          alert(orderMode === 'pending' ? 'Pending order placed!' : 'Trade opened!')
        }
      }
    } catch (err) {
      console.error('[MobileChart] Trade error:', err.response?.data || err.message)
      const errorMsg = err.response?.data?.message || err.message || 'Trade failed'
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle pending order submission
  const handlePendingOrder = async () => {
    const type = pendingType.toLowerCase() // 'buy' or 'sell'
    await handleTrade(type)
  }

  const price = prices[selectedSymbol] || { bid: 0, ask: 0 }
  
  // Categorize instruments
  const getCategory = (symbol) => {
    // Crypto symbols (including USDT pairs)
    const cryptoSymbols = ['BTC', 'ETH', 'LTC', 'XRP', 'DOGE', 'SOL', 'BNB', 'ADA', 'AVAX', 'DOT', 
                          'LINK', 'SHIB', 'TRX', 'ATOM', 'UNI', 'NEAR', 'APT', 'ARB', 'OP', 
                          'INJ', 'PEPE', 'SUI', 'TON', 'BONK', 'FLOKI', 'XLM']
    if (cryptoSymbols.some(c => symbol.includes(c))) return 'Crypto'
    if (symbol.includes('XAU') || symbol.includes('XAG')) return 'Metals'
    if (symbol.includes('KRW') || symbol.includes('CNH') || symbol.includes('HKD') || 
        symbol.includes('SGD') || symbol.includes('THB')) return 'Exotic'
    return 'Forex'
  }

  const symbolList = instruments.length > 0 ? instruments.map(i => i.symbol) : Object.keys(prices)
  
  // Group symbols by category
  const groupedSymbols = symbolList.reduce((acc, symbol) => {
    const cat = getCategory(symbol)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(symbol)
    return acc
  }, {})

  return (
    <div style={{ 
      backgroundColor: isDark ? '#000' : '#f5f5f7', 
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Chart Tabs */}
      <div 
        className="flex items-center px-2 py-2 overflow-x-auto" 
        style={{ 
          backgroundColor: isDark ? '#0a0a0a' : '#fff', 
          borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}`
        }}
      >
        {chartTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg mr-1"
            style={{ 
              backgroundColor: activeTabId === tab.id ? '#3b82f6' : (isDark ? '#1a1a1a' : '#e5e5ea')
            }}
          >
            <span className="text-xs font-medium" style={{ color: activeTabId === tab.id ? '#fff' : (isDark ? '#fff' : '#000') }}>{tab.symbol}</span>
            {chartTabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="ml-1 rounded"
              >
                <X size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowSymbolPicker(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center ml-1"
          style={{ backgroundColor: isDark ? '#1a1a1a' : '#e5e5ea' }}
        >
          <Plus size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
        </button>
      </div>

      {/* Chart Area - Limited height (65% of viewport) */}
      <div style={{ height: '65vh', minHeight: '300px', maxHeight: '500px' }}>
        <TradingChart symbol={selectedSymbol} />
      </div>

      {/* Buy/Sell Panel - Normal flow, scroll to reach */}
      <div 
        style={{ 
          backgroundColor: isDark ? '#0a0a0a' : '#fff', 
          borderTop: `1px solid ${isDark ? '#1a1a1a' : '#e5e5ea'}`,
          padding: '10px 12px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Market/Pending Toggle */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '10px',
          backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
          borderRadius: '8px',
          padding: '2px'
        }}>
          <button
            onClick={() => setOrderMode('market')}
            style={{ 
              flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
              backgroundColor: orderMode === 'market' ? '#3b82f6' : 'transparent',
              color: orderMode === 'market' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
              border: 'none', cursor: 'pointer'
            }}
          >
            Market
          </button>
          <button
            onClick={() => setOrderMode('pending')}
            style={{ 
              flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
              backgroundColor: orderMode === 'pending' ? '#3b82f6' : 'transparent',
              color: orderMode === 'pending' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
              border: 'none', cursor: 'pointer'
            }}
          >
            Pending
          </button>
        </div>

        {/* Pending Order Type & Price (only show in pending mode) */}
        {orderMode === 'pending' && (
          <div style={{ marginBottom: '10px' }}>
            {/* Simplified: Just BUY or SELL */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setPendingType('BUY')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  backgroundColor: pendingType === 'BUY' ? '#3b82f6' : (isDark ? '#2c2c2e' : '#e5e5ea'),
                  color: pendingType === 'BUY' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
                  border: 'none', cursor: 'pointer'
                }}
              >
                BUY
              </button>
              <button
                onClick={() => setPendingType('SELL')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  backgroundColor: pendingType === 'SELL' ? '#ef4444' : (isDark ? '#2c2c2e' : '#e5e5ea'),
                  color: pendingType === 'SELL' ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
                  border: 'none', cursor: 'pointer'
                }}
              >
                SELL
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder={`Trigger Price (Current: ${formatPrice(pendingType === 'BUY' ? price.ask : price.bid, selectedSymbol)})`}
              style={{ 
                width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px',
                backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
                color: isDark ? '#fff' : '#000', 
                border: `1px solid ${isDark ? '#333' : '#e5e5ea'}`
              }}
            />
          </div>
        )}

        {/* Trading Options Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px'
        }}>
          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => adjustVolume(-0.01)}
              style={{ 
                width: '28px', height: '28px', borderRadius: '6px',
                backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Minus size={14} color={isDark ? '#fff' : '#000'} />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={lotInputValue}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                  setLotInputValue(value)
                  const numVal = parseFloat(value)
                  if (!isNaN(numVal) && numVal > 0) {
                    setQuickLots(numVal)
                    localStorage.setItem('lastLotSize', numVal.toString())
                  }
                }
              }}
              style={{ 
                width: '60px', height: '28px', textAlign: 'center',
                fontSize: '13px', fontWeight: '600', borderRadius: '6px',
                backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
                color: isDark ? '#fff' : '#000', border: 'none'
              }}
            />
            <button
              onClick={() => adjustVolume(0.01)}
              style={{ 
                width: '28px', height: '28px', borderRadius: '6px',
                backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Plus size={14} color={isDark ? '#fff' : '#000'} />
            </button>
          </div>

          {/* Leverage */}
          <select
            value={selectedLeverage}
            onChange={(e) => setSelectedLeverage(Number(e.target.value))}
            style={{ 
              padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
              backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
              color: isDark ? '#fff' : '#000', border: 'none',
              minWidth: '70px'
            }}
          >
            {LEVERAGE_OPTIONS.filter(l => l <= maxLeverage).map(lev => (
              <option key={lev} value={lev}>1:{lev}</option>
            ))}
          </select>

          {/* SL Toggle */}
          <button
            onClick={() => setShowStopLoss(!showStopLoss)}
            style={{ 
              padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
              backgroundColor: showStopLoss ? '#ef4444' : (isDark ? '#2c2c2e' : '#e5e5ea'),
              color: showStopLoss ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
              border: 'none', cursor: 'pointer'
            }}
          >
            SL
          </button>

          {/* TP Toggle */}
          <button
            onClick={() => setShowTakeProfit(!showTakeProfit)}
            style={{ 
              padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
              backgroundColor: showTakeProfit ? '#22c55e' : (isDark ? '#2c2c2e' : '#e5e5ea'),
              color: showTakeProfit ? '#fff' : (isDark ? '#9ca3af' : '#6b7280'),
              border: 'none', cursor: 'pointer'
            }}
          >
            TP
          </button>
        </div>

        {/* SL/TP Inputs Row */}
        {(showStopLoss || showTakeProfit) && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {showStopLoss && (
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Stop Loss"
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                  backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
                  color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}`
                }}
              />
            )}
            {showTakeProfit && (
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Take Profit"
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                  backgroundColor: isDark ? '#1a1a1a' : '#f2f2f7',
                  color: isDark ? '#fff' : '#000', border: `1px solid ${isDark ? '#333' : '#e5e5ea'}`
                }}
              />
            )}
          </div>
        )}

        {/* Buy/Sell Buttons (Market) or Place Order Button (Pending) */}
        {orderMode === 'market' ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleTrade('sell')}
              disabled={loading}
              style={{ 
                flex: 1,
                padding: '12px 16px',
                borderRadius: '9999px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: loading ? 0.5 : 1,
                WebkitAppearance: 'none',
                appearance: 'none'
              }}
            >
              <span>SELL</span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{formatPrice(price.bid, selectedSymbol)}</span>
            </button>
            
            <button
              onClick={() => handleTrade('buy')}
              disabled={loading}
              style={{ 
                flex: 1,
                padding: '12px 16px',
                borderRadius: '9999px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: loading ? 0.5 : 1,
                WebkitAppearance: 'none',
                appearance: 'none'
              }}
            >
              <span>BUY</span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{formatPrice(price.ask, selectedSymbol)}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handlePendingOrder}
            disabled={loading || !entryPrice}
            style={{ 
              width: '100%',
              padding: '14px 16px',
              borderRadius: '9999px',
              backgroundColor: pendingType.includes('BUY') ? '#3b82f6' : '#ef4444',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (loading || !entryPrice) ? 0.5 : 1,
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          >
            <span>Place Pending {pendingType}</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>@ {entryPrice || '---'}</span>
          </button>
        )}
      </div>

      {/* Lot Size Picker Modal */}
      {showLotPicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full rounded-t-2xl overflow-hidden"
            style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: isDark ? '#3a3a3c' : '#d1d1d6' }}></div>
            </div>
            
            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg" style={{ color: isDark ? '#fff' : '#000' }}>Lot Size</h3>
                <button onClick={() => setShowLotPicker(false)}>
                  <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                </button>
              </div>
              
              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {LOT_PRESETS.map(lot => (
                  <button
                    key={lot}
                    onClick={() => {
                      setQuickLots(lot)
                      setLotInputValue(lot.toString())
                      localStorage.setItem('lastLotSize', lot.toString())
                    }}
                    className="py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{ 
                      backgroundColor: quickLots === lot ? '#3b82f6' : (isDark ? '#2c2c2e' : '#f2f2f7'),
                      color: quickLots === lot ? '#fff' : (isDark ? '#fff' : '#000')
                    }}
                  >
                    {lot}
                  </button>
                ))}
              </div>
              
              {/* Custom Input with Slider */}
              <div className="mb-4">
                <label className="block text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Custom Amount</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newVal = Math.max(0.01, parseFloat((quickLots - 0.01).toFixed(2)))
                      setQuickLots(newVal)
                      setLotInputValue(newVal.toString())
                    }}
                    className="w-12 h-12 rounded-xl font-bold text-xl flex items-center justify-center"
                    style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: isDark ? '#fff' : '#000' }}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lotInputValue}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty, numbers, and decimal point for editing
                      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                        setLotInputValue(value)
                        const numVal = parseFloat(value)
                        if (!isNaN(numVal) && numVal > 0) {
                          setQuickLots(numVal)
                        }
                      }
                    }}
                    onBlur={() => {
                      // On blur, ensure valid value
                      const numVal = parseFloat(lotInputValue)
                      if (isNaN(numVal) || numVal < 0.01) {
                        setLotInputValue('0.01')
                        setQuickLots(0.01)
                      } else {
                        setLotInputValue(numVal.toString())
                        setQuickLots(numVal)
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded-xl text-center text-lg font-bold"
                    style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: isDark ? '#fff' : '#000', border: 'none' }}
                  />
                  <button
                    onClick={() => {
                      const newVal = parseFloat((quickLots + 0.01).toFixed(2))
                      setQuickLots(newVal)
                      setLotInputValue(newVal.toString())
                    }}
                    className="w-12 h-12 rounded-xl font-bold text-xl flex items-center justify-center"
                    style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', color: isDark ? '#fff' : '#000' }}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Slider for fine control */}
              <div className="mb-6">
                <input
                  type="range"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={quickLots}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setQuickLots(val)
                    setLotInputValue(val.toFixed(2))
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(quickLots / 10) * 100}%, ${isDark ? '#3a3a3c' : '#d1d1d6'} ${(quickLots / 10) * 100}%, ${isDark ? '#3a3a3c' : '#d1d1d6'} 100%)`,
                    accentColor: '#3b82f6'
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>
                  <span>0.01</span>
                  <span>10.00</span>
                </div>
              </div>
              
              {/* Confirm Button */}
              <button
                onClick={() => {
                  localStorage.setItem('lastLotSize', quickLots.toString())
                  setShowLotPicker(false)
                }}
                className="w-full py-4 rounded-2xl font-semibold text-white text-lg"
                style={{ backgroundColor: '#3b82f6' }}
              >
                Confirm ({quickLots} lots)
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Symbol Picker Modal - Segmented by Category */}
      {showSymbolPicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-h-[70vh] rounded-t-2xl overflow-hidden" style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}` }}>
              <h3 className="font-bold" style={{ color: isDark ? '#fff' : '#000' }}>Add Chart</h3>
              <button onClick={() => setShowSymbolPicker(false)}>
                <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-3">
              {Object.entries(groupedSymbols).map(([category, symbols]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-bold uppercase mb-2 px-2" style={{ color: isDark ? '#6b7280' : '#8e8e93' }}>{category}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {symbols.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => addTab(symbol)}
                        className="px-3 py-2.5 rounded-lg text-center"
                        style={{ backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }}
                      >
                        <span className="text-sm font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileChart
