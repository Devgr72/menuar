import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPartnerProfile } from '../api/client';
import { ArrowLeft, User, Phone, Mail, MapPin, Briefcase, GraduationCap, Clock, MessageCircle } from 'lucide-react';
import NotificationBell from '../components/dashboard/NotificationBell';

export default function PartnerProfilePage() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProfile = async () => {
      try {
        const res = await getPartnerProfile();
        setPartner(res.partner);
      } catch (err) {
        navigate('/partner/login');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-dd-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-poppins text-dd-navy flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-lg">My Profile</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Top Profile Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border-4 border-white shadow-md text-dd-orange z-10">
            <User className="w-10 h-10" />
          </div>
          <div className="z-10">
            <h1 className="text-3xl font-bold text-gray-900">{partner?.fullName}</h1>
            <p className="text-dd-orange font-semibold mt-1">Partner ID: {partner?.partnerId}</p>
            <div className="mt-4 inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
              {partner?.status}
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-bl from-orange-50 to-transparent rounded-full opacity-50 pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile Number</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.mobileNumber}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.city}, {partner?.state}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4">Professional Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qualification</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.qualification}</p>
                  {partner?.college && <p className="text-sm text-gray-500 mt-0.5">{partner.college}</p>}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Experience & Status</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.currentStatus}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Sales Exp: {partner?.salesExperience}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commitment</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1">{partner?.dailyTime}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferred Method</p>
                  <p className="text-[15px] font-medium text-gray-900 mt-1 capitalize">{partner?.preferredMethod}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-gray-400">Joined on {new Date(partner?.createdAt).toLocaleDateString()}</p>
        </div>

      </main>
    </div>
  );
}
