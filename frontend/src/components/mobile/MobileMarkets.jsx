import React, { useState, useEffect } from 'react'
import { Search, Star } from 'lucide-react'
import axios from 'axios'

const instruments = [
  // Forex Majors (AllTick supported)
  { symbol: 'EURUSD', category: 'forex' },
  { symbol: 'GBPUSD', category: 'forex' },
  { symbol: 'USDJPY', category: 'forex' },
  { symbol: 'USDCHF', category: 'forex' },
  { symbol: 'AUDUSD', category: 'forex' },
  { symbol: 'NZDUSD', category: 'forex' },
  { symbol: 'USDCAD', category: 'forex' },
  // Forex Cross (AllTick supported)
  { symbol: 'EURGBP', category: 'forex' },
  { symbol: 'EURJPY', category: 'forex' },
  { symbol: 'GBPJPY', category: 'forex' },
  { symbol: 'EURCHF', category: 'forex' },
  { symbol: 'AUDCAD', category: 'forex' },
  { symbol: 'AUDCHF', category: 'forex' },
  { symbol: 'AUDJPY', category: 'forex' },
  { symbol: 'AUDNZD', category: 'forex' },
  { symbol: 'CADCHF', category: 'forex' },
  { symbol: 'CADJPY', category: 'forex' },
  { symbol: 'CHFJPY', category: 'forex' },
  { symbol: 'EURAUD', category: 'forex' },
  { symbol: 'EURCAD', category: 'forex' },
  { symbol: 'EURNZD', category: 'forex' },
  { symbol: 'GBPAUD', category: 'forex' },
  { symbol: 'GBPCAD', category: 'forex' },
  { symbol: 'GBPCHF', category: 'forex' },
  { symbol: 'GBPNZD', category: 'forex' },
  { symbol: 'NZDCAD', category: 'forex' },
  { symbol: 'NZDJPY', category: 'forex' },
  // Exotic (AllTick supported)
  { symbol: 'USDCNH', category: 'forex' },
  { symbol: 'USDHKD', category: 'forex' },
  { symbol: 'USDSGD', category: 'forex' },
  { symbol: 'USDTHB', category: 'forex' },
  { symbol: 'USDKRW', category: 'forex' },
  // Metals (AllTick supported)
  { symbol: 'XAUUSD', category: 'metals' },
  { symbol: 'XAUEUR', category: 'metals' },
  { symbol: 'XAUAUD', category: 'metals' },
  { symbol: 'XAUCNH', category: 'metals' },
  { symbol: 'XAUSGD', category: 'metals' },
  { symbol: 'XAGEUR', category: 'metals' },
  { symbol: 'XAGSGD', category: 'metals' },
  // Crypto (AllTick supported - Popular)
  { symbol: 'BTCUSDT', category: 'crypto' },
  { symbol: 'ETHUSDT', category: 'crypto' },
  { symbol: 'BNBUSDT', category: 'crypto' },
  { symbol: 'SOLUSDT', category: 'crypto' },
  { symbol: 'XRPUSDT', category: 'crypto' },
  { symbol: 'DOGEUSDT', category: 'crypto' },
  { symbol: 'ADAUSDT', category: 'crypto' },
  { symbol: 'AVAXUSDT', category: 'crypto' },
  { symbol: 'DOTUSDT', category: 'crypto' },
  { symbol: 'LINKUSDT', category: 'crypto' },
  { symbol: 'LTCUSDT', category: 'crypto' },
  { symbol: 'MATICUSDT', category: 'crypto' },
  { symbol: 'SHIBUSDT', category: 'crypto' },
  { symbol: 'TRXUSDT', category: 'crypto' },
  { symbol: 'ATOMUSDT', category: 'crypto' },
  { symbol: 'UNIUSDT', category: 'crypto' },
  { symbol: 'NEARUSDT', category: 'crypto' },
  { symbol: 'APTUSDT', category: 'crypto' },
  { symbol: 'ARBUSDT', category: 'crypto' },
  { symbol: 'OPUSDT', category: 'crypto' },
  { symbol: 'INJUSDT', category: 'crypto' },
  { symbol: 'PEPEUSDT', category: 'crypto' },
  { symbol: 'SUIUSDT', category: 'crypto' },
  { symbol: 'TONUSDT', category: 'crypto' },
]

const MobileMarkets = ({ onSelect, selectedSymbol }) => {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [prices, setPrices] = useState({})

  useEffect(() => {
    const fetchPrices = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const res = await axios.get('/api/trades/prices', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.success) {
          setPrices(res.data.data)
        }
      } catch (err) {}
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 1000)
    return () => clearInterval(interval)
  }, [])

  const filters = ['all', 'forex', 'metals', 'crypto']

  const filtered = instruments.filter(inst => {
    const matchSearch = inst.symbol.toLowerCase().includes(search.toLowerCase())
    const matchFilter = activeFilter === 'all' || inst.category === activeFilter
    return matchSearch && matchFilter
  })

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#000000' }}>
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={16} color="#6b7280" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', color: '#fff' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-3 pb-3">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-3 py-1 rounded-lg text-xs capitalize"
            style={{ 
              backgroundColor: activeFilter === f ? '#22c55e' : '#0d0d0d',
              color: activeFilter === f ? '#000' : '#9ca3af'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(inst => {
          const price = prices[inst.symbol]
          return (
            <button
              key={inst.symbol}
              onClick={() => onSelect(inst.symbol)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ 
                backgroundColor: selectedSymbol === inst.symbol ? '#0d0d0d' : 'transparent',
                borderBottom: '1px solid #1a1a1a'
              }}
            >
              <div className="flex items-center gap-3">
                <Star size={14} color={selectedSymbol === inst.symbol ? '#fbbf24' : '#374151'} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: '#fff' }}>{inst.symbol}</p>
                  <p className="text-xs" style={{ color: '#22c55e' }}>+0.00%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: '#ef4444' }}>
                  {price?.bid?.toFixed(inst.symbol.includes('JPY') ? 3 : 5) || '-.--'}
                </p>
                <p className="text-sm" style={{ color: '#22c55e' }}>
                  {price?.ask?.toFixed(inst.symbol.includes('JPY') ? 3 : 5) || '-.--'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MobileMarkets
