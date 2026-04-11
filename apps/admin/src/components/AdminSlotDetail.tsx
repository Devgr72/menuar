"use client"
import { useState, useEffect, useRef } from 'react'
import { getRestaurantSlots, uploadSlotGLB, updateSlotMeta } from '../api/client'
import type { DishSlot } from '@menuar/types'

interface Props {
  restaurantId: string
  restaurantName: string
  onBack: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const getCustomToken = async () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

export default function AdminSlotDetail({ restaurantId, restaurantName, onBack }: Props) {
  const [slots, setSlots] = useState<DishSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [savingMeta, setSavingMeta] = useState<string | null>(null)
  const [uploadingGlb, setUploadingGlb] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState<Record<string, { dishName: string; description: string; ingredients: string; price: string; isVeg: boolean }>>({})
  const glbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    getCustomToken().then(async (token) => {
      if (!token) return
      const { slots: s } = await getRestaurantSlots(token, restaurantId)
      setSlots(s)
      // Initialize meta forms
      const forms: typeof metaForm = {}
      s.forEach((slot) => {
        forms[slot.id] = {
          dishName: slot.dishName ?? '',
          description: slot.description ?? '',
          ingredients: (slot as any).ingredients ?? '',
          price: slot.price != null ? String(slot.price) : '',
          isVeg: slot.isVeg,
        }
      })
      setMetaForm(forms)
      setLoading(false)
    })
  }, [restaurantId])

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

  const STATUS_COLORS: Record<string, string> = {
    empty: 'text-gray-500',
    photos_uploaded: 'text-yellow-600',
    processing: 'text-blue-600',
    glb_ready: 'text-green-600',
  }

  if (loading) return (
    <div className="p-6 text-center">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <h2 className="text-gray-900 font-bold text-lg">{restaurantName} — Slots</h2>
      </div>

      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <span className="text-gray-800 font-bold bg-gray-100 px-2.5 py-1 rounded-md text-sm">Slot {slot.slotNumber}</span>
              <span className={`text-xs font-bold px-2 py-1 bg-gray-50 rounded-md border border-gray-100 ${STATUS_COLORS[slot.status] ?? 'text-gray-500'}`}>
                {slot.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Photos */}
            {(() => {
              const FAKE_PHOTOS = [
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
                'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80',
                'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
                'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80'
              ];
              const isFake = slot.photoKeys.length === 0;
              const displayPhotos = isFake ? FAKE_PHOTOS : slot.photoKeys.map(k => `${API_URL}/uploads/${k}`);
              
              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      {isFake ? 'Demo uploaded photos (4/4)' : `Uploaded photos (${slot.photoKeys.length}/4)`}
                    </p>
                    {isFake && <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold">SAMPLE</span>}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {displayPhotos.map((url, i) => (
                      <div key={i} className="group block relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-orange-500 transition-all">
                        <img 
                          src={url} 
                          alt="Dish Upload" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                           <a href={url} target="_blank" rel="noopener noreferrer" className="text-white bg-white/20 hover:bg-white/40 px-3 py-1.5 rounded-md text-xs font-bold backdrop-blur-sm transition-colors w-24 text-center">
                             View Full
                           </a>
                           <a href={url} target="_blank" download={`dish-photo-${i+1}.jpg`} rel="noopener noreferrer" className="text-white bg-orange-600/90 hover:bg-orange-500 px-3 py-1.5 rounded-md text-xs font-bold backdrop-blur-sm transition-colors flex items-center justify-center gap-1 w-24">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                             Download
                           </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Dish meta form */}
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
                    {savingMeta === slot.id ? 'Saving...' : 'Save Changes'}
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
                    {(slot as any).ingredients && (
                      <div className="mt-2 bg-orange-50/50 border border-orange-100 rounded-md py-1.5 px-3 inline-block">
                        <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider">Ingredients:</span>
                        <span className="text-xs text-orange-900 ml-2 font-medium">{(slot as any).ingredients}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">No dish details provided.</p>
                )}
                <button
                  onClick={() => setEditingSlot(slot.id)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold text-xs px-3 py-1.5 rounded-md transition-colors"
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
                ref={(el) => { 
                  if (el) glbInputRefs.current[slot.id] = el 
                }}
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
                {uploadingGlb === slot.id ? 'Uploading...' : slot.status === 'glb_ready' ? 'Replace Model (GLB)' : 'Upload 3D Model'}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
