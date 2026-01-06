import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const TradingChart = ({ symbol }) => {
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const { isDark } = useTheme()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Map symbols to TradingView format
  const getSymbol = (sym) => {
    const symbolMap = {
      // Major Forex
      'EURUSD': 'FX:EURUSD',
      'GBPUSD': 'FX:GBPUSD',
      'USDJPY': 'FX:USDJPY',
      'USDCHF': 'FX:USDCHF',
      'AUDUSD': 'FX:AUDUSD',
      'NZDUSD': 'FX:NZDUSD',
      'USDCAD': 'FX:USDCAD',
      // Cross pairs
      'EURGBP': 'FX:EURGBP',
      'EURJPY': 'FX:EURJPY',
      'EURCHF': 'FX:EURCHF',
      'GBPJPY': 'FX:GBPJPY',
      'AUDCAD': 'FX:AUDCAD',
      'AUDCHF': 'FX:AUDCHF',
      'AUDJPY': 'FX:AUDJPY',
      'AUDNZD': 'FX:AUDNZD',
      'CADCHF': 'FX:CADCHF',
      'CADJPY': 'FX:CADJPY',
      'CHFJPY': 'FX:CHFJPY',
      'EURAUD': 'FX:EURAUD',
      'EURCAD': 'FX:EURCAD',
      'EURNZD': 'FX:EURNZD',
      'GBPAUD': 'FX:GBPAUD',
      'GBPCAD': 'FX:GBPCAD',
      'GBPCHF': 'FX:GBPCHF',
      'GBPNZD': 'FX:GBPNZD',
      'NZDCAD': 'FX:NZDCAD',
      'NZDCHF': 'FX:NZDCHF',
      'NZDJPY': 'FX:NZDJPY',
      // Exotic pairs
      'USDCNH': 'FX:USDCNH',
      'USDHKD': 'FX:USDHKD',
      'USDSGD': 'FX:USDSGD',
      'USDTHB': 'FX:USDTHB',
      'USDKRW': 'FX:USDKRW',
      'EURKRW': 'FX:EURKRW',
      'JPYKRW': 'FX:JPYKRW',
      'CNYKRW': 'FX:CNYKRW',
      'GBPKRW': 'FX:GBPKRW',
      // Metals
      'XAUUSD': 'TVC:GOLD',
      'XAGUSD': 'TVC:SILVER',
      'XAUUSDT': 'TVC:GOLD',
      'XAGUSDT': 'TVC:SILVER',
      'XAUEUR': 'FX:XAUEUR',
      'XAUTHB': 'TVC:GOLD',
      // Indices
      'US30': 'TVC:DJI',
      'US500': 'TVC:SPX',
      'US100': 'NASDAQ:NDX',
      'DE30': 'XETR:DAX',
      'UK100': 'TVC:UKX',
      'JP225': 'TVC:NI225',
      // Crypto (USD format)
      'BTCUSD': 'BINANCE:BTCUSDT',
      'ETHUSD': 'BINANCE:ETHUSDT',
      'LTCUSD': 'BINANCE:LTCUSDT',
      'XRPUSD': 'BINANCE:XRPUSDT',
      // Crypto (USDT format - AllTick)
      'BTCUSDT': 'BINANCE:BTCUSDT',
      'ETHUSDT': 'BINANCE:ETHUSDT',
      'BNBUSDT': 'BINANCE:BNBUSDT',
      'SOLUSDT': 'BINANCE:SOLUSDT',
      'XRPUSDT': 'BINANCE:XRPUSDT',
      'DOGEUSDT': 'BINANCE:DOGEUSDT',
      'ADAUSDT': 'BINANCE:ADAUSDT',
      'AVAXUSDT': 'BINANCE:AVAXUSDT',
      'DOTUSDT': 'BINANCE:DOTUSDT',
      'LINKUSDT': 'BINANCE:LINKUSDT',
      'LTCUSDT': 'BINANCE:LTCUSDT',
      'SHIBUSDT': 'BINANCE:SHIBUSDT',
      'TRXUSDT': 'BINANCE:TRXUSDT',
      'ATOMUSDT': 'BINANCE:ATOMUSDT',
      'UNIUSDT': 'BINANCE:UNIUSDT',
      'NEARUSDT': 'BINANCE:NEARUSDT',
      'APTUSDT': 'BINANCE:APTUSDT',
      'ARBUSDT': 'BINANCE:ARBUSDT',
      'OPUSDT': 'BINANCE:OPUSDT',
      'INJUSDT': 'BINANCE:INJUSDT',
      'PEPEUSDT': 'BINANCE:PEPEUSDT',
      'SUIUSDT': 'BINANCE:SUIUSDT',
      'TONUSDT': 'OKX:TONUSDT',
      'BONKUSDT': 'BINANCE:BONKUSDT',
      'FLOKIUSDT': 'BINANCE:FLOKIUSDT',
      'XLMUSDT': 'BINANCE:XLMUSDT',
      // Energy
      'USOIL': 'TVC:USOIL',
      'UKOIL': 'TVC:UKOIL',
      'XNGUSD': 'TVC:NATURALGAS',
      // US Stocks
      'AAPL.US': 'NASDAQ:AAPL',
      'MSFT.US': 'NASDAQ:MSFT',
      'GOOGL.US': 'NASDAQ:GOOGL',
      'GOOG.US': 'NASDAQ:GOOG',
      'AMZN.US': 'NASDAQ:AMZN',
      'TSLA.US': 'NASDAQ:TSLA',
      'NVDA.US': 'NASDAQ:NVDA',
      'META.US': 'NASDAQ:META',
      'NFLX.US': 'NASDAQ:NFLX',
      'AMD.US': 'NASDAQ:AMD',
      'INTC.US': 'NASDAQ:INTC',
      'PYPL.US': 'NASDAQ:PYPL',
      'COIN.US': 'NASDAQ:COIN',
      'UBER.US': 'NYSE:UBER',
      'ABNB.US': 'NASDAQ:ABNB',
      'SQ.US': 'NYSE:SQ',
      'JPM.US': 'NYSE:JPM',
      'V.US': 'NYSE:V',
      'MA.US': 'NYSE:MA',
      'HD.US': 'NYSE:HD',
      'KO.US': 'NYSE:KO',
      'PEP.US': 'NASDAQ:PEP',
      'DIS.US': 'NYSE:DIS',
      'NKE.US': 'NYSE:NKE',
      'BA.US': 'NYSE:BA',
      'SBUX.US': 'NASDAQ:SBUX',
    }
    
    // Check direct mapping first
    if (symbolMap[sym]) {
      return symbolMap[sym]
    }
    
    // Handle US stocks with .US suffix
    if (sym.endsWith('.US')) {
      const ticker = sym.replace('.US', '')
      return `NASDAQ:${ticker}`
    }
    
    // Default to FX for forex pairs
    return `FX:${sym}`
  }

  // Handle resize for responsive chart
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    // Also observe container size changes
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    
    // Clear previous chart with a small delay to avoid race conditions
    const timeoutId = setTimeout(() => {
      container.innerHTML = ''

      // Use TradingView Advanced Chart embed widget
      const widgetContainer = document.createElement('div')
      widgetContainer.className = 'tradingview-widget-container'
      widgetContainer.style.cssText = 'height:100%;width:100%'
      
      const widgetDiv = document.createElement('div')
      widgetDiv.className = 'tradingview-widget-container__widget'
      widgetDiv.style.cssText = 'height:100%;width:100%'
      widgetContainer.appendChild(widgetDiv)
      
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.async = true
      script.type = 'text/javascript'
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: getSymbol(symbol),
        interval: "5",
        timezone: "Etc/UTC",
        theme: isDark ? "dark" : "light",
        style: "1",
        locale: "en",
        allow_symbol_change: false,
        calendar: false,
        hide_top_toolbar: false,
        hide_legend: true,
        save_image: false,
        hide_side_toolbar: false,
        withdateranges: false,
        details: false,
        hotlist: false,
        support_host: "https://www.tradingview.com"
      })
      
      widgetContainer.appendChild(script)
      container.appendChild(widgetContainer)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      container.innerHTML = ''
    }
  }, [symbol, isDark])

  return (
    <div 
      ref={containerRef}
      className="w-full h-full"
      style={{ 
        backgroundColor: isDark ? '#000000' : '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1
      }}
    />
  )
}

export default TradingChart
