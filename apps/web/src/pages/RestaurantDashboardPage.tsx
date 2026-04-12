import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/react'
import { useAuth } from '@clerk/react'
import { useDashboard } from '../hooks/useDashboard'
import QRCodeDisplay from '../components/dashboard/QRCodeDisplay'
import DishPhotoUploadModal from '../components/dashboard/DishPhotoUploadModal'
import { updateProfile } from '../api/client'
import type { DishSlot } from '@menuar/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  empty: {
    label: 'Available Slot',
    dot: '#94A3B8',
    bg: '#FFFFFF',
    text: '#64748B',
    border: '#E2E8F0',
    dashed: true,
  },
  photos_uploaded: {
    label: 'In Review',
    dot: '#F59E0B',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    dashed: false,
  },
  processing: {
    label: 'Building 3D',
    dot: '#3B82F6',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    dashed: false,
  },
  glb_ready: {
    label: 'Success',
    dot: '#10B981',
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
    dashed: false,
  },
} as const

// ─── Inline edit hook ─────────────────────────────────────────────────────────

function useInlineEdit(initialOwner: string, initialRestaurant: string) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState(false)
  const [ownerName, setOwnerName] = useState(initialOwner)
  const [restaurantName, setRestaurantName] = useState(initialRestaurant)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await updateProfile(token, {
        ownerName: ownerName.trim() !== initialOwner ? ownerName.trim() : undefined,
        restaurantName: restaurantName.trim() !== initialRestaurant ? restaurantName.trim() : undefined,
      })
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setOwnerName(initialOwner)
    setRestaurantName(initialRestaurant)
    setSaveError(null)
    setEditing(false)
  }

  return { editing, setEditing, ownerName, setOwnerName, restaurantName, setRestaurantName, saving, saveError, save, cancel }
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Sidebar component ────────────────────────────────────────────────────────

