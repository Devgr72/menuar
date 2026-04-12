"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAdminStats, useAdminRestaurants } from '../hooks/useAdmin'
import AdminSlotDetail from '../components/AdminSlotDetail'
import type { AdminRestaurant } from '@menuar/types'

type Tab = 'dashboard' | 'restaurants' | 'users' | 'transactions'
type Filter = 'all' | 'paid' | 'lead'

interface DetailView {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  qrUrl?: string
}

interface PaymentEvent {
  id: string
  eventType: string
  createdAt: string
  razorpayEventId: string
  subscription: {
    id: string
    status: string
    amount: number
    planType: string
    restaurant: { name: string; slug: string }
    owner: { ownerName: string; email: string } | null
  }
}

const getCustomToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null

function AdminPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Read tab from URL, default to dashboard
  const tabFromUrl = (searchParams.get('tab') as Tab) || 'dashboard'
  const [tab, setTab] = useState<Tab>(tabFromUrl)
  const [filter, setFilter] = useState<Filter>('all')
  const [detail, setDetail] = useState<DetailView | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('adminDetail')
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  // Transactions state
  const [transactions, setTransactions] = useState<PaymentEvent[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)

  const { stats, loading: statsLoading } = useAdminStats(token)
  const { restaurants, total, loading: restaurantsLoading } = useAdminRestaurants(token, filter)

  // On mount check token
  useEffect(() => {
    const saved = localStorage.getItem('adminToken')
    if (saved) setToken(saved)
  }, [])

  // Sync tab to URL without page reload
  const changeTab = useCallback((t: Tab) => {
    setTab(t)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Keep tab in sync with URL (e.g. browser back/forward)
  useEffect(() => {
    setTab(tabFromUrl)
  }, [tabFromUrl])

  // Persist detail view in sessionStorage so refresh keeps it
  useEffect(() => {
    if (detail) {
      sessionStorage.setItem('adminDetail', JSON.stringify(detail))
    } else {
      sessionStorage.removeItem('adminDetail')
    }
  }, [detail])

  // Fetch transactions
  const fetchTransactions = useCallback((page = 1) => {
    const t = getCustomToken()
    if (!t) return
    setTxLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/admin/events?page=${page}&limit=50`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(data => {
        setTransactions(data.events || [])
        setTxTotal(data.total || 0)
        setTxPage(page)
        setTxLoading(false)
      })
      .catch(() => setTxLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'transactions') fetchTransactions(1)
  }, [tab, fetchTransactions])

  function signOut() {
    localStorage.removeItem('adminToken')
    sessionStorage.removeItem('adminDetail')
    setToken(null)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to login')
      localStorage.setItem('adminToken', data.token)
      setToken(data.token)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    subscription_activated: { label: 'Activated', color: 'bg-green-100 text-green-700 border-green-200' },
    subscription_charged: { label: 'Charged', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    subscription_halted: { label: 'Halted', color: 'bg-red-100 text-red-700 border-red-200' },
    subscription_cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    subscription_completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    payment_failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200' },
  }

  // ── Login Screen ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-orange-600 px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">MenuAR Admin</h1>
            <p className="text-orange-100 text-sm">Sign in with your credentials</p>
          </div>
          <form className="p-6 space-y-4" onSubmit={handleLogin}>
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 font-medium">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-shadow"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg px-4 py-3 mt-2 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md"
            >
              {isLoggingIn ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Slot Detail View ─────────────────────────────────────────────────────────
  if (detail) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
          <h1 className="text-lg font-bold text-orange-600">MenuAR Admin</h1>
          <button
            onClick={signOut}
            className="text-gray-600 hover:text-red-600 text-sm font-medium border border-gray-200 px-4 py-1.5 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-6">
          <AdminSlotDetail
            restaurantId={detail.restaurantId}
            restaurantName={detail.restaurantName}
            restaurantSlug={detail.restaurantSlug}
            qrUrl={detail.qrUrl}
            onBack={() => setDetail(null)}
          />
        </main>
      </div>
    )
  }

  // ── Main Dashboard ───────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'restaurants', label: 'Restaurants' },
    { id: 'users', label: 'Users' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <h1 className="text-lg font-bold text-orange-600">MenuAR Admin</h1>
        <button
          onClick={signOut}
          className="text-gray-600 hover:text-red-600 text-sm font-medium border border-gray-200 px-4 py-1.5 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shadow-sm overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {[
                { label: 'Registered', value: stats?.totalRegistered, color: 'text-gray-800', bg: 'hover:border-gray-400', filter: 'all' as Filter, icon: '🏪' },
                { label: 'Paid', value: stats?.totalPaid, color: 'text-green-600', bg: 'hover:border-green-400', filter: 'paid' as Filter, icon: '✅' },
                { label: 'Leads', value: stats?.leads, color: 'text-yellow-600', bg: 'hover:border-yellow-400', filter: 'lead' as Filter, icon: '🎯' },
                { label: 'QR Scans', value: stats?.totalQrScans, color: 'text-blue-600', bg: 'hover:border-blue-400', filter: null, icon: '📱' },
              ].map((card) => (
                <button
                  key={card.label}
                  onClick={() => {
                    if (card.filter) {
                      setFilter(card.filter)
                      changeTab('restaurants')
                    }
                  }}
                  className={`bg-white border border-gray-200 shadow-sm rounded-2xl p-5 text-left w-full transition-all ${card.filter ? `cursor-pointer ${card.bg} hover:shadow-md hover:-translate-y-0.5` : 'cursor-default'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-500 font-medium text-xs uppercase tracking-wider">{card.label}</p>
                    <span className="text-base">{card.icon}</span>
                  </div>
                  <p className={`text-3xl font-black ${card.color}`}>
                    {statsLoading ? '—' : (card.value ?? 0)}
                  </p>
                  {card.filter && <p className="text-gray-400 text-[10px] mt-1.5 font-medium">Click to view →</p>}
                </button>
              ))}
            </div>
            <div className="bg-white border border-orange-100 shadow-sm rounded-xl p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-xl">💡</span>
              </div>
              <p className="text-gray-600 text-sm">
                Switch to{' '}
                <button onClick={() => changeTab('restaurants')} className="text-orange-600 font-bold hover:underline">Restaurants</button>
                {' '}to manage dish slots, or{' '}
                <button onClick={() => changeTab('transactions')} className="text-orange-600 font-bold hover:underline">Transactions</button>
                {' '}to see payment history.
              </p>
            </div>
          </div>
        )}

        {/* ── RESTAURANTS TAB ── */}
        {tab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex gap-2 pb-2">
              {(['all', 'paid', 'lead'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-4 py-2 rounded-lg font-bold transition-all capitalize border ${
                    filter === f
                      ? 'bg-orange-600 border-orange-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
              <span className="text-gray-500 text-xs self-center ml-auto font-medium px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">{total} items</span>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden overflow-x-auto">
              {restaurantsLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : restaurants.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No restaurants found</div>
              ) : (
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3.5 text-gray-600 font-bold text-xs uppercase tracking-wider">Restaurant</th>
                      <th className="text-left px-5 py-3.5 text-gray-600 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Owner</th>
                      <th className="text-left px-5 py-3.5 text-gray-600 font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-right px-5 py-3.5 text-gray-600 font-bold text-xs uppercase tracking-wider">Slots</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((r: AdminRestaurant) => (
                      <tr key={r.restaurant.id} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-gray-900 font-bold">{r.restaurant.name}</div>
                          <div className="text-gray-500 text-xs mt-0.5">Scans: {r.restaurant.scanCount}</div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <div className="text-gray-800 font-medium">{r.owner?.ownerName ?? '—'}</div>
                          <div className="text-gray-500 text-xs">{r.owner?.email ?? ''}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${
                            r.subscription?.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            r.subscription?.status === 'halted' ? 'bg-red-50 text-red-700 border-red-200' :
                            r.subscription ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {r.subscription?.status ?? 'No payment'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-gray-900 text-xs font-bold">{r.slotsReady} live</div>
                          <div className="text-gray-500 text-xs">{r.slotsWithPhotos} pending</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setDetail({ restaurantId: r.restaurant.id, restaurantName: r.restaurant.name, restaurantSlug: r.restaurant.slug, qrUrl: r.restaurant.qrUrl ?? undefined })}
                            className="bg-white border border-gray-300 hover:border-orange-600 hover:text-orange-600 text-gray-700 font-bold text-xs rounded-lg px-4 py-2 transition-all shadow-sm"
                          >
                            Manage Slots
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

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 font-bold text-sm uppercase tracking-wide">Registered Accounts</h2>
                <p className="text-gray-500 text-xs mt-1">All restaurant owners who signed up.</p>
              </div>
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                Total: {restaurants.length}
              </div>
            </div>
            {restaurantsLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : restaurants.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">No users found</div>
            ) : (
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Account</th>
                    <th className="text-left px-6 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Restaurant</th>
                    <th className="text-right px-6 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {restaurants.map((r: AdminRestaurant) => (
                    <tr key={r.restaurant.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {(r.owner?.ownerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-gray-900 font-bold">{r.owner?.ownerName || 'Unknown'}</div>
                            <div className="text-gray-500 text-xs">{r.owner?.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">Owner</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-800 font-bold">{r.restaurant.name}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">ID: ...{r.restaurant.id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border shadow-sm ${
                          r.subscription?.status === 'active' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}>
                          {r.subscription?.status === 'active' ? 'PRO' : 'FREE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div className="space-y-4">

            {/* Summary strip */}
            {!txLoading && transactions.length > 0 && (() => {
              const totalRevenue = transactions.reduce((sum, tx) => {
                if (tx.eventType === 'subscription_charged' || tx.eventType === 'subscription_activated') {
                  return sum + (tx.subscription?.amount || 0)
                }
                return sum
              }, 0)
              const charged = transactions.filter(tx => tx.eventType === 'subscription_charged').length
              const failed = transactions.filter(tx => tx.eventType === 'payment_failed').length
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-green-600">₹{(totalRevenue / 100).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Charges</p>
                    <p className="text-2xl font-black text-blue-600">{charged}</p>
                  </div>
                  <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Failed</p>
                    <p className="text-2xl font-black text-red-500">{failed}</p>
                  </div>
                </div>
              )
            })()}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 font-bold">Transaction History</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {txTotal > 0 ? `${txTotal} total events from Razorpay subscriptions` : 'All payment events from Razorpay subscriptions'}
                </p>
              </div>
              <button
                onClick={() => fetchTransactions(txPage)}
                className="text-xs font-bold px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
              {txLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-500 text-sm mt-3">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                    <span className="text-3xl">💳</span>
                  </div>
                  <span className="text-gray-600 font-semibold">No transactions yet</span>
                  <span className="text-gray-400 text-sm mt-1">Payment events will appear here once restaurants subscribe</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Date & Time</th>
                        <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Restaurant</th>
                        <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Owner</th>
                        <th className="text-left px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Event</th>
                        <th className="text-right px-5 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map((tx: PaymentEvent) => {
                        const meta = EVENT_TYPE_LABELS[tx.eventType] || { label: tx.eventType, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                        const date = new Date(tx.createdAt)
                        const isPositive = tx.eventType === 'subscription_charged' || tx.eventType === 'subscription_activated'
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="text-gray-900 font-semibold text-xs">
                                {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="text-gray-400 text-[11px] mt-0.5">
                                {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-gray-900 font-bold">{tx.subscription?.restaurant?.name || '—'}</div>
                              <div className="text-gray-400 text-[11px]">@{tx.subscription?.restaurant?.slug || ''}</div>
                            </td>
                            <td className="px-5 py-4">
                              {tx.subscription?.owner ? (
                                <div>
                                  <div className="text-gray-800 font-semibold text-xs">{tx.subscription.owner.ownerName}</div>
                                  <div className="text-gray-400 text-[11px]">{tx.subscription.owner.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border ${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {tx.subscription?.amount ? (
                                <span className={`font-bold text-sm ${isPositive ? 'text-green-700' : 'text-gray-500'}`}>
                                  {isPositive ? '+ ' : ''}₹{(tx.subscription.amount / 100).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {txTotal > 50 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
                      <span className="text-xs text-gray-500 font-medium">
                        Showing {((txPage - 1) * 50) + 1}–{Math.min(txPage * 50, txTotal)} of {txTotal}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchTransactions(txPage - 1)}
                          disabled={txPage <= 1}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => fetchTransactions(txPage + 1)}
                          disabled={txPage * 50 >= txTotal}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-white disabled:opacity-40 hover:bg-gray-100 transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminPageInner />
    </Suspense>
  )
}
