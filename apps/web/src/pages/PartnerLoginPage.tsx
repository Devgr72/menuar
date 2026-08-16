import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { loginPartner } from '../api/client'

export default function PartnerLoginPage() {
  const navigate = useNavigate()
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [formData, setFormData] = useState({
    emailOrMobile: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.emailOrMobile.trim() || !formData.password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const res = await loginPartner(formData.emailOrMobile.trim(), formData.password.trim())
      if (res.ok) {
        localStorage.setItem('partnerId', res.partnerId)
        navigate('/partner/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-poppins text-dd-navy">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-dd-muted hover:text-dd-orange font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Partner Login</h1>
            <p className="text-gray-500 text-sm">Welcome back to DishDekho Partner Program</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email or Mobile Number</label>
              <input 
                type="text" 
                name="emailOrMobile" 
                value={formData.emailOrMobile} 
                onChange={handleChange} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" 
                placeholder="Enter email or 10-digit number" 
                disabled={loading} 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" 
                  placeholder="Enter your password" 
                  disabled={loading} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none" 
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-2 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-dd-orange hover:bg-[#e66000] shadow-md shadow-dd-orange/20 active:scale-[0.98]'}`}
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Logging in...' : 'Login securely'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            Don't have a partner account?{' '}
            <Link to="/partner/join" className="text-dd-orange font-bold hover:underline">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
