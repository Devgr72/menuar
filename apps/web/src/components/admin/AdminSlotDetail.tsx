import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/react'
import { getRestaurantSlots, uploadSlotGLB, updateSlotMeta } from '../../api/client'
import type { DishSlot } from '@menuar/types'

interface Props {
  restaurantId: string
  restaurantName: string
  onBack: () => void
}

const API_URL = import.meta.env.VITE_API_URL || ''

export default function AdminSlotDetail({ restaurantId, restaurantName, onBack }: Props) {
  const { getToken } = useAuth()
  const [slots, setSlots] = useState<DishSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [savingMeta, setSavingMeta] = useState<string | null>(null)
  const [uploadingGlb, setUploadingGlb] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState<Record<string, { dishName: string; description: string; price: string; isVeg: boolean }>>({})
  const glbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    getToken().then(async (token) => {
      if (!token) return
      const { slots: s } = await getRestaurantSlots(token, restaurantId)
      setSlots(s)
      // Initialize meta forms
      const forms: typeof metaForm = {}
      s.forEach((slot) => {
        forms[slot.id] = {
          dishName: slot.dishName ?? '',
          description: slot.description ?? '',
          price: slot.price != null ? String(slot.price) : '',
          isVeg: slot.isVeg,
        }
      })
      setMetaForm(forms)
      setLoading(false)
    })
  }, [getToken, restaurantId])

  async function handleGLBUpload(slot: DishSlot, file: File) {
    setUploadingGlb(slot.id)
    try {
      const token = await getToken()
      if (!token) return
      const meta = metaForm[slot.id]
      await uploadSlotGLB(token, slot.id, file, {
        dishName: meta?.dishName || undefined,
        description: meta?.description || undefined,
        price: meta?.price ? parseFloat(meta.price) : undefined,
        isVeg: meta?.isVeg,
      })
      // Refresh slots
      const { slots: s } = await getRestaurantSlots(token, restaurantId)
      setSlots(s)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'GLB upload failed')
    } finally {
      setUploadingGlb(null)
    }
  }

  async function handleSaveMeta(slotId: string) {
    setSavingMeta(slotId)
    try {
      const token = await getToken()
      if (!token) return
      const meta = metaForm[slotId]
      await updateSlotMeta(token, slotId, {
        dishName: meta.dishName || undefined,
        description: meta.description || undefined,
        price: meta.price ? parseFloat(meta.price) : undefined,
        isVeg: meta.isVeg,
      })
      setEditingSlot(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingMeta(null)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    empty: 'text-gray-500',
    photos_uploaded: 'text-yellow-400',
    processing: 'text-blue-400',
    glb_ready: 'text-green-400',
  }

  if (loading) return (
    <div className="p-6 text-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-white font-semibold">{restaurantName} — Slots</h2>
      </div>

      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm font-medium">Slot {slot.slotNumber}</span>
              <span className={`text-xs font-medium ${STATUS_COLORS[slot.status] ?? 'text-gray-500'}`}>
                {slot.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Photos */}
            {slot.photoKeys.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-500 text-xs mb-2">Uploaded photos ({slot.photoKeys.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {slot.photoKeys.map((key) => (
                    <a
                      key={key}
                      href={`${API_URL}/uploads/${key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      📷 {key.split('/').pop()}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Dish meta form */}
            {editingSlot === slot.id ? (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Dish name"
                  value={metaForm[slot.id]?.dishName ?? ''}
                  onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], dishName: e.target.value } }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                />
                <textarea
                  placeholder="Description"
                  value={metaForm[slot.id]?.description ?? ''}
                  onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], description: e.target.value } }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                  rows={2}
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={metaForm[slot.id]?.price ?? ''}
                    onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], price: e.target.value } }))}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metaForm[slot.id]?.isVeg ?? true}
                      onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], isVeg: e.target.checked } }))}
                      className="accent-green-500"
                    />
                    Veg
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveMeta(slot.id)}
                    disabled={savingMeta === slot.id}
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
                  >
                    {savingMeta === slot.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg px-4 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                {slot.dishName ? (
                  <div className="text-sm">
                    <span className="text-white font-medium">{slot.dishName}</span>
                    {slot.price != null && <span className="text-gray-400 ml-2">₹{slot.price}</span>}
                    {slot.isVeg && <span className="text-green-400 ml-2 text-xs">●veg</span>}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">No dish name set</p>
                )}
                <button
                  onClick={() => setEditingSlot(slot.id)}
                  className="text-orange-500 hover:text-orange-400 text-xs mt-1 transition-colors"
                >
                  Edit details
                </button>
              </div>
            )}

            {/* GLB upload */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".glb"
                className="hidden"
                ref={(el) => { glbInputRefs.current[slot.id] = el }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleGLBUpload(slot, file)
                }}
              />
              <button
                onClick={() => glbInputRefs.current[slot.id]?.click()}
                disabled={uploadingGlb === slot.id}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {uploadingGlb === slot.id ? 'Uploading GLB...' : slot.status === 'glb_ready' ? 'Replace GLB' : 'Upload GLB'}
              </button>
              {slot.glbUrl && (
                <a
                  href={slot.glbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 text-xs underline"
                >
                  View GLB
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
