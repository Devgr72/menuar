import { useState, useEffect, useCallback } from 'react';
import { 
  getPartnerDetails, 
  getPartnerRestaurants, 
  getPartnerCommissions, 
  getPartnerPayouts,
  updatePartnerStatus,
  createPartnerPayout
} from '../api/client';

export default function AdminPartnerDetail({ partnerId, token, onBack }: { partnerId: string, token: string, onBack: () => void }) {
  const [tab, setTab] = useState<'overview' | 'restaurants' | 'commissions' | 'payouts'>('overview');
  
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [det, rest, comm, pay] = await Promise.all([
        getPartnerDetails(token, partnerId),
        getPartnerRestaurants(token, partnerId),
        getPartnerCommissions(token, partnerId),
        getPartnerPayouts(token, partnerId)
      ]);
      setPartner(det.partner);
      setStats(det.stats);
      setRestaurants(rest.data);
      setCommissions(comm.data);
      setPayouts(pay.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
    try {
      await updatePartnerStatus(token, partnerId, newStatus);
      fetchAll();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const processPayout = async () => {
    if (!stats || stats.pendingEarnings <= 0) {
      alert('No pending earnings to payout.');
      return;
    }
    const pendingComms = commissions.filter(c => c.status === 'PENDING').map(c => c.id);
    const amount = stats.pendingEarnings;
    
    const ref = prompt(`Process payout for ₹${amount}. Enter reference ID (optional):`);
    if (ref === null) return;

    try {
      await createPartnerPayout(token, partnerId, { amount, commissionIds: pendingComms, referenceId: ref });
      alert('Payout processed successfully');
      fetchAll();
    } catch (err) {
      alert('Failed to process payout');
    }
  };

  if (loading || !partner) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-bold p-2">
          ← Back
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{partner.fullName}</h2>
          <p className="text-sm text-gray-500">{partner.partnerId}</p>
        </div>
        <div className="ml-auto flex gap-2 items-center">
          <select 
            value={partner.status} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none font-semibold"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
          {stats.pendingEarnings > 0 && (
            <button 
              onClick={processPayout}
              className="bg-green-600 text-white hover:bg-green-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Process Payout (₹{stats.pendingEarnings.toLocaleString('en-IN')})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Rests', val: stats.activeRestaurants, color: 'text-blue-600' },
          { label: 'Total Earnings', val: `₹${stats.totalEarnings.toLocaleString('en-IN')}`, color: 'text-green-600' },
          { label: 'Pending Payout', val: `₹${stats.pendingEarnings.toLocaleString('en-IN')}`, color: 'text-orange-600' },
          { label: 'Paid Out', val: `₹${stats.paidEarnings.toLocaleString('en-IN')}`, color: 'text-gray-800' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border-b border-gray-200 px-6 shadow-sm flex gap-6 mt-6 rounded-t-xl overflow-hidden">
        {(['overview', 'restaurants', 'commissions', 'payouts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${
              tab === t ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-b-xl overflow-hidden">
        
        {tab === 'overview' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Profile Information</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex"><dt className="w-32 text-gray-500">Name</dt><dd className="font-medium text-gray-900">{partner.fullName}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Mobile</dt><dd className="font-medium text-gray-900">{partner.mobileNumber}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Email</dt><dd className="font-medium text-gray-900">{partner.email}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Location</dt><dd className="font-medium text-gray-900">{partner.city}, {partner.state}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Joined</dt><dd className="font-medium text-gray-900">{new Date(partner.createdAt).toLocaleDateString()}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Experience</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex"><dt className="w-32 text-gray-500">Qualification</dt><dd className="font-medium text-gray-900">{partner.qualification}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">College</dt><dd className="font-medium text-gray-900">{partner.college || 'N/A'}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Status</dt><dd className="font-medium text-gray-900">{partner.currentStatus}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Sales Exp.</dt><dd className="font-medium text-gray-900">{partner.salesExperience}</dd></div>
                <div className="flex"><dt className="w-32 text-gray-500">Availability</dt><dd className="font-medium text-gray-900">{partner.dailyTime}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {tab === 'restaurants' && (
          <div className="overflow-x-auto">
            {restaurants.length === 0 ? (
              <div className="p-12 text-center text-gray-500">This partner has not onboarded any restaurants yet.</div>
            ) : (
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Restaurant</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Status</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {restaurants.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-bold text-gray-900">{r.name}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${
                          r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'commissions' && (
          <div className="overflow-x-auto">
            {commissions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No commission earnings yet.</div>
            ) : (
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Date</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Restaurant</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Type</th>
                    <th className="text-right px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Amount</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-gray-900">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="px-5 py-4 font-bold text-gray-900">{c.restaurantName}</td>
                      <td className="px-5 py-4 text-gray-600">{c.type}</td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">₹{c.amount}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${
                          c.status === 'PAID' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="overflow-x-auto">
            {payouts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No payouts available.</div>
            ) : (
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Date</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Reference</th>
                    <th className="text-right px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Amount</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-gray-900">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-gray-500">{p.referenceId || '-'}</td>
                      <td className="px-5 py-4 text-right font-bold text-gray-900">₹{p.amount}</td>
                      <td className="px-5 py-4 text-green-600 font-bold">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