function Sidebar({ active, navigate, signOut }: { active: string; navigate: (p: string) => void; signOut: () => Promise<unknown> }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>, active: true },
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#F1F5F9]">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-10">
          <img src="/dishdekho.jpeg" alt="DishDekho Logo" className="w-12 h-12 rounded-xl object-contain shadow-sm" />
          <h1 className="font-fraunces font-bold text-xl text-[#1E293B]">DishDekho</h1>
        </div>

        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              disabled={!(item as any).active}
              onClick={() => (item as any).active && navigate(item.id === 'dashboard' ? '/dashboard' : '/')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                active === item.id 
                ? 'bg-[#F1F5F9] text-[#2C4A2C] shadow-sm' 
                : (item as any).active 
                  ? 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                  : 'text-[#CBD5E1] cursor-not-allowed opacity-60'
              }`}
            >
              <span className={active === item.id ? 'text-[#2C4A2C]' : 'text-[#94A3B8]'}>{item.icon}</span>
              <span className="font-outfit font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[#F1F5F9]">
        <button
          onClick={() => signOut().then(() => navigate('/sign-in'))}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#64748B] hover:text-[#EF4444] transition-colors rounded-xl font-outfit text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64">
        <NavContent />
      </div>
      {/* Mobile Nav Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-[#F1F5F9]"
      >
        <svg className="w-6 h-6 text-[#1E293B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-[#00000040] backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl">
            <NavContent />
            <button 
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#94A3B8]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function RestaurantDashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { data, loading, error, refetch } = useDashboard()
  const [selectedSlot, setSelectedSlot] = useState<DishSlot | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl border-2 border-[#2C4A2C] border-t-transparent animate-spin mx-auto mb-6" />
          <p className="font-outfit text-[#64748B] font-medium tracking-wide">Orchestrating your experience…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-[#FEF2F2] text-[#EF4444] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="font-outfit font-semibold text-[#1E293B] mb-2">{error}</p>
          <button onClick={() => navigate('/select-plan')} className="text-sm font-medium text-[#2C4A2C] underline decoration-[#2C4A2C60] underline-offset-4">
            Manage subscription
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { owner, restaurant, subscription, slots } = data
  const isHalted = subscription?.status === 'halted'
  const liveCount = slots.filter((s) => s.status === 'glb_ready').length
  const memberSince = restaurant.createdAt
    ? new Date(restaurant.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 transition-all">
      <Sidebar active="dashboard" navigate={navigate} signOut={signOut} />
      
      <ProfileEditWrapper
        owner={owner}
        restaurant={restaurant}
        subscription={subscription}
        slots={slots}
        isHalted={isHalted}
        liveCount={liveCount}
        memberSince={memberSince}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        refetch={refetch}
        navigate={navigate}
        signOut={signOut}
      />
    </div>
  )
}

// ─── Inner wrapper (needs hooks based on initial values) ─────────────────────

interface WrapperProps {
  owner: { id: string; ownerName: string; email?: string; restaurantId: string; createdAt: string }
  restaurant: { id: string; name: string; slug: string; plan: string; qrUrl?: string; scanCount: number; createdAt: string }
  subscription: { id: string; status: string; activatedAt?: string; nextBillingAt?: string; haltedAt?: string; amount: number } | null
  slots: DishSlot[]
  isHalted: boolean
  liveCount: number
  memberSince: string
  selectedSlot: DishSlot | null
  setSelectedSlot: (slot: DishSlot | null) => void
  refetch: () => void
  navigate: (path: string) => void
  signOut: () => Promise<unknown>
}

function ProfileEditWrapper({
  owner, restaurant, subscription, slots,
  isHalted, liveCount, memberSince,
  selectedSlot, setSelectedSlot, refetch, navigate, signOut,
}: WrapperProps) {
  const edit = useInlineEdit(owner.ownerName, restaurant.name)

  return (
    <div className="p-4 sm:p-8 lg:p-12">
      <main className="max-w-7xl mx-auto space-y-12">
        {/* ── Welcome Header ─────────────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="font-fraunces text-4xl font-bold text-[#1E293B] mb-2">
              Welcome back, <span className="text-[#2C4A2C]">{owner.ownerName.split(' ')[0]}</span>
            </h2>
            <p className="font-outfit text-[#64748B] text-lg">
              Manage your digital menu and augmented reality presence.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#F1F5F9] flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ECFDF5] rounded-xl flex items-center justify-center text-[#10B981]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Live Status</p>
                  <p className="font-outfit text-sm font-bold text-[#1E293B]">{liveCount}/10 Dishes Active</p>
                </div>
             </div>
          </div>
        </section>

        {/* ── Halted banner ─────────────────────────────────────────────────── */}
        {isHalted && (
          <div className="rounded-2xl px-6 py-4 bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-4">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#EF4444] shadow-sm">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div>
                <p className="font-outfit font-bold text-[#B91C1C]">Payment verification required</p>
                <p className="text-sm text-[#991B1B]">
                  Your subscription needs attention to restore AR features. {' '}
                  <button onClick={() => navigate('/select-plan')} className="font-bold underline">Retry now</button>
                </p>
             </div>
          </div>
        )}

        {/* ── Main Content Grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* QR Section (left) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-fraunces text-xl font-bold text-[#1E293B]">Table and Menu Engagement</h3>
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest bg-[#F8FAFC] px-3 py-1 rounded-full">Automated Tool</span>
              </div>
              
              {restaurant.qrUrl ? (
                <QRCodeDisplay
                  qrUrl={restaurant.qrUrl}
                  restaurantName={restaurant.name}
                  slug={restaurant.slug}
                />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-[#F8FAFC]">
                   <p className="font-outfit text-[#94A3B8] font-medium">Generating your unique QR engine…</p>
                </div>
              )}
            </div>

            {/* Dish Management Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-fraunces text-2xl font-bold text-[#1E293B]">Dish Portfolio</h3>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {slots.filter(s => s.status === 'glb_ready').slice(0, 3).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#F1F5F9]" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#64748B]">{liveCount}/10 slots used</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    isHalted={isHalted}
                    onOpen={() => setSelectedSlot(slot)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Account/Admin Section (right) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#1E293B] rounded-3xl p-8 text-white shadow-xl shadow-[#1E293B20]">
              <div className="flex items-center justify-between mb-8">
                <p className="font-fraunces text-lg font-bold">Admin Panel</p>
                <button
                  onClick={() => edit.editing ? edit.save() : edit.setEditing(true)}
                  className="text-xs font-bold uppercase tracking-widest bg-[#FFFFFF20] hover:bg-[#FFFFFF30] transition-colors px-4 py-2 rounded-xl"
                >
                  {edit.editing ? 'Confirm' : 'Customize Profile'}
                </button>
              </div>

              <div className="space-y-6">
                <AdminField label="Owner" value={edit.ownerName} editing={edit.editing} onChange={edit.setOwnerName} />
                <AdminField label="Restaurant" value={edit.restaurantName} editing={edit.editing} onChange={edit.setRestaurantName} />
                
                <div className="pt-6 border-t border-[#FFFFFF10] space-y-4">
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest">Pricing Model</span>
                     <span className="text-xs font-bold bg-[#334155] px-3 py-1 rounded-lg">Pro Tier</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest">Billing Cycle</span>
                     <span className="font-outfit font-medium">Monthly Autopay</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest">Enrolled since</span>
                     <span className="font-outfit font-medium text-[#F1F5F9]">{memberSince}</span>
                   </div>
                </div>

                <div className="bg-[#334155] rounded-2xl p-6 mt-8">
                  <p className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest mb-4">Engagement Analytics</p>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-fraunces font-bold">{restaurant.scanCount}</p>
                    <p className="text-sm font-outfit text-[#94A3B8] mb-2 font-medium">Real-time Scans</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F1F5F9]">
               <h4 className="font-fraunces font-bold text-[#1E293B] mb-4">Customer Support</h4>
               <p className="text-sm text-[#64748B] font-outfit leading-relaxed mb-6">Need assistance with your 3D models or menu logic? Reach us at <span className="text-[#2C4A2C] font-bold">+91 9971381635</span></p>
               <a 
                 href="tel:+919971381635"
                 className="w-full flex items-center justify-center py-4 rounded-2xl border border-[#F1F5F9] font-outfit font-bold text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition-colors"
               >
                 Call Support Now
               </a>
            </div>
          </div>

        </div>
      </main>

      {/* ── Slot Update Modal ────────────────────────────────────────────────── */}
      {selectedSlot && (
        <DishPhotoUploadModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => {
            setSelectedSlot(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

function AdminField({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-[0.2em]">{label}</label>
      {editing ? (
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#334155] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2C4A2C] outline-none"
        />
      ) : (
        <p className="font-outfit font-semibold text-lg">{value}</p>
      )}
    </div>
  )
}

// ─── Field subcomponent ───────────────────────────────────────────────────────

function Field({
  label,
  editing,
  value,
  onChange,
  display,
}: {
  label: string
  editing: boolean
  value: string
  onChange: (v: string) => void
  display: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs flex-none" style={{ color: '#B8A882' }}>{label}</span>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={80}
          className="text-xs flex-1 min-w-0 rounded-lg px-2.5 py-1.5 outline-none text-right"
          style={{
            background: '#F9F4E8',
            border: '1px solid #D4C9A8',
            color: '#1C1C1A',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#2B4A2B' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#D4C9A8' }}
        />
      ) : (
        <span className="text-xs font-medium truncate" style={{ color: '#1C1C1A' }}>{display}</span>
      )}
    </div>
  )
}

// ─── Slot card ────────────────────────────────────────────────────────────────

// ─── Slot card ────────────────────────────────────────────────────────────────

function SlotCard({ slot, isHalted, onOpen }: { slot: DishSlot; isHalted: boolean; onOpen: () => void }) {
  const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.empty
  const canUpload = slot.status === 'empty' && !isHalted
  const isReady = slot.status === 'glb_ready'

  return (
    <div
      className="group bg-white rounded-[2rem] p-6 border border-[#F1F5F9] shadow-sm hover:shadow-xl hover:shadow-[#1e293b0a] transition-all duration-500 flex flex-col min-h-[280px]"
      style={{ cursor: canUpload ? 'pointer' : 'default' }}
      onClick={canUpload ? onOpen : undefined}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="px-3 py-1 bg-[#F8FAFC] rounded-full">
           <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
            Slot {slot.slotNumber.toString().padStart(2, '0')}
          </span>
        </div>
        <div 
          className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: cfg.dot }} />
          {cfg.label}
        </div>
      </div>

      <div className="flex-1">
        {slot.dishName ? (
          <div className="space-y-4">
              <div className="flex gap-4">
                {slot.menuPhotoUrl && (
                  <div className="flex-none w-20 h-20 rounded-2xl overflow-hidden shadow-sm border border-[#F1F5F9]">
                    <img src={slot.menuPhotoUrl} alt={slot.dishName} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-fraunces text-xl font-bold text-[#1E293B] leading-tight group-hover:text-[#2C4A2C] transition-colors">
                    {slot.dishName}
                  </h4>
                  {slot.description && (
                    <p className="font-outfit text-sm text-[#64748B] line-clamp-2 mt-2 leading-relaxed">
                      {slot.description}
                    </p>
                  )}
                </div>
              </div>
            
            <div className="flex items-center justify-between">
              {slot.price !== undefined && slot.price !== null && slot.price > 0 && (
                <div className="bg-[#FFFBEB] px-3 py-1.5 rounded-xl border border-[#FEF3C7]">
                  <p className="font-outfit font-bold text-sm text-[#B45309]">₹{slot.price}</p>
                </div>
              )}
              {slot.isVeg !== undefined && (
                <div className={`p-1.5 rounded-lg border-2 ${slot.isVeg ? 'border-[#10B98120] text-[#10B981]' : 'border-[#EF444420] text-[#EF4444]'}`}>
                   <div className="w-2.5 h-2.5 rounded-full currentColor shadow-inner" style={{ background: 'currentColor' }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${canUpload ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#F8FAFC] text-[#94A3B8]'}`}>
               {canUpload ? (
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
               ) : (
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               )}
            </div>
            <p className="font-outfit text-sm font-medium text-[#94A3B8]">
              {canUpload ? 'Add New AR Dish' : 'Awaiting Curator Files'}
            </p>
          </div>
        )}
      </div>

      {isReady && slot.glbUrl && (
        <a
          href={slot.glbUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold bg-[#1E293B] text-white hover:bg-[#2C4A2C] shadow-lg shadow-[#1e293b20] transition-all duration-300 transform active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View 3D Model
        </a>
      )}
    </div>
  )
}
