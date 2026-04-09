import { useEffect, useState } from 'react';
import type { Dish, MenuResponse, Restaurant, Menu } from '@menuar/types';
import { menuClient } from '../api/menuClient';
import { recordQRScan } from '../api/client';

// ─── Mock data — used when API is unavailable or no restaurantSlug in URL ────
const PLACEHOLDER_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
// Local test GLBs
const PIZZA_DEMO_MODEL = '/models/pizza_demo.glb';
const BUNSHIN_DEMO_MODEL = '/models/bunshin_demo.glb';

const MOCK_RESTAURANT: Restaurant = {
  id: 'demo',
  name: 'Pizza Palace',
  slug: 'pizza-palace',
  plan: 'free',
  scanCount: 0,
  createdAt: new Date().toISOString(),
};

const MOCK_DISHES: Dish[] = [
  { id: '1', categoryId: 'c1', name: 'Margherita', description: 'Classic tomato base, fresh mozzarella, basil.', price: 12.99, isVeg: true, spiceLevel: 0, allergens: ['gluten', 'dairy'], isAvailable: true, modelUrl: PIZZA_DEMO_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
  { id: '2', categoryId: 'c1', name: 'Pepperoni Feast', description: 'Generous layers of pepperoni on rich tomato sauce.', price: 15.99, isVeg: false, spiceLevel: 1, allergens: ['gluten', 'dairy'], isAvailable: true, modelUrl: PIZZA_DEMO_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
  { id: '3', categoryId: 'c1', name: 'BBQ Chicken', description: 'Smoky BBQ sauce, grilled chicken, caramelised onions.', price: 16.99, isVeg: false, spiceLevel: 1, allergens: ['gluten', 'dairy'], isAvailable: true, modelUrl: PIZZA_DEMO_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
  { id: '4', categoryId: 'c1', name: 'Truffle Fungi', description: 'Wild mushrooms, truffle oil, mozzarella, rosemary.', price: 18.99, isVeg: true, spiceLevel: 0, allergens: ['gluten', 'dairy'], isAvailable: true, modelUrl: PIZZA_DEMO_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
  { id: '5', categoryId: 'c2', name: 'Bunshin Ramen', description: 'Rich tonkotsu broth, chashu pork, soft egg, nori, spring onion.', price: 14.99, isVeg: false, spiceLevel: 1, allergens: ['gluten', 'dairy', 'egg'], isAvailable: true, modelUrl: BUNSHIN_DEMO_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
  { id: '6', categoryId: 'c3', name: 'Tiramisu', description: 'Espresso-soaked ladyfingers, mascarpone cream, cocoa.', price: 7.99, isVeg: true, spiceLevel: 0, allergens: ['gluten', 'dairy', 'egg'], isAvailable: true, modelUrl: PLACEHOLDER_MODEL, modelStatus: 'ready', modelSource: 'procedural' },
];

const MOCK_MENU: Menu = {
  id: 'menu-demo',
  restaurantId: 'demo',
  name: 'Main Menu',
  isActive: true,
  categories: [
    { id: 'c1', menuId: 'menu-demo', name: 'Pizzas', sortOrder: 1, dishes: MOCK_DISHES.slice(0, 4) },
    { id: 'c2', menuId: 'menu-demo', name: 'Ramen', sortOrder: 2, dishes: MOCK_DISHES.slice(4, 5) },
    { id: 'c3', menuId: 'menu-demo', name: 'Desserts', sortOrder: 3, dishes: MOCK_DISHES.slice(5) },
  ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseMenuResult {
  restaurant: Restaurant;
  dishes: Dish[];
  loading: boolean;
  usingMockData: boolean;
}

export function useMenu(restaurantSlug?: string): UseMenuResult {
  const [data, setData] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(!!restaurantSlug);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    if (!restaurantSlug) {
      setUsingMockData(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Fire QR scan event (fire-and-forget, rate-limited server-side)
    recordQRScan(restaurantSlug);

    menuClient
      .getMenu(restaurantSlug)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setUsingMockData(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUsingMockData(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [restaurantSlug]);

  // Flatten dishes from all categories
  const categories = data?.menu.categories ?? MOCK_MENU.categories;
  const dishes = categories.flatMap((c) => c.dishes);

  return {
    restaurant: data?.restaurant ?? MOCK_RESTAURANT,
    dishes,
    loading,
    usingMockData,
  };
}
