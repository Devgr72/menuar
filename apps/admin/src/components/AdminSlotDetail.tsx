"use client"
import { useState, useEffect, useRef } from 'react'
import { getRestaurantSlots, uploadSlotGLB, updateSlotMeta, regenerateQR } from '../api/client'
import type { DishSlot } from '@menuar/types'

interface Props {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  qrUrl?: string
  onBack: () => void
}

const getCustomToken = async () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null

const STATUS_COLORS: Record<string, string> = {
  empty: 'text-gray-500 bg-gray-50 border-gray-200',
  photos_uploaded: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  processing: 'text-blue-700 bg-blue-50 border-blue-200',
  glb_ready: 'text-green-700 bg-green-50 border-green-200',
}

const STATUS_LABELS: Record<string, string> = {
  empty: 'Empty',
  photos_uploaded: 'Photos Uploaded',
  processing: 'Processing',
  glb_ready: 'Live',
}

function PhotoGrid({ urls, label, emptyLabel }: { urls: string[]; label: string; emptyLabel: string }) {
  if (urls.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {emptyLabel}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className={`grid gap-3 ${urls.length === 1 ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {urls.map((url, i) => (
          <div key={i} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-orange-500 transition-all">
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-white bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-md text-xs font-bold backdrop-blur-sm transition-colors w-24 text-center">
                View Full
              </a>
              <a href={url} download={`photo-${i + 1}.jpg`} className="text-white bg-orange-600/90 hover:bg-orange-500 px-3 py-1.5 rounded-md text-xs font-bold backdrop-blur-sm transition-colors flex items-center justify-center gap-1 w-24">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSlotDetail({ restaurantId, restaurantName, restaurantSlug, qrUrl: initialQrUrl, onBack }: Props) {
  const [slots, setSlots] = useState<DishSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [savingMeta, setSavingMeta] = useState<string | null>(null)
  const [uploadingGlb, setUploadingGlb] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState<Record<string, { dishName: string; description: string; ingredients: string; price: string; isVeg: boolean }>>({})
  const glbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [qrUrl, setQrUrl] = useState<string | undefined>(initialQrUrl)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenArUrl, setRegenArUrl] = useState<string | null>(null)

  const loadSlots = async () => {
    const token = await getCustomToken()
    if (!token) return
    const { slots: s } = await getRestaurantSlots(token, restaurantId)
    setSlots(s)
    const forms: typeof metaForm = {}
    s.forEach((slot) => {
      forms[slot.id] = {
        dishName: slot.dishName ?? '',
        description: slot.description ?? '',
        ingredients: slot.ingredients ?? '',
        price: slot.price != null ? String(slot.price) : '',
        isVeg: slot.isVeg,
      }
    })
    setMetaForm(forms)
    setLoading(false)
  }

  useEffect(() => { loadSlots() }, [restaurantId])

  async function handleRegenQR() {
    setRegenLoading(true)
    try {
      const token = await getCustomToken()
      if (!token) return
      const result = await regenerateQR(token, restaurantId)
      setQrUrl(result.qrUrl)
      setRegenArUrl(result.arUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate QR')
    } finally {
      setRegenLoading(false)
    }
  }

  async function handleGLBUpload(slot: DishSlot, file: File) {
    setUploadingGlb(slot.id)
    try {
      const token = await getCustomToken()
      if (!token) return
      const meta = metaForm[slot.id]
      await uploadSlotGLB(token, slot.id, file, {
        dishName: meta?.dishName || undefined,
        description: meta?.description || undefined,
        ingredients: meta?.ingredients || undefined,
        price: meta?.price ? parseFloat(meta.price) : undefined,
        isVeg: meta?.isVeg,
      })
      await loadSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'GLB upload failed')
    } finally {
      setUploadingGlb(null)
    }
  }

  async function handleSaveMeta(slotId: string) {
    setSavingMeta(slotId)
    try {
      const token = await getCustomToken()
      if (!token) return
      const meta = metaForm[slotId]
      await updateSlotMeta(token, slotId, {
        dishName: meta.dishName || undefined,
        description: meta.description || undefined,
        ingredients: meta.ingredients || undefined,
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

  if (loading) return (
    <div className="p-6 text-center">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  const liveCount = slots.filter(s => s.status === 'glb_ready').length
  const pendingCount = slots.filter(s => s.status === 'photos_uploaded' || s.status === 'processing').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <h2 className="text-gray-900 font-bold text-lg">{restaurantName}</h2>
      </div>

      {/* Summary badges + QR card */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-bold px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full">{liveCount} live</span>
        {pendingCount > 0 && <span className="text-xs font-bold px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full">{pendingCount} pending</span>}
        <span className="text-xs font-bold px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-full">{slots.length} total slots</span>
      </div>

      {/* QR code card */}
      <div className="mb-6 bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex items-start gap-4">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-24 h-24 border border-gray-100 rounded-lg shrink-0" />
        ) : (
          <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg shrink-0 flex items-center justify-center text-gray-300 text-xs text-center">No QR</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Table QR Code</p>
          {regenArUrl ? (
            <p className="text-xs text-green-700 font-mono break-all bg-green-50 border border-green-100 rounded px-2 py-1 mb-2">{regenArUrl}</p>
          ) : (
            <p className="text-gray-400 text-xs mb-2">Encodes the AR experience URL for customers.</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRegenQR}
              disabled={regenLoading}
              className="text-xs font-bold px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {regenLoading ? 'Regenerating...' : 'Regenerate QR'}
            </button>
            {qrUrl && (
              <a href={qrUrl} download={`qr-${restaurantSlug}.png`} className="text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">
                Download QR
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">

            {/* Slot header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <span className="text-gray-800 font-bold bg-gray-100 px-2.5 py-1 rounded-md text-sm">Slot {slot.slotNumber}</span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${STATUS_COLORS[slot.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                {STATUS_LABELS[slot.status] ?? slot.status}
              </span>
            </div>

            {/* ── Menu thumbnail photo (1 photo — shown on AR menu card) ── */}
            <PhotoGrid
              urls={slot.menuPhotoUrl ? [slot.menuPhotoUrl] : []}
              label="Menu thumbnail photo (1/1)"
              emptyLabel="No menu thumbnail uploaded yet"
            />

            {/* ── 3D model photos (up to 4 — used to generate GLB) ── */}
            <PhotoGrid
              urls={slot.photoUrls ?? []}
              label={`3D model photos (${slot.photoKeys.length}/4)`}
              emptyLabel="No 3D-angle photos uploaded yet"
            />

            {/* Dish meta */}
            {editingSlot === slot.id ? (
              <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <input
                  type="text"
                  placeholder="Dish name"
                  value={metaForm[slot.id]?.dishName ?? ''}
                  onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], dishName: e.target.value } }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <textarea
                  placeholder="Description"
                  value={metaForm[slot.id]?.description ?? ''}
                  onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], description: e.target.value } }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  rows={2}
                />
                <textarea
                  placeholder="Ingredients (e.g. Tomatoes, Garlic, Olive Oil)"
                  value={metaForm[slot.id]?.ingredients ?? ''}
                  onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], ingredients: e.target.value } }))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  rows={1}
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={metaForm[slot.id]?.price ?? ''}
                    onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], price: e.target.value } }))}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer bg-white border border-gray-300 px-3 rounded-lg">
                    <input
                      type="checkbox"
                      checked={metaForm[slot.id]?.isVeg ?? true}
                      onChange={(e) => setMetaForm((f) => ({ ...f, [slot.id]: { ...f[slot.id], isVeg: e.target.checked } }))}
                      className="accent-green-600 w-4 h-4"
                    />
                    Veg
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSaveMeta(slot.id)}
                    disabled={savingMeta === slot.id}
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white shadow-sm text-sm font-semibold rounded-lg px-5 py-2 transition-colors"
                  >
                    {savingMeta === slot.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-5 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-5 flex justify-between items-start">
                {slot.dishName ? (
                  <div>
                    <h3 className="text-gray-900 font-bold text-base flex items-center gap-2">
                      {slot.dishName}
                      {slot.isVeg ? (
                        <span className="text-green-600 border border-green-200 bg-green-50 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Veg</span>
                      ) : (
                        <span className="text-red-600 border border-red-200 bg-red-50 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Non-Veg</span>
                      )}
                    </h3>
                    {slot.price != null && <p className="text-orange-600 font-semibold mt-0.5">₹{slot.price}</p>}
                    {slot.description && <p className="text-gray-600 text-sm mt-2 leading-relaxed">{slot.description}</p>}
                    {slot.ingredients && (
                      <div className="mt-2 bg-orange-50/50 border border-orange-100 rounded-md py-1.5 px-3 inline-block">
                        <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider">Ingredients:</span>
                        <span className="text-xs text-orange-900 ml-2 font-medium">{slot.ingredients}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">No dish details yet.</p>
                )}
                <button
                  onClick={() => setEditingSlot(slot.id)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold text-xs px-3 py-1.5 rounded-md transition-colors shrink-0 ml-4"
                >
                  Edit Details
                </button>
              </div>
            )}

            {/* GLB upload */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <input
                type="file"
                accept=".glb"
                className="hidden"
                ref={(el) => { if (el) glbInputRefs.current[slot.id] = el }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleGLBUpload(slot, file)
                }}
              />
              <button
                onClick={() => glbInputRefs.current[slot.id]?.click()}
                disabled={uploadingGlb === slot.id}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
              >
                {uploadingGlb === slot.id
                  ? 'Uploading...'
                  : slot.status === 'glb_ready'
                    ? 'Replace 3D Model'
                    : 'Upload 3D Model (.glb)'}
              </button>
              {slot.glbUrl && (
                <a
                  href={slot.glbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Preview GLB
                </a>
              )}
              {slot.status === 'glb_ready' && (
                <span className="text-green-600 text-xs font-semibold flex items-center gap-1 ml-auto">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Live in AR
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
