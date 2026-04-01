# MVP Scope — What to Build First

## MVP Goal
A working demo that proves the "wow moment": scan QR → camera → see a 3D dish on your table.

One restaurant can use this end-to-end before we build anything else.

---

## MVP Feature List (build in this order)

### Sprint 1 — AR Core (Week 1-2)
Priority: Get the AR experience working. This is the product.

- [ ] **WebAR scaffold** — Mind AR + Three.js + React integrated and rendering a cube on a surface
- [ ] **GLTF model loader** — Load a real food 3D model (use free models from Sketchfab for now)
- [ ] **Surface detection** — Place model on detected flat surface (table top)
- [ ] **Camera permission flow** — Ask for permission, explain why, handle denied gracefully
- [ ] **Basic dish overlay UI** — Show dish names as scrollable pills at bottom of AR screen
- [ ] **Dish tap interaction** — Tap a dish name → its 3D model appears/swaps in AR scene
- [ ] **Model interaction** — Pinch to scale, drag to rotate the 3D model
- [ ] **Dish info panel** — Slide up panel with dish name, price, description, veg badge, spice level
- [ ] **Close/reset** — Tap outside model or "close" to reset AR scene

### Sprint 2 — Data Layer (Week 2-3)
Priority: Real data from a real database.

- [ ] **Prisma schema** — Restaurant, Menu, Category, Dish tables
- [ ] **Seed script** — One demo restaurant with 8-10 dishes seeded
- [ ] **GET /api/menu/:restaurantSlug** — Returns full menu with dish metadata + model URLs
- [ ] **GET /api/dish/:dishId** — Returns single dish details
- [ ] **QR code generation** — Generate unique QR per table that encodes restaurant + table ID
- [ ] **URL routing** — `/ar/:restaurantSlug?table=:tableId` loads correct menu in AR

### Sprint 3 — Restaurant Dashboard (Week 3-4)
Priority: A restaurant owner can manage their menu without touching code.

- [ ] **Auth** — Clerk login/signup for restaurant owners
- [ ] **Menu manager** — Add/edit/delete dishes, categories
- [ ] **Dish form** — Name, price, description, veg/non-veg, spice level, allergens
- [ ] **Photo upload** — Upload dish photo (stored in Cloudflare R2)
- [ ] **3D model upload** — Upload GLB file manually (AI generation comes in v2)
- [ ] **QR code page** — View and download QR codes for each table
- [ ] **Toggle dish availability** — Mark dishes as unavailable (real-time update)

### Sprint 4 — AI Layer (Week 4-5)
Priority: Reduce manual work for restaurants.

- [ ] **AI dish description** — On dish creation, auto-generate description via Claude API
  - Prompt: Given dish name + cuisine type + price, generate 2-sentence description + ingredients + why it's priced this way
- [ ] **Auto-translation** — Translate dish name + description to user's browser language (Google Translate API)
- [ ] **Allergen detection** — Claude API infers likely allergens from dish name/ingredients

---

## MVP Non-Goals (do NOT build in MVP)
- AR photo mode / social sharing
- Portion size comparison
- Customisation preview (extra cheese etc.)
- Analytics dashboard
- Swiggy/Zomato integration
- Multi-branch support
- Payments / billing (use mock subscription for first 3 pilot restaurants)
- White-label
- Native app
- Image target tracking (use surface tracking for MVP — simpler)

---

## Demo Script (for sales pitch to restaurants)
1. Open phone camera, scan QR code on table
2. Tap "Allow Camera" 
3. Screen shows camera view with dish name pills at bottom
4. Tap "Veg Truffle Caesar"
5. 3D salad model appears on table — rotates gently
6. Drag it around, pinch to resize
7. Tap dish card at bottom → slide-up panel with description, price, ingredients
8. Tap another dish → model swaps to that dish
9. That's the wow moment. Close the pitch.

---

## Definition of Done for MVP
- [ ] Works on iPhone Safari and Android Chrome
- [ ] QR → AR loads in under 5 seconds on 4G
- [ ] At least one real restaurant menu loaded (not just seeds)
- [ ] At least 5 real 3D dish models (mix of AI-generated + hand-modelled)
- [ ] Restaurant owner can update a dish name and it reflects in AR within 60 seconds
- [ ] Graceful fallback when AR not supported (show 2D spinning model + dish info)
