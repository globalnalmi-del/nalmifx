import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react'
import axios from 'axios'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) {
      verifyEmail()
    } else {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
    }
  }, [token])

  const verifyEmail = async () => {
    try {
      const res = await axios.get(`/api/auth/verify-email/${token}`)
      if (res.data.success) {
        setStatus('success')
        setMessage(res.data.message || 'Email verified successfully!')
      } else {
        setStatus('error')
        setMessage(res.data.message || 'Verification failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.message || 'Verification failed. The link may have expired.')
    }
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
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: '#111118', border: '1px solid #2a2a3e' }}
        >
          {/* Verifying State */}
          {status === 'verifying' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Verifying Your Email</h1>
              <p className="text-gray-400">Please wait while we verify your email address...</p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-gray-400 mb-6">Your account is now fully activated. You can start trading!</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' }}
              >
                Continue to Login
                <ArrowRight className="w-5 h-5" />
              </Link>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Verification Failed</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' }}
                >
                  Go to Login
                </Link>
                <p className="text-sm text-gray-500">
                  Need a new verification link? Login and request a new one from your profile.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? <a href="mailto:support@NalmiFx.com" className="text-purple-400 hover:underline">Contact Support</a>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail
