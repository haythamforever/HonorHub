import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Check, User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Button, Input } from '../components/UI'
import { resetAuthRedirect, authAPI } from '../services/api'
import toast from 'react-hot-toast'
import logoImg from '../assets/logo.png'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [signupAllowed, setSignupAllowed] = useState(false)
  const [checkingSignup, setCheckingSignup] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    department: ''
  })
  
  const navigate = useNavigate()
  const { login, register, isAuthenticated } = useAuthStore()

  useEffect(() => {
    resetAuthRedirect()
    
    if (isAuthenticated) {
      navigate('/')
    }
    
    // Check if signup is allowed (only when no users exist)
    authAPI.checkSignupAllowed()
      .then(res => {
        setSignupAllowed(res.data.allowed)
        // If signup is allowed (no users), default to signup view
        if (res.data.allowed) {
          setIsLogin(false)
        }
      })
      .catch(() => {
        setSignupAllowed(false)
      })
      .finally(() => {
        setCheckingSignup(false)
      })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        toast.success('Welcome back!')
      } else {
        await register(formData)
        toast.success('Account created successfully!')
      }
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Beautiful certificate templates',
    'Configurable performance tiers',
    'Bulk certificate sending',
    'Email delivery with attachments'
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" 
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, #F7941D 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        
        {/* Accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#F7941D] to-[#00B8E6]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 lg:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-lg text-center"
          >
            {/* Logo */}
            <motion.img 
              src={logoImg} 
              alt="HonorHub" 
              className="w-80 h-auto object-contain mx-auto mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            />
            
            {/* Tagline */}
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight text-gray-800">
              Recognize and celebrate<br />
              <span className="text-[#F7941D]">your top performers</span>
            </h2>
            
            <p className="text-gray-600 text-lg mb-10 max-w-md mx-auto">
              Create beautiful appreciation certificates, manage performance tiers, and send recognition with just a few clicks.
            </p>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-4 text-left">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3 text-gray-700"
                >
                  <div className="w-6 h-6 rounded-full bg-[#00B8E6]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#00B8E6]" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Bottom decoration */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-8 h-px bg-gray-300" />
            <span>Powered by Integrant</span>
            <div className="w-8 h-px bg-gray-300" />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src={logoImg} 
              alt="HonorHub" 
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Welcome back!' : signupAllowed ? 'Create Admin Account' : 'Create account'}
              </h2>
              <p className="text-gray-500">
                {isLogin 
                  ? 'Enter your credentials to access your account' 
                  : signupAllowed 
                    ? 'Set up the first admin account to get started'
                    : 'Fill in your details to get started'}
              </p>
            </div>

            {/* First-time setup notice */}
            {!isLogin && signupAllowed && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#00B8E6]/10 to-[#F7941D]/10 border border-[#00B8E6]/20">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#00B8E6] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">First-time Setup</p>
                    <p className="text-xs text-gray-600 mt-1">
                      This account will have administrator privileges.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Department"
                    type="text"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </>
              )}
              
              <div className="relative">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Mail className="absolute right-3 top-9 w-5 h-5 text-gray-400" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <Lock className="absolute right-3 top-9 w-5 h-5 text-gray-400" />
              </div>

              <Button 
                type="submit" 
                loading={loading}
                className="w-full mt-6"
              >
                {isLogin ? 'Sign In' : signupAllowed ? 'Create Admin Account' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Only show toggle if signup is allowed (first-time setup) */}
            {signupAllowed && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-gray-500 hover:text-[#00B8E6] transition-colors"
                >
                  {isLogin 
                    ? "First time? Create admin account" 
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            )}

            {/* Info about user management for logged-out users */}
            {!signupAllowed && isLogin && !checkingSignup && (
              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Need an account? Contact your administrator.
                </p>
              </div>
            )}
          </div>
          
          {/* Mobile footer */}
          <p className="lg:hidden text-center text-white/50 text-sm mt-6">
            Powered by Integrant
          </p>
        </motion.div>
      </div>
    </div>
  )
}
