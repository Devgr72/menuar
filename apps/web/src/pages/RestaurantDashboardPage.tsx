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
    label: 'Empty',
    dot: '#D4C9A8',
    bg: 'transparent',
    text: '#B8A882',
    border: '#E8DDBF',
    dashed: true,
  },
  photos_uploaded: {
    label: 'Photos sent',
    dot: '#C5922A',
    bg: '#FDF7E8',
    text: '#8B6020',
    border: '#E8A83A60',
    dashed: false,
  },
  processing: {
    label: 'Creating 3D',
    dot: '#4A7A8C',
    bg: '#F0F6F8',
    text: '#2D5A6A',
    border: '#8CC0D060',
    dashed: false,
  },
  glb_ready: {
    label: 'Live in AR',
    dot: '#3A6E3A',
    bg: '#F0F6F0',
    text: '#2B4A2B',
    border: '#6FA06F60',
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

export default function RestaurantDashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { data, loading, error, refetch } = useDashboard()
  const [selectedSlot, setSelectedSlot] = useState<DishSlot | null>(null)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: '#2B4A2B', borderTopColor: 'transparent' }}
          />
          <p className="font-dm-sans text-sm" style={{ color: '#7A6B55' }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="text-center">
          <p className="font-dm-sans text-sm mb-3" style={{ color: '#8B2A1A' }}>{error}</p>
          <button
            onClick={() => navigate('/select-plan')}
            className="font-dm-sans text-sm underline"
            style={{ color: '#2B4A2B' }}
          >
            View plans
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
    <div className="min-h-screen font-dm-sans" style={{ background: '#F5F0E8' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ background: '#FEFCF7', borderBottom: '1px solid #E8DDBF' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
              style={{ background: '#2B4A2B' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#F5F0E8"/>
              </svg>
            </div>
            <div>
              <p className="font-fraunces font-semibold text-sm leading-tight" style={{ color: '#1C1C1A' }}>
                DishDekho
              </p>
              <p className="text-xs leading-tight" style={{ color: '#B8A882' }}>
                {edit.editing ? edit.restaurantName || restaurant.name : restaurant.name}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3A6E3A' }} />
              <span className="text-xs" style={{ color: '#5A7A5A' }}>
                {liveCount}/10 dishes live
              </span>
            </div>
            <button
              onClick={() => signOut().then(() => navigate('/sign-in'))}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#7A6B55', background: '#F2EAD5' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Halted banner ─────────────────────────────────────────────────── */}
        {isHalted && (
          <div className="rounded-2xl px-5 py-4" style={{ background: '#FDF2F0', border: '1px solid #E8B8B0' }}>
            <p className="font-semibold text-sm" style={{ color: '#8B2A1A' }}>Payment failed</p>
            <p className="text-sm mt-1" style={{ color: '#A85050' }}>
              Your subscription payment failed.{' '}
              <button onClick={() => navigate('/select-plan')} className="underline font-semibold">
                Retry payment
              </button>{' '}
              to restore AR access.
            </p>
          </div>
        )}

        {/* ── QR + Account (two-column on desktop) ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* QR Code */}
          {restaurant.qrUrl ? (
            <QRCodeDisplay
              qrUrl={restaurant.qrUrl}
              restaurantName={restaurant.name}
              slug={restaurant.slug}
            />
          ) : (
            <div
              className="rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]"
              style={{ background: '#FEFCF7', border: '1px solid #E8DDBF' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: '#F2EAD5' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#7A6B55" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-fraunces font-semibold text-sm mb-1" style={{ color: '#1C1C1A' }}>QR code generating…</p>
              <p className="text-xs" style={{ color: '#B8A882' }}>Ready in a few minutes after payment</p>
            </div>
          )}

          {/* Account info */}
          <div
            className="rounded-3xl p-6"
            style={{ background: '#FEFCF7', border: '1px solid #E8DDBF' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-fraunces font-semibold text-sm" style={{ color: '#1C1C1A' }}>
                Account
              </h3>
              {!edit.editing ? (
                <button
                  onClick={() => edit.setEditing(true)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: '#F2EAD5', color: '#7A6B55' }}
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={edit.cancel}
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: '#F2EAD5', color: '#7A6B55' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={edit.save}
                    disabled={edit.saving}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold disabled:opacity-60"
                    style={{ background: '#2B4A2B', color: '#F5F0E8' }}
                  >
                    {edit.saving ? '…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Field
                label="Owner"
                editing={edit.editing}
                value={edit.ownerName}
                onChange={edit.setOwnerName}
                display={owner.ownerName}
              />
              <Field
                label="Restaurant"
                editing={edit.editing}
                value={edit.restaurantName}
                onChange={edit.setRestaurantName}
                display={restaurant.name}
              />
              {owner.email && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#B8A882' }}>Email</span>
                  <span className="text-xs truncate ml-4" style={{ color: '#7A6B55' }}>{owner.email}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#B8A882' }}>Plan</span>
                <span className="text-xs font-semibold" style={{ color: '#C5922A' }}>DishDekho Starter</span>
              </div>
              {subscription?.nextBillingAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#B8A882' }}>Next billing</span>
                  <span className="text-xs" style={{ color: '#7A6B55' }}>
                    {new Date(subscription.nextBillingAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {memberSince && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#B8A882' }}>Member since</span>
                  <span className="text-xs" style={{ color: '#7A6B55' }}>{memberSince}</span>
                </div>
              )}
            </div>

            {edit.saveError && (
              <p className="text-xs mt-3" style={{ color: '#8B2A1A' }}>{edit.saveError}</p>
            )}

            {/* Scan count */}
            <div
              className="mt-4 rounded-xl px-4 py-2.5 flex items-center justify-between"
              style={{ background: '#F2EAD5' }}
            >
              <span className="text-xs" style={{ color: '#7A6B55' }}>QR scans</span>
              <span className="font-fraunces font-semibold text-sm" style={{ color: '#2B4A2B' }}>
                {restaurant.scanCount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Dish Slots ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-fraunces font-semibold text-base" style={{ color: '#1C1C1A' }}>
              Dish Slots
            </h2>
            <span className="text-xs" style={{ color: liveCount > 0 ? '#3A6E3A' : '#B8A882' }}>
              {liveCount} of 10 live in AR
            </span>
          </div>

          {/* Status legend */}
          <div className="flex items-center gap-4 mb-4 px-1 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                <span className="text-xs" style={{ color: '#B8A882' }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isHalted={isHalted}
                onOpen={() => setSelectedSlot(slot)}
              />
            ))}
          </div>

          <p className="text-xs mt-4 text-center" style={{ color: '#B8A882' }}>
            After uploading photos, your dish appears in AR within a few hours.
          </p>
        </div>

      </main>

      {/* ── Upload Modal ────────────────────────────────────────────────────── */}
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

function SlotCard({ slot, isHalted, onOpen }: { slot: DishSlot; isHalted: boolean; onOpen: () => void }) {
  const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.empty
  const canUpload = slot.status === 'empty' && !isHalted
  const isReady = slot.status === 'glb_ready'

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: cfg.bg || '#FEFCF7',
        border: `${cfg.dashed ? '1.5px dashed' : '1px solid'} ${cfg.border}`,
        cursor: canUpload ? 'pointer' : 'default',
      }}
      onClick={canUpload ? onOpen : undefined}
      onMouseEnter={(e) => { if (canUpload) (e.currentTarget as HTMLDivElement).style.borderColor = '#2B4A2B' }}
      onMouseLeave={(e) => { if (canUpload) (e.currentTarget as HTMLDivElement).style.borderColor = cfg.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold" style={{ color: '#B8A882' }}>
          {slot.slotNumber.toString().padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-xs" style={{ color: cfg.text }}>{cfg.label}</span>
        </div>
      </div>

      {slot.dishName ? (
        <div>
          <p className="font-fraunces text-sm font-semibold leading-tight truncate mb-0.5" style={{ color: '#1C1C1A' }}>
            {slot.dishName}
          </p>
          {slot.description && (
            <p className="text-xs leading-snug line-clamp-2" style={{ color: '#7A6B55' }}>
              {slot.description}
            </p>
          )}
          {slot.price !== undefined && slot.price !== null && slot.price > 0 && (
            <p className="text-xs font-semibold mt-1.5" style={{ color: '#C5922A' }}>₹{slot.price}</p>
          )}
          {slot.isVeg !== undefined && (
            <div className="mt-1.5 inline-flex">
              <div
                className="w-4 h-4 rounded border-2 flex items-center justify-center"
                style={{ borderColor: slot.isVeg ? '#3A6E3A' : '#8B2A1A' }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: slot.isVeg ? '#3A6E3A' : '#8B2A1A' }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {canUpload ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-none"
                style={{ background: '#F2EAD5' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#7A6B55" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs" style={{ color: '#7A6B55' }}>Add dish</span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: cfg.text }}>
              {slot.status === 'photos_uploaded'
                ? `${slot.photoKeys.length} photo${slot.photoKeys.length !== 1 ? 's' : ''} sent`
                : slot.status === 'processing'
                ? 'Creating model…'
                : '—'}
            </span>
          )}
        </div>
      )}

      {/* View 3D model button */}
      {isReady && slot.glbUrl && (
        <a
          href={slot.glbUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: '#2B4A2B', color: '#F5F0E8' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          View 3D Model
        </a>
      )}
    </div>
  )
}
