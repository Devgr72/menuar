// ─── Core entities ───────────────────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  spiceLevel: number; // 0 = none, 1 = mild, 2 = medium, 3 = hot
  allergens: string[];
  isAvailable: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
  aiDescription?: string;
  translations?: Record<string, { name: string; description: string }>;
}

export interface Category {
  id: string;
  menuId: string;
  name: string;
  sortOrder: number;
  dishes: Dish[];
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  categories: Category[];
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  qrCode: string;
  qrUrl: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string; code: string };

// ─── Composite API response shapes ───────────────────────────────────────────

export interface MenuResponse {
  restaurant: Restaurant;
  menu: Menu;
}

// ─── Legacy (keep for backwards compat) ──────────────────────────────────────

export interface HelloMenuAR { message: string; }
