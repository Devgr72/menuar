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
} from '../api/client'
import { MAX_MENU_SCAN_PHOTOS, type Category, type Dish } from '@menuar/types'

export default function EditDigitalMenuPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [photosRemaining, setPhotosRemaining] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')

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
                  <div key={dish.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-4 rounded-2xl bg-[#F8FAFC]">
                    <input
                      defaultValue={dish.name}
                      onBlur={(e) => handleDishFieldBlur(dish.id, { name: e.target.value })}
                      placeholder="Dish name"
                      className="sm:col-span-3 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      defaultValue={dish.description}
                      onBlur={(e) => handleDishFieldBlur(dish.id, { description: e.target.value })}
                      placeholder="Description"
                      className="sm:col-span-4 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      defaultValue={dish.price}
                      onBlur={(e) => handleDishFieldBlur(dish.id, { price: Number(e.target.value) })}
                      placeholder="Price"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      defaultValue={(dish.ingredients ?? []).join(', ')}
                      onBlur={(e) =>
                        handleDishFieldBlur(dish.id, {
                          ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Ingredients (comma separated)"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <label className="sm:col-span-1 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={dish.isVeg}
                        onChange={(e) => handleVegToggle(category.id, dish.id, e.target.checked)}
                      />
                      Veg
                    </label>
                    <button
                      onClick={() => handleDeleteDish(category.id, dish.id)}
                      className="sm:col-span-12 text-left text-xs font-bold text-[#EF4444]"
                    >
                      Remove dish
                    </button>
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
