import { useState, useEffect, useCallback } from 'react';
import { getPartners } from '../api/client';
import AdminPartnerDetail from './AdminPartnerDetail';

export default function AdminPartners({ token }: { token: string }) {
  const [partners, setPartners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const fetchPartners = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getPartners({ page: p, limit: 20, search, status });
      if (res.data) {
        setPartners(res.data);
        setTotal(res.total);
        setPage(res.page);
      }
    } catch (err) {
      console.error('Failed to fetch partners', err);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchPartners(1);
  }, [fetchPartners]);

  if (selectedPartnerId) {
    return (
      <AdminPartnerDetail 
        partnerId={selectedPartnerId} 
        onBack={() => setSelectedPartnerId(null)} 
      />
    );
  }

  const exportCSV = () => {
    if (!partners.length) return;
    const headers = ['Partner ID', 'Name', 'Mobile', 'Email', 'City', 'Status', 'Total Restaurants', 'Active Restaurants', 'Total Earnings'];
    const csvContent = [
      headers.join(','),
      ...partners.map(p => [
        p.partnerId, 
        `"${p.fullName}"`, 
        p.mobileNumber, 
        p.email, 
        `"${p.city}"`, 
        p.status, 
        p.totalRestaurants, 
        p.activeRestaurants, 
        p.totalEarnings
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'partners_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-4 w-full sm:w-auto flex-1">
          <input 
            type="text" 
            placeholder="Search by name, ID, mobile, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 sm:w-64 focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
        <button 
          onClick={exportCSV}
          className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No partners found.</div>
        ) : (
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Partner</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Location</th>
                <th className="text-center px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Restaurants</th>
                <th className="text-right px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Earnings</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-gray-900 font-bold">{p.fullName}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{p.partnerId}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-gray-800 font-medium">{p.mobileNumber}</div>
                    <div className="text-gray-500 text-xs">{p.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-gray-800 font-medium">{p.city}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="text-gray-900 font-bold">{p.activeRestaurants} active</div>
                    <div className="text-gray-500 text-xs">{p.totalRestaurants} total</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="text-green-600 font-bold">₹{p.totalEarnings.toLocaleString('en-IN')}</div>
                    <div className="text-gray-500 text-xs">₹{p.thisMonthEarnings.toLocaleString('en-IN')} this mo</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${
                      p.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                      p.status === 'Suspended' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedPartnerId(p.partnerId)}
                      className="bg-white border border-gray-300 hover:border-orange-600 hover:text-orange-600 text-gray-700 font-bold text-xs rounded-lg px-4 py-2 transition-all shadow-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPartners(page - 1)}
                disabled={page <= 1}
                className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchPartners(page + 1)}
                disabled={page * 20 >= total}
                className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
