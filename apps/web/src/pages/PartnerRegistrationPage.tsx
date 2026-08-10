import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { registerPartner } from '../api/client'

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];

export default function PartnerRegistrationPage() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    city: '',
    state: '',
    qualification: '',
    college: '',
    currentStatus: '',
    salesExperience: '',
    dailyTime: '',
    preferredMethod: '',
    password: '',
    confirmPassword: '',
    agreed: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }

  const validate = () => {
    if (!formData.fullName.trim()) return 'Full Name is required'
    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) return 'Please enter a valid 10-digit Indian mobile number'
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address'
    if (!formData.city.trim()) return 'City is required'
    if (!formData.state) return 'Please select your state'
    if (!formData.qualification) return 'Please select your highest qualification'
    if (!formData.currentStatus) return 'Please select your current status'
    if (!formData.salesExperience) return 'Please select your sales experience'
    if (!formData.dailyTime) return 'Please select your daily availability'
    if (!formData.preferredMethod) return 'Please select your preferred sales method'
    if (formData.password.length < 6) return 'Password must be at least 6 characters long'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
    if (!formData.agreed) return 'You must agree to the Terms & Conditions'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setLoading(true)
    setError('')

    try {
      await registerPartner({
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber,
        email: formData.email.trim(),
        city: formData.city.trim(),
        state: formData.state,
        qualification: formData.qualification,
        college: formData.college.trim(),
        currentStatus: formData.currentStatus,
        salesExperience: formData.salesExperience,
        dailyTime: formData.dailyTime,
        preferredMethod: formData.preferredMethod,
        password: formData.password
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/partner/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-poppins text-dd-navy">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-dd-muted text-[15px] mb-6 leading-relaxed">
            Welcome to DishDekho Partner Program! Your partner account has been created successfully.
          </p>
          <div className="flex items-center justify-center gap-2 text-dd-orange font-medium">
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-poppins text-dd-navy py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-dd-muted hover:text-dd-orange font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#0F2747] p-8 sm:p-10 text-white text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Become a Partner</h1>
            <p className="text-[#94A3B8] text-sm sm:text-[15px] leading-relaxed max-w-lg mx-auto">
              Join the DishDekho Partner Program. Earn ₹150 per successful onboarding + ₹100 recurring commission every month.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-12">
            
            {/* SECTION 1 */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-2">
                <h2 className="text-[11px] font-bold text-dd-orange uppercase tracking-[0.2em]">Step 1: Personal Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Name *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="Enter your full name" disabled={loading} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mobile Number *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+91</span>
                      <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} maxLength={10} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="10-digit number" disabled={loading} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="you@example.com" disabled={loading} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="Your city" disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">State *</label>
                    <select name="state" value={formData.state} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                      <option value="">Select State</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-2">
                <h2 className="text-[11px] font-bold text-dd-orange uppercase tracking-[0.2em]">Step 2: Education & Background</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Highest Qualification *</label>
                    <select name="qualification" value={formData.qualification} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                      <option value="">Select Qualification</option>
                      <option value="12th Pass">12th Pass</option>
                      <option value="BBA">BBA</option>
                      <option value="B.Com">B.Com</option>
                      <option value="B.A.">B.A.</option>
                      <option value="BMS">BMS</option>
                      <option value="Hotel Management">Hotel Management</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">College / University <span className="lowercase text-gray-400 normal-case tracking-normal font-normal">(Optional)</span></label>
                    <input type="text" name="college" value={formData.college} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="E.g. Delhi University" disabled={loading} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Status *</label>
                    <select name="currentStatus" value={formData.currentStatus} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                      <option value="">Select Status</option>
                      <option value="Student">Student</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Working">Working Professional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sales Experience *</label>
                    <select name="salesExperience" value={formData.salesExperience} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                      <option value="">Select Experience</option>
                      <option value="Fresher">Fresher</option>
                      <option value="Less than 1 Year">Less than 1 Year</option>
                      <option value="1-2 Years">1–2 Years</option>
                      <option value="2+ Years">2+ Years</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3 */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-2">
                <h2 className="text-[11px] font-bold text-dd-orange uppercase tracking-[0.2em]">Step 3: Partner Preferences</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Daily Availability *</label>
                  <select name="dailyTime" value={formData.dailyTime} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                    <option value="">Select Time</option>
                    <option value="1-2 Hours">1–2 Hours</option>
                    <option value="2-4 Hours">2–4 Hours</option>
                    <option value="4-6 Hours">4–6 Hours</option>
                    <option value="6+ Hours">6+ Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preferred Sales Method *</label>
                  <select name="preferredMethod" value={formData.preferredMethod} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all appearance-none" disabled={loading}>
                    <option value="">Select Method</option>
                    <option value="Restaurant Visit">Restaurant Visit (Field Sales)</option>
                    <option value="Phone / WhatsApp">Phone / WhatsApp (Telesales)</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4 */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-2">
                <h2 className="text-[11px] font-bold text-dd-orange uppercase tracking-[0.2em]">Step 4: Create Account</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Create Password *</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="Min. 6 characters" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirm Password *</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-[15px] focus:ring-2 focus:ring-dd-orange focus:border-transparent outline-none transition-all" placeholder="Confirm password" disabled={loading} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 mt-4">
                <input type="checkbox" id="agreed" name="agreed" checked={formData.agreed} onChange={handleChange} className="mt-1 w-4 h-4 text-dd-orange rounded border-gray-300 focus:ring-dd-orange" disabled={loading} />
                <label htmlFor="agreed" className="text-sm text-gray-600 leading-relaxed cursor-pointer select-none">
                  I agree to the <a href="/terms" target="_blank" className="text-dd-navy font-semibold hover:underline">Partner Terms & Conditions</a> and Commission Policy.
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-xl text-[15px] font-bold text-white transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-dd-orange hover:bg-[#e66000] shadow-md shadow-dd-orange/20 active:scale-[0.98]'}`}
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'Creating Account...' : 'Create Partner Account'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}
