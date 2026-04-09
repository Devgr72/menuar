import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/react'
import { useDashboard } from '../hooks/useDashboard'
import QRCodeDisplay from '../components/dashboard/QRCodeDisplay'
import DishPhotoUploadModal from '../components/dashboard/DishPhotoUploadModal'
import type { DishSlot } from '@menuar/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  empty: { label: 'Empty', color: 'bg-gray-700 text-gray-400' },
  photos_uploaded: { label: 'Photos sent', color: 'bg-yellow-900/40 text-yellow-400' },
  processing: { label: 'Processing', color: 'bg-blue-900/40 text-blue-400' },
  glb_ready: { label: 'Live in AR', color: 'bg-green-900/40 text-green-400' },
}

export default function RestaurantDashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { data, loading, error, refetch } = useDashboard()
  const [selectedSlot, setSelectedSlot] = useState<DishSlot | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={() => navigate('/select-plan')} className="text-orange-500 underline text-sm">
            View plans
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { owner, restaurant, subscription, slots } = data
  const isHalted = subscription?.status === 'halted'
  const memberSince = restaurant.createdAt
    ? new Date(restaurant.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{restaurant.name}</h1>
            <p className="text-gray-500 text-xs">Member since {memberSince} · {restaurant.scanCount} QR scans</p>
          </div>
          <button
            onClick={() => signOut().then(() => navigate('/sign-in'))}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Halted subscription banner */}
        {isHalted && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-4">
            <p className="text-red-300 text-sm font-semibold">Payment failed</p>
            <p className="text-red-400 text-xs mt-1">
              Your subscription payment failed. Please{' '}
              <button
                onClick={() => navigate('/select-plan')}
                className="underline"
              >
                retry payment
              </button>{' '}
              to restore access.
            </p>
          </div>
        )}

        {/* QR Code */}
        {restaurant.qrUrl ? (
          <QRCodeDisplay
            qrUrl={restaurant.qrUrl}
            restaurantName={restaurant.name}
            slug={restaurant.slug}
          />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-gray-400 text-sm">Your QR code is being generated...</p>
            <p className="text-gray-600 text-xs mt-1">Refresh in a few minutes</p>
          </div>
        )}

        {/* Dish slots */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Dish Slots</h2>
            <span className="text-gray-500 text-xs">
              {slots.filter((s) => s.status === 'glb_ready').length}/10 live
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot) => {
              const badge = STATUS_LABELS[slot.status] ?? STATUS_LABELS.empty
              const canUpload = slot.status === 'empty' && !isHalted

              return (
                <button
                  key={slot.id}
                  onClick={() => canUpload ? setSelectedSlot(slot) : undefined}
                  disabled={!canUpload && slot.status === 'empty'}
                  className={`
                    bg-gray-900 border rounded-xl p-4 text-left transition-all
                    ${canUpload ? 'border-dashed border-gray-700 hover:border-orange-600 cursor-pointer' : 'border-gray-800 cursor-default'}
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-gray-600 text-xs font-medium">SLOT {slot.slotNumber}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {slot.dishName ? (
                    <div>
                      <p className="text-white text-sm font-medium truncate">{slot.dishName}</p>
                      {slot.price && (
                        <p className="text-gray-500 text-xs mt-0.5">₹{slot.price}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      {canUpload ? (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">+</span> Add dish
                        </span>
                      ) : (
                        <span className="text-xs">
                          {slot.status === 'photos_uploaded'
                            ? `${slot.photoKeys.length} photo${slot.photoKeys.length !== 1 ? 's' : ''} sent`
                            : slot.status === 'processing'
                            ? 'Creating 3D model...'
                            : '—'}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-gray-600 text-xs mt-3 text-center">
            After uploading photos, your dish will appear in AR within a few hours.
          </p>
        </div>

        {/* Owner info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Owner</span>
              <span className="text-white">{owner.ownerName}</span>
            </div>
            {owner.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-white text-xs">{owner.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="text-orange-400 font-medium">MenuAR Starter</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Next billing</span>
              <span className="text-white text-xs">
                {subscription?.nextBillingAt
                  ? new Date(subscription.nextBillingAt).toLocaleDateString('en-IN')
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Upload modal */}
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
