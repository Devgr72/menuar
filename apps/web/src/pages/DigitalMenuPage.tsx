import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { scanMenuPhotos, getMenuScan, publishMenuScan, getDashboard } from '../api/client'
import { MAX_MENU_SCAN_PHOTOS, type MenuScanDraft, type MenuScanCategory, type MenuScanDish } from '@menuar/types'

type Step = 'upload' | 'processing' | 'review' | 'publishing' | 'done' | 'error'

const SCAN_ID_STORAGE_KEY = 'digitalMenuScanId'

function emptyDish(): MenuScanDish {
  return { name: '', description: '', price: 0, ingredients: [], isVeg: false }
}

export default function DigitalMenuPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [photos, setPhotos] = useState<File[]>([])
  const [scanId, setScanId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MenuScanDraft | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [publishSummary, setPublishSummary] = useState<{ categoriesCreated: number; dishesCreated: number } | null>(null)
  const [photosRemaining, setPhotosRemaining] = useState<number | null>(null)

  // Resume an in-progress scan after a reload, if one was left mid-review.
  useEffect(() => {
    const savedScanId = localStorage.getItem(SCAN_ID_STORAGE_KEY)
    if (!savedScanId) return

    getMenuScan(savedScanId)
      .then((result) => {
        if (result.status !== 'ready') {
          localStorage.removeItem(SCAN_ID_STORAGE_KEY)
          return
        }
        setScanId(result.scanId)
        setDraft(result.draft)
        setStep('review')
      })
      .catch(() => localStorage.removeItem(SCAN_ID_STORAGE_KEY))
  }, [])

  // How many of the lifetime 20-photo allowance this restaurant has left.
  useEffect(() => {
    getDashboard()
      .then((data) => setPhotosRemaining(MAX_MENU_SCAN_PHOTOS - data.restaurant.photosUsed))
      .catch(() => setPhotosRemaining(MAX_MENU_SCAN_PHOTOS))
  }, [])

  const maxSelectable = Math.max(0, photosRemaining ?? MAX_MENU_SCAN_PHOTOS)

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return
    const selected = Array.from(fileList).slice(0, maxSelectable)
    setPhotos(selected)
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleScan() {
    setStep('processing')
    try {
      const result = await scanMenuPhotos(photos)
      setScanId(result.scanId)
      setDraft(result.draft)
      setPhotosRemaining(result.photosRemaining)
      localStorage.setItem(SCAN_ID_STORAGE_KEY, result.scanId)
      setStep('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Menu scan failed')
      setStep('error')
    }
  }

  function updateCategory(index: number, updater: (c: MenuScanCategory) => MenuScanCategory) {
    setDraft((prev) => {
      if (!prev) return prev
      const categories = prev.categories.map((c, i) => (i === index ? updater(c) : c))
      return { categories }
    })
  }

  function removeCategory(index: number) {
    setDraft((prev) => (prev ? { categories: prev.categories.filter((_, i) => i !== index) } : prev))
  }

  function addCategory() {
    setDraft((prev) => ({ categories: [...(prev?.categories ?? []), { name: 'New Category', dishes: [emptyDish()] }] }))
  }

  function updateDish(categoryIndex: number, dishIndex: number, updater: (d: MenuScanDish) => MenuScanDish) {
    updateCategory(categoryIndex, (c) => ({
      ...c,
      dishes: c.dishes.map((d, i) => (i === dishIndex ? updater(d) : d)),
    }))
  }

  function removeDish(categoryIndex: number, dishIndex: number) {
    updateCategory(categoryIndex, (c) => ({ ...c, dishes: c.dishes.filter((_, i) => i !== dishIndex) }))
  }

  function addDish(categoryIndex: number) {
    updateCategory(categoryIndex, (c) => ({ ...c, dishes: [...c.dishes, emptyDish()] }))
  }

  async function handlePublish() {
    if (!scanId || !draft) return
    setStep('publishing')
    try {
      const summary = await publishMenuScan(scanId, draft)
      setPublishSummary(summary)
      localStorage.removeItem(SCAN_ID_STORAGE_KEY)
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed')
      setStep('error')
    }
  }

  const totalDishes = draft?.categories.reduce((sum, c) => sum + c.dishes.length, 0) ?? 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 lg:p-12">
      <main className="max-w-5xl mx-auto space-y-8">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-[#94A3B8] hover:text-[#0F2747] mb-4">
            ← Back to dashboard
          </button>
          <h1 className="font-fraunces text-3xl font-bold text-[#0F2747]">Scan your menu</h1>
          <p className="font-outfit text-[#64748B] mt-1">
            Upload photos of your physical menu and Gemini will read the dishes for you.
          </p>
        </div>

        {step === 'upload' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F1F5F9] space-y-6">
            {photosRemaining !== null && (
              <div
                className={`rounded-2xl px-5 py-4 border text-sm ${
                  maxSelectable > 0
                    ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]'
                    : 'bg-[#FEF2F2] border-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                {maxSelectable > 0 ? (
                  <>
                    <p className="font-bold">
                      {photosRemaining} of {MAX_MENU_SCAN_PHOTOS} photo uploads remaining
                    </p>
                    <p className="mt-1 text-[#B45309]">
                      This is a lifetime limit, so make each one count — use clear, well-lit photos, taken
                      straight-on, that show your dishes and prices clearly.
                    </p>
                  </>
                ) : (
                  <p className="font-bold">
                    You've used all {MAX_MENU_SCAN_PHOTOS} of your photo uploads. Contact support to request more.
                  </p>
                )}
              </div>
            )}

            <label
              className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                maxSelectable > 0
                  ? 'border-[#E2E8F0] cursor-pointer hover:border-[#FF6B00]'
                  : 'border-[#E2E8F0] opacity-50 cursor-not-allowed'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={maxSelectable === 0}
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <p className="font-outfit font-semibold text-[#0F2747]">
                Click to select up to {maxSelectable} photo{maxSelectable === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-[#94A3B8] mt-1">JPG or PNG, one photo per menu page</p>
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="relative rounded-xl overflow-hidden border border-[#F1F5F9]">
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={photos.length === 0}
              className="w-full bg-[#FF6B00] hover:bg-[#E85F00] disabled:bg-slate-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Scan {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'menu'}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="font-outfit font-semibold text-[#0F2747]">Reading your menu with AI…</p>
            <p className="text-sm text-[#94A3B8] mt-1">This can take up to a minute for {photos.length} photos.</p>
          </div>
        )}

        {step === 'review' && draft && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-outfit font-semibold text-[#0F2747]">
                Found {totalDishes} dish{totalDishes === 1 ? '' : 'es'} across {draft.categories.length} categor
                {draft.categories.length === 1 ? 'y' : 'ies'}
              </p>
              <button onClick={addCategory} className="text-sm font-bold text-[#FF6B00]">+ Add category</button>
            </div>

            {draft.categories.map((category, ci) => (
              <div key={ci} className="bg-white rounded-3xl p-6 shadow-sm border border-[#F1F5F9] space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    value={category.name}
                    onChange={(e) => updateCategory(ci, (c) => ({ ...c, name: e.target.value }))}
                    className="font-fraunces text-lg font-bold text-[#0F2747] border-b border-transparent focus:border-[#FF6B00] outline-none flex-1"
                  />
                  <button onClick={() => removeCategory(ci)} className="text-xs font-bold text-[#EF4444]">Remove category</button>
                </div>

                {category.dishes.map((dish, di) => (
                  <div key={di} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-4 rounded-2xl bg-[#F8FAFC]">
                    <input
                      value={dish.name}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, name: e.target.value }))}
                      placeholder="Dish name"
                      className="sm:col-span-3 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      value={dish.description}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, description: e.target.value }))}
                      placeholder="Description"
                      className="sm:col-span-4 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={dish.price}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, price: Number(e.target.value) }))}
                      placeholder="Price"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      value={dish.ingredients.join(', ')}
                      onChange={(e) =>
                        updateDish(ci, di, (d) => ({
                          ...d,
                          ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="Ingredients (comma separated)"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <label className="sm:col-span-1 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={dish.isVeg}
                        onChange={(e) => updateDish(ci, di, (d) => ({ ...d, isVeg: e.target.checked }))}
                      />
                      Veg
                    </label>
                    <button
                      onClick={() => removeDish(ci, di)}
                      className="sm:col-span-12 text-left text-xs font-bold text-[#EF4444]"
                    >
                      Remove dish
                    </button>
                  </div>
                ))}

                <button onClick={() => addDish(ci)} className="text-sm font-bold text-[#FF6B00]">+ Add dish</button>
              </div>
            ))}

            <button
              onClick={handlePublish}
              disabled={totalDishes === 0}
              className="w-full bg-[#FF6B00] hover:bg-[#E85F00] disabled:bg-slate-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Publish menu ({totalDishes} dish{totalDishes === 1 ? '' : 'es'})
            </button>
          </div>
        )}

        {step === 'publishing' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="font-outfit font-semibold text-[#0F2747]">Publishing your menu…</p>
          </div>
        )}

        {step === 'done' && publishSummary && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-fraunces text-xl font-bold text-[#0F2747] mb-2">Menu published!</p>
            <p className="text-sm text-[#64748B] mb-6">
              Added {publishSummary.dishesCreated} dish{publishSummary.dishesCreated === 1 ? '' : 'es'} across{' '}
              {publishSummary.categoriesCreated} new categor{publishSummary.categoriesCreated === 1 ? 'y' : 'ies'}.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-semibold rounded-xl py-3 px-8 text-sm transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center text-3xl border-4 border-red-100">
              ⚠️
            </div>
            <p className="font-fraunces text-xl font-bold text-[#0F2747] mb-2">Something went wrong</p>
            <p className="text-sm text-[#64748B] mb-6">{errorMsg}</p>
            <button
              onClick={() => setStep('upload')}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-semibold rounded-xl py-3 px-8 text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
