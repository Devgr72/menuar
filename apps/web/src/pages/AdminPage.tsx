import { useState } from 'react'
import { useClerk } from '@clerk/react'
import { useAdminStats, useAdminRestaurants } from '../hooks/useAdmin'
import AdminSlotDetail from '../components/admin/AdminSlotDetail'
import type { AdminRestaurant } from '@menuar/types'

type Tab = 'dashboard' | 'restaurants'
type Filter = 'all' | 'paid' | 'lead'

interface DetailView {
  restaurantId: string
  restaurantName: string
}

export default function AdminPage() {
  const { signOut } = useClerk()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [filter, setFilter] = useState<Filter>('all')
  const [detail, setDetail] = useState<DetailView | null>(null)
  const { stats, loading: statsLoading } = useAdminStats()
  const { restaurants, total, loading: restaurantsLoading } = useAdminRestaurants(filter)

  if (detail) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="border-b border-gray-800 px-6 py-4">
          <h1 className="text-lg font-bold text-orange-500">MenuAR Admin</h1>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-6">
          <AdminSlotDetail
            restaurantId={detail.restaurantId}
            restaurantName={detail.restaurantName}
            onBack={() => setDetail(null)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-orange-500">MenuAR Admin</h1>
        <button
          onClick={() => signOut()}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-6">
          {(['dashboard', 'restaurants'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Registered', value: stats?.totalRegistered, color: 'text-white' },
                { label: 'Paid', value: stats?.totalPaid, color: 'text-green-400' },
                { label: 'Leads', value: stats?.leads, color: 'text-yellow-400' },
                { label: 'QR Scans', value: stats?.totalQrScans, color: 'text-blue-400' },
              ].map((card) => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-gray-500 text-xs mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {statsLoading ? '—' : (card.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">
                Switch to the <button onClick={() => setTab('restaurants')} className="text-orange-500 underline">Restaurants tab</button> to manage dish slots and upload GLB files.
              </p>
            </div>
          </div>
        )}

        {tab === 'restaurants' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'paid', 'lead'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
              <span className="text-gray-600 text-xs self-center ml-auto">{total} total</span>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {restaurantsLoading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : restaurants.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">No restaurants found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Restaurant</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs hidden sm:table-cell">Owner</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">Status</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs">Slots</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((r: AdminRestaurant) => (
                      <tr key={r.restaurant.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{r.restaurant.name}</div>
                          <div className="text-gray-600 text-xs">{r.restaurant.scanCount} scans</div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="text-gray-300 text-xs">{r.owner?.ownerName ?? '—'}</div>
                          <div className="text-gray-600 text-xs">{r.owner?.email ?? ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${
                            r.subscription?.status === 'active' ? 'text-green-400' :
                            r.subscription?.status === 'halted' ? 'text-red-400' :
                            r.subscription ? 'text-yellow-400' : 'text-gray-500'
                          }`}>
                            {r.subscription?.status ?? 'no payment'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-white text-xs">{r.slotsReady} live</div>
                          <div className="text-gray-500 text-xs">{r.slotsWithPhotos} pending</div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDetail({ restaurantId: r.restaurant.id, restaurantName: r.restaurant.name })}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                          >
                            View slots
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
