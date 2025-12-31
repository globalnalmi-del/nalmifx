import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Loader2, Mail, RefreshCw } from 'lucide-react'
import axios from 'axios'

const VerifyOTP = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const inputRefs = useRef([])

  useEffect(() => {
    // Redirect if no email
    if (!email) {
      navigate('/signup')
    }
    // Focus first input
    inputRefs.current[0]?.focus()
  }, [email, navigate])

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take last character
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const res = await axios.post('/api/auth/verify-otp', {
        email,
        otp: otpCode
      })

      if (res.data.success) {
        setSuccess(true)
        // Store token and user data
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        
        // Redirect to home after short delay
        setTimeout(() => {
          navigate('/home')
        }, 2000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.')
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setResending(true)
      setError('')
      
      const res = await axios.post('/api/auth/resend-otp', { email })
      
      if (res.data.success) {
        setCountdown(60) // 60 second cooldown
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/NalmiFx-logo.png" alt="NalmiFx" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-white tracking-wide">NalmiFx</span>
          </div>

          <div 
            className="rounded-2xl p-8"
            style={{ backgroundColor: '#111118', border: '1px solid #2a2a3e' }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
            <p className="text-gray-400 mb-6">Your account has been successfully verified.</p>
            <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/NalmiFx-logo.png" alt="NalmiFx" className="h-10 w-auto" />
          <span className="text-2xl font-bold text-white tracking-wide">NalmiFx</span>
        </div>

        {/* Card */}
        <div 
          className="rounded-2xl p-8"
          style={{ backgroundColor: '#111118', border: '1px solid #2a2a3e' }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Mail size={32} className="text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
            <p className="text-gray-400 text-sm">
              We've sent a 6-digit code to
            </p>
            <p className="text-purple-400 font-medium">{email}</p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  border: error ? '2px solid #ef4444' : '2px solid #2a2a3e', 
                  color: '#ffffff' 
                }}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || otp.some(d => d === '')}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Didn't receive the code?</p>
            {countdown > 0 ? (
              <p className="text-gray-400 text-sm">
                Resend code in <span className="text-purple-400 font-medium">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Resend Code
                  </>
                )}
              </button>
            )}
          </div>

          {/* Timer Info */}
          <p className="mt-6 text-center text-gray-500 text-xs">
            Code expires in 10 minutes
          </p>
        </div>

        {/* Back to Login */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Wrong email?{' '}
          <button 
            onClick={() => navigate('/signup')}
            className="text-purple-400 hover:underline"
          >
            Go back
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerifyOTP
