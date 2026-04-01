# Architecture — System Design

## System Overview

```
Customer Phone
    │
    ▼ scans QR code
Browser (Safari/Chrome)
    │
    ▼ GET /ar/:restaurantSlug?table=3
Vercel (apps/web) ──── fetches menu ──── Railway API ──── PostgreSQL
    │                                          │
    ▼ serves WebAR SPA                         └──── Cloudflare R2
AR Experience                                        (3D model files)
    │
    ▼ loads GLB on dish tap
Cloudflare CDN ←── GLB files served at edge


Restaurant Owner
    │
    ▼ logs in
Vercel (apps/dashboard)
    │
    ├── Clerk Auth
    ├── Railway API (CRUD menus/dishes)
    ├── Cloudflare R2 (upload 3D models + photos)
    └── Claude API (AI descriptions, allergen detection)
```

---

## API Routes

### Public (no auth — called by AR experience)

```
GET  /api/v1/menu/:restaurantSlug
     → Returns full menu tree (categories + dishes + model URLs)
     → Cached at CDN for 60s

GET  /api/v1/dish/:dishId
     → Returns single dish with full AI description, translations

GET  /api/v1/restaurant/:slug
     → Returns restaurant metadata (name, logo, cuisine type, theme)

POST /api/v1/analytics/view
     → Track dish view { dishId, tableId, sessionId }
     → Fire-and-forget, non-blocking
```

### Dashboard (Clerk auth required)

```
GET    /api/v1/dashboard/restaurant
POST   /api/v1/dashboard/restaurant

GET    /api/v1/dashboard/menus
POST   /api/v1/dashboard/menus
PUT    /api/v1/dashboard/menus/:id
DELETE /api/v1/dashboard/menus/:id

GET    /api/v1/dashboard/categories
POST   /api/v1/dashboard/categories

GET    /api/v1/dashboard/dishes
POST   /api/v1/dashboard/dishes
PUT    /api/v1/dashboard/dishes/:id
DELETE /api/v1/dashboard/dishes/:id
PATCH  /api/v1/dashboard/dishes/:id/availability

POST   /api/v1/dashboard/dishes/:id/generate-description  ← Claude API
POST   /api/v1/dashboard/dishes/:id/generate-model        ← Meshy.ai

GET    /api/v1/dashboard/tables
POST   /api/v1/dashboard/tables
GET    /api/v1/dashboard/tables/:id/qr                   ← QR code PNG

GET    /api/v1/dashboard/analytics/views                  ← dish view counts
GET    /api/v1/dashboard/analytics/popular                ← most viewed dishes
```

---

## Data Flow: Customer Experience

```
1. Customer scans QR code (encodes: https://menuar.app/ar/spice-garden?table=4)

2. Browser navigates to URL

3. React app loads → reads URL params → extracts restaurantSlug + tableId

4. Fetch /api/v1/menu/spice-garden
   Response: {
     restaurant: { name, logo, theme },
     categories: [
       {
         name: "Starters",
         dishes: [
           { id, name, price, isVeg, spiceLevel, thumbnailUrl, modelUrl, description }
         ]
       }
     ]
   }

5. AR initializes → surface detected → scene ready

6. Dish strip renders at bottom with dish thumbnails + names

7. User taps "Paneer Tikka" →
   - Fetch /api/v1/dish/:id (if detailed info needed, otherwise use cached menu data)
   - GLB file fetched from CDN: https://cdn.menuar.app/models/:dishId.glb
   - Previous model disposed from Three.js scene
   - New model added to anchor group with scale animation

8. User taps info icon → slide-up panel with full dish details

9. POST /api/v1/analytics/view { dishId, tableId, sessionId: uuid() }
```

---

## Data Flow: Restaurant Onboarding

```
1. Restaurant owner signs up via Clerk

2. Creates restaurant profile (name, cuisine, address, logo)

3. Creates menu → adds categories → adds dishes:
   - Fills in name, price, veg/non-veg, spice level
   - Uploads dish photo(s)
   - Clicks "Generate AI Description" → Claude API returns description
   - Either: uploads their own GLB file
   - Or: clicks "Generate 3D Model" → sends photos to Meshy.ai → polls for result

4. Adds tables (1-50) → each gets a unique QR code

5. Downloads QR codes as PNG → prints them → places on tables

6. Menu is live immediately
```

---

## Monorepo Structure (Turborepo)

```
menuar/
├── turbo.json              ← Turborepo pipeline config
├── package.json            ← Root package (workspaces)
├── apps/
│   ├── web/               ← Customer AR experience
│   │   ├── package.json   (react, vite, three, mind-ar, zustand, tailwind)
│   │   ├── vite.config.ts
│   │   └── src/
│   └── dashboard/         ← Restaurant admin
│       ├── package.json   (react, vite, clerk, tailwind, react-query)
│       ├── vite.config.ts
│       └── src/
└── packages/
    ├── api/               ← Express backend
    │   ├── package.json   (express, prisma, clerk-sdk, anthropic, qrcode)
    │   └── src/
    ├── types/             ← Shared TypeScript types
    │   └── src/index.ts   (Restaurant, Menu, Dish, etc.)
    └── api-client/        ← Typed fetch client (shared by web + dashboard)
        └── src/index.ts
```

---

## Shared Types (packages/types)

```typescript
export interface Restaurant {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  cuisineType: string
  plan: 'starter' | 'growth' | 'enterprise'
}

export interface Dish {
  id: string
  name: string
  description: string
  aiDescription: string | null
  price: number
  currency: string
  isVeg: boolean
  spiceLevel: 0 | 1 | 2 | 3    // 0=none, 1=mild, 2=medium, 3=hot
  allergens: string[]
  modelUrl: string | null        // CDN URL to GLB file
  thumbnailUrl: string | null
  isAvailable: boolean
  translations: Record<string, { name: string; description: string }>
}

export interface MenuWithCategories {
  id: string
  name: string
  restaurant: Restaurant
  categories: Array<{
    id: string
    name: string
    sortOrder: number
    dishes: Dish[]
  }>
}
```

---

## Security Considerations

- Restaurant API routes protected by Clerk JWT middleware
- Public menu routes are read-only, rate-limited (100 req/min per IP)
- 3D model URLs are public CDN URLs (acceptable — dish models aren't sensitive)
- Table IDs are UUIDs (not sequential — prevents enumeration)
- QR codes encode full HTTPS URLs (not API keys — safe to print publicly)
- Camera stream never leaves the device (WebAR is client-side only)
- No user data stored from AR experience (only anonymous session analytics)
