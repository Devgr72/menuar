// ─── Core entities ───────────────────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  qrUrl?: string;
  scanCount: number;
  photosUsed: number;
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
  slotNumber: number; // 1-3
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
  usdzKey?: string;
  usdzUrl?: string;
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
  ingredients?: string[];
  isAvailable: boolean;
  modelUrl?: string;
  usdzUrl?: string;
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
  newInquiries: number;
}

/** A landing-page contact submission or newsletter sign-up. */
export type InquiryType = 'contact' | 'newsletter';
export type InquiryStatus = 'new' | 'read' | 'archived';

export interface Inquiry {
  id: string;
  type: InquiryType;
  name: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
}

export interface AdminRestaurant {
  restaurant: Restaurant;
  owner: RestaurantOwner;
  subscription: Subscription | null;
  slotsReady: number;
  slotsWithPhotos: number;
}

// ─── Digital menu scan (Gemini OCR) ──────────────────────────────────────────

/** Lifetime cap on menu photos a single restaurant may ever upload across all scans. */
export const MAX_MENU_SCAN_PHOTOS = 20;

export interface MenuScanDish {
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  isVeg: boolean;
}

export interface MenuScanCategory {
  name: string;
  dishes: MenuScanDish[];
}

export interface MenuScanDraft {
  categories: MenuScanCategory[];
}

export type MenuScanStatus = 'ready' | 'published' | 'discarded';

export interface MenuScanResponse {
  scanId: string;
  draft: MenuScanDraft;
  photosUsed: number;
  photosRemaining: number;
}

export interface MenuScanStatusResponse {
  scanId: string;
  status: MenuScanStatus;
  draft: MenuScanDraft;
}

export interface MenuScanPublishResponse {
  categoriesCreated: number;
  dishesCreated: number;
}

// ─── Digital menu editing (owner-facing CRUD on the live text menu) ─────────

export interface MenuEditResponse {
  menuId: string;
  categories: Category[];
}

export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name: string;
}

export interface CreateDishInput {
  name: string;
  description?: string;
  price: number;
  ingredients?: string[];
  isVeg?: boolean;
}

export interface UpdateDishInput {
  name?: string;
  description?: string;
  price?: number;
  ingredients?: string[];
  isVeg?: boolean;
}
