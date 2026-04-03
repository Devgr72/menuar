import { PrismaClient } from '@prisma/client';
import type { ModelStatusResponse } from '@menuar/types';

const prisma = new PrismaClient();

export async function getMenuBySlug(restaurantSlug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
  });

  if (!restaurant) return null;

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

  if (!menu) return null;

  return { restaurant, menu };
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
