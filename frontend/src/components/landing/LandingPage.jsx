import React from 'react'
import Navigation from './Navigation'
import HeroSection from './HeroSection'
import InvestStockTokens from './InvestStockTokens'
import CryptoPromo from './CryptoPromo'
import PerpetualFutures from './PerpetualFutures'
import SecurityTrust from './SecurityTrust'
import Footer from './Footer'

const LandingPage = () => {
  // Override the app's overflow:hidden for landing page
  React.useEffect(() => {
    document.body.style.overflow = 'auto'
    document.body.style.position = 'static'
    document.documentElement.style.overflow = 'auto'
    document.getElementById('root').style.overflow = 'auto'
    document.getElementById('root').style.position = 'static'
    document.getElementById('root').style.height = 'auto'
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.documentElement.style.overflow = ''
      document.getElementById('root').style.overflow = ''
      document.getElementById('root').style.position = ''
      document.getElementById('root').style.height = ''
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-[#110E08]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navigation />
      <main>
        <HeroSection />
        <InvestStockTokens />
        <CryptoPromo />
        <PerpetualFutures />
        <SecurityTrust />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
