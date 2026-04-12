// ─── Core entities ───────────────────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  qrUrl?: string;
  scanCount: number;
  createdAt: string;
}

export type ModelStatus =
  | 'pending'
  | 'bg_removing'
  | 'bg_done'
  | 'generating_3d'
  | 'compressing'
  | 'ready'
  | 'failed';

export type ModelSource = 'procedural' | 'tripo' | 'hunyuan';

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'halted'
  | 'cancelled'
  | 'expired';

export type SlotStatus = 'empty' | 'photos_uploaded' | 'processing' | 'glb_ready';

export interface RestaurantOwner {
  id: string;
  clerkUserId: string;
  ownerName: string;
  email?: string;
  restaurantId: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  restaurantId: string;
  razorpaySubId: string;
  status: SubscriptionStatus;
  amount: number; // paise
  activatedAt?: string;
  nextBillingAt?: string;
  cancelledAt?: string;
  haltedAt?: string;
  createdAt: string;
}

export interface DishSlot {
  id: string;
  restaurantId: string;
  slotNumber: number; // 1-10
  dishName?: string;
  description?: string;
  ingredients?: string;
  price?: number;
  isVeg: boolean;
  status: SlotStatus;
  menuPhotoKey?: string;  // R2 key of single menu/card thumbnail photo
  menuPhotoUrl?: string;  // CDN URL of menu thumbnail (shown on menu card)
  photoKeys: string[];    // R2 keys of 3D-angle photos (up to 4)
  photoUrls?: string[];   // CDN URLs of 3D-angle photos (populated by admin API)
  glbKey?: string;
  glbUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  spiceLevel: number; // 0=none 1=mild 2=medium 3=hot
  allergens: string[];
  isAvailable: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
  modelStatus: ModelStatus;
  modelSource: ModelSource;
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

export interface DishPhoto {
  id: string;
  dishId: string;
  originalKey: string;
  cleanedKey?: string;
  createdAt: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string; code: string };

// ─── Composite API response shapes ───────────────────────────────────────────

export interface MenuResponse {
  restaurant: Restaurant;
  menu: Menu;
}

export interface ModelStatusResponse {
  dishId: string;
  modelStatus: ModelStatus;
  modelSource: ModelSource;
  modelUrl?: string;
}

export interface DashboardResponse {
  owner: RestaurantOwner;
  restaurant: Restaurant;
  subscription: Subscription | null;
  slots: DishSlot[];
}

export interface AdminStats {
  totalRegistered: number;
  totalPaid: number;
  leads: number;
  totalQrScans: number;
}

export interface AdminRestaurant {
  restaurant: Restaurant;
  owner: RestaurantOwner;
  subscription: Subscription | null;
  slotsReady: number;
  slotsWithPhotos: number;
}
