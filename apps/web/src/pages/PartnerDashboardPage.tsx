import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NotificationBell from '../components/dashboard/NotificationBell';
import { getPartnerProfile, getPartnerDashboard } from '../api/client';
import { Copy, Check, Users, Store, IndianRupee, Clock, Wallet, ExternalLink, LogOut, User } from 'lucide-react';

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [profileRes, dashboardRes] = await Promise.all([
          getPartnerProfile(),
          getPartnerDashboard()
        ]);
        setPartner(profileRes.partner);
        setStats(dashboardRes.stats);
        setRestaurants(dashboardRes.restaurants);
        setCommissions(dashboardRes.commissions);
      } catch (err) {
        console.error(err);
        // If unauthenticated or token expired, redirect to login
        navigate('/partner/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, [navigate]);

  const handleCopy = () => {
    if (!partner) return;
    const url = `${window.location.origin}/sign-up?ref=${partner.partnerId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    // We should technically call POST /logout, but clearing cookies on client is fine for now
    fetch('/api/v1/partner/logout', { method: 'POST' }).finally(() => {
      localStorage.removeItem('partnerId');
      navigate('/partner/login');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-dd-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/sign-up?ref=${partner?.partnerId}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-poppins text-dd-navy flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-dd-navy rounded-lg flex items-center justify-center text-white font-bold text-sm">
            DD
          </div>
          <span className="font-bold text-lg hidden sm:block">Partner</span>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="h-8 w-8 rounded-full bg-orange-100 text-dd-orange flex items-center justify-center font-bold text-sm border border-orange-200 hover:bg-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {partner?.fullName?.charAt(0).toUpperCase()}
            </button>
            
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-50 mb-2">
                  <p className="font-bold text-sm text-gray-900 truncate">{partner?.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{partner?.email}</p>
                </div>
                
                <Link
                  to="/partner/profile"
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-dd-navy transition-colors flex items-center gap-2 font-medium"
                >
                  <User className="w-4 h-4" /> My Profile
                </Link>

                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Profile Card & Link */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border-2 border-orange-200 text-dd-orange">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{partner?.fullName}</h1>
              <p className="text-gray-500 text-sm font-medium flex items-center gap-2 mt-1">
                Partner ID: <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs tracking-wider">{partner?.partnerId}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-green-100 text-green-700 border border-green-200">
                  {partner?.status}
                </span>
              </p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Onboarding Link</p>
            <div className="flex items-center gap-2">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate max-w-[200px] sm:max-w-xs font-mono">
                {referralUrl}
              </div>
              <button 
                onClick={handleCopy}
                className="bg-dd-navy hover:bg-[#0a1a30] text-white p-2 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-dd-navy focus:ring-offset-1"
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Send this link to restaurants to earn commissions.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#0F2747] to-[#1a3860] p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-12 h-12" /></div>
            <p className="text-sm text-blue-200 font-medium mb-1">Total Earnings</p>
            <h3 className="text-3xl font-black">₹{stats?.totalEarnings?.toLocaleString('en-IN') || 0}</h3>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-dd-orange"><Clock className="w-12 h-12" /></div>
            <p className="text-sm text-gray-500 font-medium mb-1">Pending Payouts</p>
            <h3 className="text-3xl font-black text-dd-orange">₹{stats?.pendingEarnings?.toLocaleString('en-IN') || 0}</h3>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-green-600"><Check className="w-12 h-12" /></div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Paid</p>
            <h3 className="text-3xl font-black text-gray-900">₹{stats?.paidEarnings?.toLocaleString('en-IN') || 0}</h3>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600"><Store className="w-12 h-12" /></div>
            <p className="text-sm text-gray-500 font-medium mb-1">Restaurants Onboarded</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-black text-gray-900">{stats?.totalRestaurants || 0}</h3>
              <span className="text-sm text-green-600 font-medium mb-1.5">({stats?.activeRestaurants || 0} active)</span>
            </div>
          </div>
        </div>

        {/* Content Tabs area equivalent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Restaurants List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><Store className="w-5 h-5 text-gray-400" /> Restaurants Onboarded</h2>
            </div>
            
            <div className="p-0 flex-1 overflow-x-auto">
              {restaurants.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Store className="w-12 h-12 mb-3 text-gray-200" />
                  <p>You haven't onboarded any restaurants yet.</p>
                  <p className="text-sm mt-1">Share your link to get started!</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 text-left">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Restaurant</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined On</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {restaurants.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{r.name}</td>
                        <td className="px-6 py-4 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Commission History */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><IndianRupee className="w-5 h-5 text-gray-400" /> Commission History</h2>
            </div>
            
            <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
              {commissions.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <IndianRupee className="w-12 h-12 mb-3 text-gray-200" />
                  <p>No commissions earned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {commissions.map(c => (
                    <div key={c.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          c.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{c.restaurantName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{c.type.replace(/_/g, ' ')} • {new Date(c.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">+₹{c.amount}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                          c.status === 'PAID' ? 'text-green-600' : 'text-orange-500'
                        }`}>
                          {c.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
