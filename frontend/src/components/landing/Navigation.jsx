import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Globe } from 'lucide-react'

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-colors duration-300 h-[64px] flex items-center ${
        isScrolled ? 'bg-[#110E08] border-b border-[#2A2620]' : 'bg-transparent'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[1440px] mx-auto px-[24px] lg:px-[60px] flex items-center justify-between">
        {/* Left Section: Logo & Main Nav */}
        <div className="flex items-center gap-[34px]">
          <Link to="/" className="flex items-center" aria-label="NalmiFx Logo">
            <img
              src="/NalmiFx-logo.png"
              alt="NalmiFx Logo"
              className="h-[90px] w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center gap-[24px]">
            <button className="flex items-center gap-[4px] text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium py-2">
              What We Offer <ChevronDown size={16} />
            </button>
            <a
              href="#"
              className="text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium py-2"
            >
              Support
            </a>
          </div>
        </div>

        {/* Right Section: Language, Log in, Sign up */}
        <div className="flex items-center gap-[12px] md:gap-[24px]">
          <button className="flex items-center gap-[6px] text-white hover:text-[#CFF12F] transition-colors text-[14px] font-medium">
            <Globe size={18} />
            <span className="hidden sm:inline">EN</span>
            <ChevronDown size={14} className="hidden sm:inline" />
          </button>

          <Link
            to="/login"
            className="text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium hidden sm:block"
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="bg-[#CFF12F] text-black px-[20px] py-[10px] rounded-[24px] text-[16px] font-bold hover:brightness-110 transition-all whitespace-nowrap"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
