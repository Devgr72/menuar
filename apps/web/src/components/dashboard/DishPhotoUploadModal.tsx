import { useState, useRef } from 'react'
import { useAuth } from '@clerk/react'
import { uploadSlotPhotos } from '../../api/client'
import type { DishSlot } from '@menuar/types'

interface Props {
  slot: DishSlot
  onClose: () => void
  onSuccess: (updated: { slotNumber: number; status: string }) => void
}

type Step = 'instructions' | 'details' | 'menu-photo' | 'angle-photos'

const ANGLE_TIPS = [
  { icon: '↑', label: 'Front', desc: 'Straight-on shot' },
  { icon: '↗', label: 'Side 45°', desc: 'Show depth' },
  { icon: '◎', label: 'Top-down', desc: "Bird's eye" },
  { icon: '⊕', label: 'Close-up', desc: 'Texture detail' },
]

const STEPS: { key: Step; label: string }[] = [
  { key: 'instructions', label: 'Tips' },
  { key: 'details', label: 'Info' },
  { key: 'menu-photo', label: 'Card photo' },
  { key: 'angle-photos', label: '3D photos' },
]

export default function DishPhotoUploadModal({ slot, onClose, onSuccess }: Props) {
  const { getToken } = useAuth()

  // Step
  const [step, setStep] = useState<Step>('instructions')
  const stepIdx = STEPS.findIndex((s) => s.key === step)

  // Dish details
  const [dishName, setDishName] = useState(slot.dishName ?? '')
  const [description, setDescription] = useState(slot.description ?? '')
  const [price, setPrice] = useState(slot.price?.toString() ?? '')
  const [isVeg, setIsVeg] = useState<boolean>(slot.isVeg ?? false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Menu photo (single card/thumbnail photo)
  const [menuPhoto, setMenuPhoto] = useState<File | null>(null)
  const [menuPreview, setMenuPreview] = useState<string | null>(null)
  const menuInputRef = useRef<HTMLInputElement>(null)

  // Angle photos (up to 4, added one-by-one for mobile compat)
  const [anglePhotos, setAnglePhotos] = useState<File[]>([])
  const [anglePreviews, setAnglePreviews] = useState<string[]>([])
  const angleInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Menu photo ────────────────────────────────────────────────────────────
  function handleMenuPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Photo too large. Max 10MB.'); return }
    setMenuPhoto(file)
    setMenuPreview(URL.createObjectURL(file))
    setError(null)
    // Reset input so same file can be re-selected if user wants to replace
    e.target.value = ''
  }

  // ── Angle photos (one-by-one) ─────────────────────────────────────────────
  function handleAddAnglePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Photo too large. Max 10MB.'); return }
    if (anglePhotos.length >= 4) return
    setAnglePhotos((prev) => [...prev, file])
    setAnglePreviews((prev) => [...prev, URL.createObjectURL(file)])
    setError(null)
    e.target.value = ''
  }

  function removeAnglePhoto(idx: number) {
    setAnglePhotos((prev) => prev.filter((_, i) => i !== idx))
    setAnglePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(s: Step) { setError(null); setStep(s) }

  function validateDetails() {
    if (!dishName.trim()) { setNameError('Dish name is required'); return false }
    setNameError(null); return true
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (anglePhotos.length === 0) { setError('Add at least 1 angle photo for the 3D model.'); return }
    setUploading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const result = await uploadSlotPhotos(token, slot.slotNumber, anglePhotos, {
        dishName: dishName.trim(),
        description: description.trim(),
        price: price.trim(),
        isVeg: String(isVeg),
        menuPhoto: menuPhoto ?? undefined,
      })
      onSuccess({ slotNumber: result.slotNumber, status: result.status })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ background: '#FEFCF7', border: '1px solid #E8DDBF' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: '#FEFCF7', borderBottom: '1px solid #E8DDBF' }}
        >
          <div>
            <h2 className="font-fraunces font-semibold text-sm" style={{ color: '#1C1C1A' }}>
              Slot {slot.slotNumber}
              {dishName && <span style={{ color: '#7A6B55' }}> · {dishName}</span>}
            </h2>
            {/* Step pills */}
            <div className="flex items-center gap-1 mt-1.5">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === stepIdx ? 20 : 6,
                      background: i < stepIdx ? '#2B4A2B' : i === stepIdx ? '#C5922A' : '#E8DDBF',
                    }}
                  />
                </div>
              ))}
              <span className="font-dm-sans text-xs ml-1" style={{ color: '#B8A882' }}>
                {STEPS[stepIdx].label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#F2EAD5' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#7A6B55" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Step 1: Photography tips ───────────────────────────────────── */}
        {step === 'instructions' && (
          <div className="p-6 space-y-5">
            <p className="font-dm-sans text-sm" style={{ color: '#7A6B55' }}>
              You'll upload <span style={{ color: '#1C1C1A', fontWeight: 600 }}>2 types of photos</span>:
            </p>

            <div className="space-y-3">
              <div className="rounded-2xl p-4 flex gap-4" style={{ background: '#F2EAD5', border: '1px solid #E8DDBF' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none text-xl" style={{ background: '#fff' }}>
                  📋
                </div>
                <div>
                  <p className="font-dm-sans font-semibold text-sm" style={{ color: '#1C1C1A' }}>1. Menu card photo</p>
                  <p className="font-dm-sans text-xs mt-0.5" style={{ color: '#7A6B55' }}>
                    1 beautiful photo — shown to customers on the menu. Best angle, well-lit.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl p-4 flex gap-4" style={{ background: '#F2EAD5', border: '1px solid #E8DDBF' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none text-xl" style={{ background: '#fff' }}>
                  📦
                </div>
                <div>
                  <p className="font-dm-sans font-semibold text-sm" style={{ color: '#1C1C1A' }}>2. 3D model photos</p>
                  <p className="font-dm-sans text-xs mt-0.5" style={{ color: '#7A6B55' }}>
                    Up to 4 photos from different angles — used to build the AR 3D model.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ANGLE_TIPS.map((tip) => (
                <div key={tip.label} className="rounded-xl p-3 text-center" style={{ background: '#F9F4E8' }}>
                  <div className="font-fraunces text-lg mb-1" style={{ color: '#2B4A2B' }}>{tip.icon}</div>
                  <div className="font-dm-sans text-xs font-semibold" style={{ color: '#1C1C1A' }}>{tip.label}</div>
                  <div className="font-dm-sans text-xs" style={{ color: '#B8A882' }}>{tip.desc}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl px-4 py-3" style={{ background: '#FDF7E8', border: '1px solid #E8A83A40' }}>
              <p className="font-dm-sans text-xs" style={{ color: '#8B6020' }}>
                Use natural light · plain background · avoid blur or harsh shadows
              </p>
            </div>

            <button
              onClick={() => goTo('details')}
              className="w-full py-3 rounded-2xl font-dm-sans font-semibold text-sm"
              style={{ background: '#2B4A2B', color: '#F5F0E8' }}
            >
              Got it — Enter dish details
            </button>
          </div>
        )}

        {/* ── Step 2: Dish details ───────────────────────────────────────── */}
        {step === 'details' && (
          <div className="p-6 space-y-5">
            <p className="font-dm-sans text-sm" style={{ color: '#7A6B55' }}>
              These appear on the AR menu card customers see.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-dm-sans text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7A6B55' }}>
                  Dish name <span style={{ color: '#C5922A' }}>*</span>
                </label>
                <input
                  type="text"
                  value={dishName}
                  onChange={(e) => { setDishName(e.target.value); setNameError(null) }}
                  placeholder="e.g. Butter Chicken"
                  maxLength={80}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 font-dm-sans text-sm outline-none"
                  style={{
                    background: '#F9F4E8',
                    border: `1px solid ${nameError ? '#C5922A' : '#E8DDBF'}`,
                    color: '#1C1C1A',
                  }}
                />
                {nameError && <p className="font-dm-sans text-xs mt-1" style={{ color: '#C5922A' }}>{nameError}</p>}
              </div>

              <div>
                <label className="block font-dm-sans text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7A6B55' }}>
                  Description <span className="font-normal normal-case" style={{ color: '#B8A882' }}>(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tender chicken in rich tomato-cream sauce, served with naan"
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 font-dm-sans text-sm outline-none resize-none"
                  style={{ background: '#F9F4E8', border: '1px solid #E8DDBF', color: '#1C1C1A' }}
                />
                <p className="font-dm-sans text-xs text-right mt-0.5" style={{ color: '#B8A882' }}>
                  {description.length}/200
                </p>
              </div>

              <div>
                <label className="block font-dm-sans text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7A6B55' }}>
                  Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-dm-sans text-sm text-[#7A6B55]">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="299"
                    className="w-full rounded-xl pl-8 pr-4 py-3 font-dm-sans text-sm outline-none"
                    style={{ background: '#F9F4E8', border: '1px solid #E8DDBF', color: '#1C1C1A' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-dm-sans text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#7A6B55' }}>
                  Dietary <span className="font-normal normal-case" style={{ color: '#B8A882' }}>(optional)</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsVeg(true)}
                    className={`flex-1 py-3 rounded-xl font-dm-sans text-sm font-semibold transition-all border ${
                      isVeg ? 'bg-green-50 text-green-700 border-green-500' : 'bg-[#F9F4E8] text-[#7A6B55] border-[#E8DDBF]'
                    }`}
                  >
                    Vegetarian
                  </button>
                  <button
                    onClick={() => setIsVeg(false)}
                    className={`flex-1 py-3 rounded-xl font-dm-sans text-sm font-semibold transition-all border ${
                      !isVeg ? 'bg-red-50 text-red-700 border-red-500' : 'bg-[#F9F4E8] text-[#7A6B55] border-[#E8DDBF]'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => goTo('instructions')} className="flex-1 py-3 rounded-2xl font-dm-sans text-sm" style={{ background: '#F2EAD5', color: '#7A6B55' }}>
                Back
              </button>
              <button
                onClick={() => { if (validateDetails()) goTo('menu-photo') }}
                className="flex-grow py-3 rounded-2xl font-dm-sans font-semibold text-sm"
                style={{ background: '#2B4A2B', color: '#F5F0E8' }}
              >
                Next — Menu photo
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Menu card photo ───────────────────────────────────── */}
        {step === 'menu-photo' && (
          <div className="p-6 space-y-5">
            <div>
              <p className="font-dm-sans font-semibold text-sm" style={{ color: '#1C1C1A' }}>Menu card photo</p>
              <p className="font-dm-sans text-xs mt-1" style={{ color: '#7A6B55' }}>
                1 photo shown on the menu. Pick your best shot — clean, well-lit, appetising.
              </p>
            </div>

            {!menuPreview ? (
              <div
                onClick={() => menuInputRef.current?.click()}
                className="rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                style={{ border: '2px dashed #D4C9A8', background: '#F9F4E8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2B4A2B' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#D4C9A8' }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2EAD5' }}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#7A6B55" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-dm-sans font-semibold text-sm" style={{ color: '#1C1C1A' }}>Tap to select photo</p>
                  <p className="font-dm-sans text-xs mt-0.5" style={{ color: '#B8A882' }}>JPG, PNG or WEBP · Max 10MB</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-video" style={{ background: '#F2EAD5' }}>
                <img src={menuPreview} className="w-full h-full object-cover" alt="Menu photo preview" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => menuInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg font-dm-sans text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.9)', color: '#1C1C1A' }}
                  >
                    Replace
                  </button>
                </div>
                <div
                  className="absolute bottom-0 inset-x-0 px-3 py-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
                >
                  <p className="font-dm-sans text-xs text-white font-semibold">{dishName}</p>
                </div>
              </div>
            )}

            <input ref={menuInputRef} type="file" accept="image/*" className="hidden" onChange={handleMenuPhoto} />

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: '#FDF2F0', border: '1px solid #E8C0B8' }}>
                <p className="font-dm-sans text-sm" style={{ color: '#8B2A1A' }}>{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => goTo('details')} className="flex-1 py-3 rounded-2xl font-dm-sans text-sm" style={{ background: '#F2EAD5', color: '#7A6B55' }}>
                Back
              </button>
              <button
                onClick={() => { if (!menuPhoto) { setError('Please select a menu photo'); return } goTo('angle-photos') }}
                className="flex-grow py-3 rounded-2xl font-dm-sans font-semibold text-sm"
                style={{ background: '#2B4A2B', color: '#F5F0E8' }}
              >
                Next — 3D photos
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 3D angle photos ────────────────────────────────────── */}
        {step === 'angle-photos' && (
          <div className="p-6 space-y-5">
            <div>
              <p className="font-dm-sans font-semibold text-sm" style={{ color: '#1C1C1A' }}>
                3D model photos
                <span className="font-normal ml-2" style={{ color: '#B8A882' }}>{anglePhotos.length}/4</span>
              </p>
              <p className="font-dm-sans text-xs mt-1" style={{ color: '#7A6B55' }}>
                Add up to 4 photos from different angles. Tap the card to add each photo one at a time.
              </p>
            </div>

            {/* Photo slots */}
            <div className="grid grid-cols-2 gap-3">
              {([0, 1, 2, 3] as const).map((i) => (
                <div key={i}>
                  {anglePreviews[i] ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ background: '#F2EAD5' }}>
                      <img src={anglePreviews[i]} className="w-full h-full object-cover" alt={`Angle ${i + 1}`} />
                      <div
                        className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between"
                        style={{ background: 'rgba(0,0,0,0.55)' }}
                      >
                        <span className="font-dm-sans text-xs text-white">{ANGLE_TIPS[i].label}</span>
                        <button
                          onClick={() => removeAnglePhoto(i)}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { if (anglePhotos.length < 4) angleInputRef.current?.click() }}
                      disabled={anglePhotos.length !== i} // enable only the next slot
                      className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                      style={{
                        border: '2px dashed #D4C9A8',
                        background: '#F9F4E8',
                        cursor: anglePhotos.length === i ? 'pointer' : 'not-allowed',
                      }}
                      onMouseEnter={(e) => { if (anglePhotos.length === i) (e.currentTarget as HTMLButtonElement).style.borderColor = '#2B4A2B' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D4C9A8' }}
                    >
                      <span className="font-fraunces text-base" style={{ color: '#B8A882' }}>{ANGLE_TIPS[i].icon}</span>
                      <span className="font-dm-sans text-xs font-semibold" style={{ color: '#B8A882' }}>{ANGLE_TIPS[i].label}</span>
                      {anglePhotos.length === i && (
                        <span className="font-dm-sans text-xs" style={{ color: '#D4C9A8' }}>tap to add</span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <input
              ref={angleInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddAnglePhoto}
            />

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: '#FDF2F0', border: '1px solid #E8C0B8' }}>
                <p className="font-dm-sans text-sm" style={{ color: '#8B2A1A' }}>{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => goTo('menu-photo')} className="flex-1 py-3 rounded-2xl font-dm-sans text-sm" style={{ background: '#F2EAD5', color: '#7A6B55' }}>
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || anglePhotos.length === 0}
                className="flex-grow py-3 rounded-2xl font-dm-sans font-semibold text-sm disabled:opacity-50"
                style={{ background: '#2B4A2B', color: '#F5F0E8' }}
              >
                {uploading
                  ? 'Uploading…'
                  : `Upload${anglePhotos.length > 0 ? ` (${anglePhotos.length} photo${anglePhotos.length > 1 ? 's' : ''})` : ''}`}
              </button>
            </div>

            <p className="font-dm-sans text-xs text-center" style={{ color: '#B8A882' }}>
              1 photo is enough — 4 gives the best 3D quality
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
