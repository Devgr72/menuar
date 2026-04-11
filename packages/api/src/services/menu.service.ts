import { PrismaClient } from '@prisma/client';
import type { ModelStatusResponse } from '@menuar/types';

const prisma = new PrismaClient();

/**
 * Returns menu for the AR customer view.
 * Merges traditional Category/Dish records with DishSlot GLBs (glb_ready slots).
 */
export async function getMenuBySlug(restaurantSlug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
  });

  if (!restaurant) return null;

  // Try to load traditional menu (Category → Dish structure)
  const menu = await prisma.menu.findFirst({
    where: { restaurantId: restaurant.id, isActive: true },
    include: {
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          dishes: {
            where: { isAvailable: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  });

  // Load ready dish slots — these are the primary dish source for SaaS restaurants
  const readySlots = await prisma.dishSlot.findMany({
    where: { restaurantId: restaurant.id, status: 'glb_ready' },
    orderBy: { slotNumber: 'asc' },
  });

  // If no traditional menu but has ready slots, build a synthetic menu shape
  if (!menu && readySlots.length === 0) return null;

  const syntheticMenu = menu ?? {
    id: `slots-${restaurant.id}`,
    restaurantId: restaurant.id,
    name: 'Menu',
    isActive: true,
    categories: [],
  };

  // Build a "Dishes" category from ready slots if any
  if (readySlots.length > 0) {
    const slotsCategory = {
      id: `slots-cat-${restaurant.id}`,
      menuId: syntheticMenu.id,
      name: 'Dishes',
      sortOrder: -1, // shows first
      dishes: readySlots.map((slot) => ({
        id: `slot-${slot.id}`,
        categoryId: `slots-cat-${restaurant.id}`,
        name: slot.dishName ?? `Dish ${slot.slotNumber}`,
        description: slot.description ?? '',
        price: slot.price ?? 0,
        isVeg: slot.isVeg,
        spiceLevel: 0,
        allergens: [] as string[],
        isAvailable: true,
        modelUrl: slot.glbUrl ?? undefined,
        thumbnailUrl: slot.menuPhotoUrl ?? undefined,
        modelStatus: 'ready' as const,
        modelSource: 'tripo' as const,
        aiDescription: undefined,
        translations: {},
        createdAt: slot.createdAt,
      })),
    };

    // Prepend slots category to whatever categories exist
    const existingCategories = 'categories' in syntheticMenu ? syntheticMenu.categories : [];
    return {
      restaurant,
      menu: {
        ...syntheticMenu,
        categories: [slotsCategory, ...existingCategories],
      },
    };
  }

  return { restaurant, menu: syntheticMenu };
}

/** Increments restaurant scan count. Call on each QR scan event (already rate-limited). */
export async function incrementScanCount(restaurantSlug: string): Promise<void> {
  await prisma.restaurant.updateMany({
    where: { slug: restaurantSlug },
    data: { scanCount: { increment: 1 } },
  });
}

export async function getDishById(dishId: string) {
  return prisma.dish.findUnique({ where: { id: dishId } });
}

export async function getDishModelStatus(dishId: string): Promise<ModelStatusResponse | null> {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    select: { id: true, modelStatus: true, modelSource: true, modelUrl: true },
  });

  if (!dish) return null;

  return {
    dishId: dish.id,
    modelStatus: dish.modelStatus as ModelStatusResponse['modelStatus'],
    modelSource: dish.modelSource as ModelStatusResponse['modelSource'],
    modelUrl: dish.modelUrl ?? undefined,
  };
}
