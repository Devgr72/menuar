import { Restaurant, Menu, Category, Dish, DishSlot } from '../db/models/index.js';
import type { ModelStatusResponse } from '@menuar/types';

/**
 * Returns menu for the AR customer view.
 * Merges traditional Category/Dish records with DishSlot GLBs (glb_ready slots).
 */
export async function getMenuBySlug(restaurantSlug: string) {
  const restaurant = await Restaurant.findOne({ slug: restaurantSlug }).lean();
  if (!restaurant) return null;

  const restaurantView = {
    id: restaurant._id,
    name: restaurant.name,
    slug: restaurant.slug,
    plan: restaurant.plan,
    qrUrl: restaurant.qrUrl,
    scanCount: restaurant.scanCount,
    createdAt: restaurant.createdAt,
  };

  // Try to load traditional menu (Category → Dish structure)
  const menuDoc = await Menu.findOne({ restaurantId: restaurant._id, isActive: true }).lean();

  let categories: Array<{ id: string; menuId: string; name: string; sortOrder: number; dishes: unknown[] }> = [];
  if (menuDoc) {
    const categoryDocs = await Category.find({ menuId: menuDoc._id }).sort({ sortOrder: 1 }).lean();
    const categoryIds = categoryDocs.map((c) => c._id);
    const dishDocs = await Dish.find({ categoryId: { $in: categoryIds }, isAvailable: true })
      .sort({ name: 1 })
      .lean();

    const dishesByCategory: Record<string, typeof dishDocs> = {};
    for (const d of dishDocs) (dishesByCategory[d.categoryId] ??= []).push(d);

    categories = categoryDocs.map((c) => ({
      id: c._id,
      menuId: c.menuId,
      name: c.name,
      sortOrder: c.sortOrder,
      dishes: (dishesByCategory[c._id] || []).map((d) => ({
        id: d._id,
        categoryId: d.categoryId,
        name: d.name,
        description: d.description,
        price: d.price,
        isVeg: d.isVeg,
        spiceLevel: d.spiceLevel,
        allergens: d.allergens,
        isAvailable: d.isAvailable,
        modelUrl: d.modelUrl,
        thumbnailUrl: d.thumbnailUrl,
        modelStatus: d.modelStatus,
        modelSource: d.modelSource,
        aiDescription: d.aiDescription,
        translations: d.translations,
        createdAt: d.createdAt,
      })),
    }));
  }

  // Load ready dish slots — these are the primary dish source for SaaS restaurants
  const readySlots = await DishSlot.find({ restaurantId: restaurant._id, status: 'glb_ready' })
    .sort({ slotNumber: 1 })
    .lean();

  if (!menuDoc && readySlots.length === 0) return null;

  const menuId = menuDoc ? menuDoc._id : `slots-${restaurant._id}`;
  const menuName = menuDoc ? menuDoc.name : 'Menu';
  const menuIsActive = menuDoc ? menuDoc.isActive : true;

  // Build a "Dishes" category from ready slots if any
  if (readySlots.length > 0) {
    const slotsCategory = {
      id: `slots-cat-${restaurant._id}`,
      menuId,
      name: 'Dishes',
      sortOrder: -1, // shows first
      dishes: readySlots.map((slot) => ({
        id: `slot-${slot._id}`,
        categoryId: `slots-cat-${restaurant._id}`,
        name: slot.dishName ?? `Dish ${slot.slotNumber}`,
        description: slot.description ?? '',
        price: slot.price ?? 0,
        isVeg: slot.isVeg,
        spiceLevel: 0,
        allergens: [] as string[],
        isAvailable: true,
        modelUrl: slot.glbUrl,
        thumbnailUrl: slot.menuPhotoUrl,
        modelStatus: 'ready' as const,
        modelSource: 'tripo' as const,
        aiDescription: undefined,
        translations: {},
        createdAt: slot.createdAt,
      })),
    };

    return {
      restaurant: restaurantView,
      menu: {
        id: menuId,
        restaurantId: restaurant._id,
        name: menuName,
        isActive: menuIsActive,
        categories: [slotsCategory, ...categories],
      },
    };
  }

  return {
    restaurant: restaurantView,
    menu: { id: menuId, restaurantId: restaurant._id, name: menuName, isActive: menuIsActive, categories },
  };
}

/** Increments restaurant scan count. Call on each QR scan event (already rate-limited). */
export async function incrementScanCount(restaurantSlug: string): Promise<void> {
  await Restaurant.updateMany({ slug: restaurantSlug }, { $inc: { scanCount: 1 } });
}

export async function getDishById(dishId: string) {
  const dish = await Dish.findById(dishId).lean();
  if (!dish) return null;

  return {
    id: dish._id,
    categoryId: dish.categoryId,
    name: dish.name,
    description: dish.description,
    price: dish.price,
    isVeg: dish.isVeg,
    spiceLevel: dish.spiceLevel,
    allergens: dish.allergens,
    isAvailable: dish.isAvailable,
    modelUrl: dish.modelUrl,
    thumbnailUrl: dish.thumbnailUrl,
    modelStatus: dish.modelStatus,
    modelSource: dish.modelSource,
    aiDescription: dish.aiDescription,
    translations: dish.translations,
  };
}

export async function getDishModelStatus(dishId: string): Promise<ModelStatusResponse | null> {
  const dish = await Dish.findById(dishId).select('modelStatus modelSource modelUrl').lean();
  if (!dish) return null;

  return {
    dishId: dish._id,
    modelStatus: dish.modelStatus as ModelStatusResponse['modelStatus'],
    modelSource: dish.modelSource as ModelStatusResponse['modelSource'],
    modelUrl: dish.modelUrl ?? undefined,
  };
}
