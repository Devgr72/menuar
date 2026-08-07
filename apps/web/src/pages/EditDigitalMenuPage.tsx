import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMenuEdit,
  createMenuCategory,
  renameMenuCategory,
  deleteMenuCategory,
  createMenuDish,
  updateMenuDish,
  deleteMenuDish,
  getDashboard,
  uploadDishPhoto,
} from '../api/client'
import { MAX_MENU_SCAN_PHOTOS, type Category, type Dish } from '@menuar/types'

export default function EditDigitalMenuPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [photosRemaining, setPhotosRemaining] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')
  const [uploadingDishId, setUploadingDishId] = useState<string | null>(null)

  useEffect(() => {
    getMenuEdit()
      .then((result) => setCategories(result.categories))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load your menu'))

    getDashboard()
      .then((data) => setPhotosRemaining(MAX_MENU_SCAN_PHOTOS - data.restaurant.photosUsed))
      .catch(() => setPhotosRemaining(null))
  }, [])

  function patchCategoryLocal(categoryId: string, updater: (c: Category) => Category) {
    setCategories((prev) => prev?.map((c) => (c.id === categoryId ? updater(c) : c)) ?? prev)
  }

  function patchDishLocal(categoryId: string, dishId: string, updater: (d: Dish) => Dish) {
    patchCategoryLocal(categoryId, (c) => ({
      ...c,
      dishes: c.dishes.map((d) => (d.id === dishId ? updater(d) : d)),
    }))
  }

  async function handleRenameCategory(categoryId: string, name: string) {
    try {
      await renameMenuCategory(categoryId, { name })
    } catch {
      setLoadError('Failed to save category name')
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!window.confirm('Delete this category and all its dishes? This cannot be undone.')) return
    try {
      await deleteMenuCategory(categoryId)
      setCategories((prev) => prev?.filter((c) => c.id !== categoryId) ?? prev)
    } catch {
      setLoadError('Failed to delete category')
    }
  }

  async function handleAddCategory() {
    try {
      const category = await createMenuCategory({ name: 'New Category' })
      setCategories((prev) => [...(prev ?? []), category])
    } catch {
      setLoadError('Failed to create category')
    }
  }

  async function handleAddDish(categoryId: string) {
    try {
      const dish = await createMenuDish(categoryId, { name: 'New Dish', price: 0 })
      patchCategoryLocal(categoryId, (c) => ({ ...c, dishes: [...c.dishes, dish] }))
    } catch {
      setLoadError('Failed to add dish')
    }
  }

  async function handleDeleteDish(categoryId: string, dishId: string) {
    try {
      await deleteMenuDish(dishId)
      patchCategoryLocal(categoryId, (c) => ({ ...c, dishes: c.dishes.filter((d) => d.id !== dishId) }))
    } catch {
      setLoadError('Failed to delete dish')
    }
  }

  async function handleDishFieldBlur(dishId: string, patch: Partial<Dish>) {
    try {
      await updateMenuDish(dishId, patch)
    } catch {
      setLoadError('Failed to save dish')
    }
  }

  async function handleVegToggle(categoryId: string, dishId: string, isVeg: boolean) {
    patchDishLocal(categoryId, dishId, (d) => ({ ...d, isVeg }))
    try {
      await updateMenuDish(dishId, { isVeg })
    } catch {
      setLoadError('Failed to save dish')
    }
  }

  async function handlePhotoUpload(categoryId: string, dishId: string, file: File) {
    if (!file) return
    setUploadingDishId(dishId)
    try {
      const { thumbnailUrl } = await uploadDishPhoto(dishId, file)
      patchDishLocal(categoryId, dishId, (d) => ({ ...d, thumbnailUrl }))
    } catch {
      setLoadError('Failed to upload photo')
    } finally {
      setUploadingDishId(null)
    }
  }

  const totalDishes = categories?.reduce((sum, c) => sum + c.dishes.length, 0) ?? 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 lg:p-12">
      <main className="max-w-5xl mx-auto space-y-8">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-[#94A3B8] hover:text-[#0F2747] mb-4">
            ← Back to dashboard
          </button>
          <h1 className="font-fraunces text-3xl font-bold text-[#0F2747]">Edit your digital menu</h1>
          <p className="font-outfit text-[#64748B] mt-1">
            Changes here save automatically and go live on your public menu right away.
          </p>
        </div>

        {loadError && (
          <div className="rounded-2xl px-5 py-4 bg-[#FEF2F2] border border-[#FEE2E2] text-sm text-[#991B1B]">
            {loadError}
          </div>
        )}

        {categories === null ? (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="font-outfit font-semibold text-[#0F2747]">Loading your menu…</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-outfit font-semibold text-[#0F2747]">
                {totalDishes} dish{totalDishes === 1 ? '' : 'es'} across {categories.length} categor
                {categories.length === 1 ? 'y' : 'ies'}
              </p>
              <button onClick={handleAddCategory} className="text-sm font-bold text-[#FF6B00]">+ Add category</button>
            </div>

            {categories.length === 0 && (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed border-[#E2E8F0]">
                <p className="text-[#94A3B8] font-medium">No dishes yet.</p>
                <p className="text-sm text-[#94A3B8]">Scan your menu or add a category to get started.</p>
              </div>
            )}

            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#F1F5F9] space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    defaultValue={category.name}
                    onBlur={(e) => handleRenameCategory(category.id, e.target.value)}
                    className="font-fraunces text-lg font-bold text-[#0F2747] border-b border-transparent focus:border-[#FF6B00] outline-none flex-1"
                  />
                  <button onClick={() => handleDeleteCategory(category.id)} className="text-xs font-bold text-[#EF4444]">
                    Remove category
                  </button>
                </div>

                {category.dishes.map((dish) => (
                  <div key={dish.id} className="relative p-5 rounded-2xl bg-[#F8FAFC] border border-slate-100 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      {/* Photo Upload */}
                      <div className="shrink-0 w-full sm:w-28 h-40 sm:h-28 rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-[#FF6B00] transition-colors">
                        {dish.thumbnailUrl ? (
                          <img src={dish.thumbnailUrl} alt={dish.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-slate-400 group-hover:text-[#FF6B00] flex flex-col items-center gap-1.5 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Add Photo</span>
                          </div>
                        )}
                        
                        {uploadingDishId === dish.id && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePhotoUpload(category.id, dish.id, file)
                          }}
                        />
                      </div>

                      <div className="flex-1 w-full space-y-4">
                        {/* Header: Name and Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="sm:col-span-8">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dish Name</label>
                            <input
                              defaultValue={dish.name}
                              onBlur={(e) => handleDishFieldBlur(dish.id, { name: e.target.value })}
                              placeholder="e.g. Margherita Pizza"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                              <input
                                type="number"
                                defaultValue={dish.price}
                                onBlur={(e) => handleDishFieldBlur(dish.id, { price: Number(e.target.value) })}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all shadow-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Textareas: Description & Ingredients */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                            <textarea
                              defaultValue={dish.description}
                              onBlur={(e) => handleDishFieldBlur(dish.id, { description: e.target.value })}
                              placeholder="Describe the dish..."
                              rows={2}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all resize-none shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ingredients (Comma separated)</label>
                            <textarea
                              defaultValue={(dish.ingredients ?? []).join(', ')}
                              onBlur={(e) =>
                                handleDishFieldBlur(dish.id, {
                                  ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="e.g. Tomato, Cheese, Basil"
                              rows={2}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all resize-none shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Veg Toggle & Remove Button */}
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shadow-sm transition-colors ${dish.isVeg ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white group-hover:border-green-500'}`}>
                          {dish.isVeg && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={dish.isVeg}
                          onChange={(e) => handleVegToggle(category.id, dish.id, e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">Vegetarian</span>
                      </label>
                      <button
                        onClick={() => handleDeleteDish(category.id, dish.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Remove dish
                      </button>
                    </div>
                  </div>
                ))}

                <button onClick={() => handleAddDish(category.id)} className="text-sm font-bold text-[#FF6B00]">+ Add dish</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#0F2747] rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-fraunces text-lg font-bold text-white">Scan more photos</h3>
            <p className="font-outfit text-sm text-white/60 mt-1">
              {photosRemaining !== null && photosRemaining > 0
                ? `You have ${photosRemaining} of ${MAX_MENU_SCAN_PHOTOS} photo uploads left. New dishes are added to this same menu.`
                : `You've used all ${MAX_MENU_SCAN_PHOTOS} of your photo uploads — add dishes manually above instead.`}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/digital-menu')}
            disabled={photosRemaining !== null && photosRemaining <= 0}
            className="flex-none w-full sm:w-auto text-sm font-bold text-white bg-[#FF6B00] hover:bg-[#E85F00] disabled:bg-white/10 disabled:text-white/40 transition-colors px-6 py-3 rounded-xl"
          >
            Scan More Photos
          </button>
        </div>
      </main>
    </div>
  )
}
