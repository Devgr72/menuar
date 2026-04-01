# Claude Code Prompts — Session Starters

Use these exact prompts when starting Claude Code for each sprint.
Copy-paste them directly into Claude Code.

---

## Sprint 1 — AR Core (Start here)

**Session 1 — Project scaffold:**
```
Read CLAUDE.md and docs/MVP_SCOPE.md. Then scaffold the monorepo structure:
- Create apps/web with React 18 + Vite + TypeScript + Tailwind + Three.js + Zustand
- Create packages/api with Node.js + Express + TypeScript + Prisma
- Create packages/types with the types from packages/types/src/index.ts
- Set up turbo.json so `npm run dev` starts all three simultaneously
- Add .env.example to root
Do NOT build any features yet — just the working scaffold with hello world.
```

**Session 2 — AR scene foundation:**
```
Read CLAUDE.md and docs/AR_CONCEPT.md first. Then in apps/web:
1. Install mind-ar and three.js
2. Create src/ar/useARScene.ts — a custom hook that initializes Mind AR with Three.js, handles camera permission request, surface detection, and cleanup on unmount
3. Create src/pages/MenuARPage.tsx that uses this hook and renders a full-screen camera view
4. Create src/components/CameraPermissionScreen.tsx for the permission prompt UI (shown before AR starts)
5. Create src/components/ARFallback.tsx for when AR is not supported (show 2D model-viewer instead)
The AR scene should just show a rotating cube for now — real dish models come next.
```

**Session 3 — 3D model loading:**
```
Read docs/AR_CONCEPT.md. In apps/web/src/ar/:
1. Create modelLoader.ts — a utility that loads GLTF/GLB files using Three.js GLTFLoader + DRACOLoader, caches loaded models in a Map (don't reload same model twice), and keeps each model under 2MB
2. Update useARScene.ts to accept a modelUrl prop and display the loaded model on the detected surface
3. Create src/components/DishStrip.tsx — a horizontal scrollable pill row at the bottom of the AR screen showing dish names and thumbnails
4. Wire it up: tapping a pill in DishStrip changes the active model in the AR scene
Use placeholder GLB models from: https://modelviewer.dev/shared-assets/models/Astronaut.glb for now
```

---

## Sprint 2 — Data Layer

**Session 4 — Database + API:**
```
Read CLAUDE.md and docs/ARCHITECTURE.md. In packages/api:
1. Run prisma migrate with the schema in packages/api/prisma/schema.prisma
2. Create src/routes/menu.routes.ts with GET /api/v1/menu/:restaurantSlug
3. Create src/services/menu.service.ts with the database query logic
4. Create a seed script at prisma/seed.ts that creates one demo restaurant "Spice Garden" with 3 categories and 8 dishes (mix of veg/non-veg)
5. Add Zod validation to the route
Return type must match MenuWithCategories from packages/types
```

**Session 5 — Connect web app to API:**
```
Read CLAUDE.md. In apps/web:
1. Create src/api/menuClient.ts — typed fetch client for GET /api/v1/menu/:restaurantSlug
2. Create src/hooks/useMenu.ts — hook that fetches menu data based on URL params (restaurantSlug from react-router)
3. Update MenuARPage.tsx to use real menu data from useMenu hook
4. Update DishStrip to show real dish names from the API
5. The URL format is /ar/:restaurantSlug?table=:tableId — extract both params
```

**Session 6 — QR codes:**
```
Read CLAUDE.md. In packages/api:
1. Create src/routes/table.routes.ts with:
   - POST /api/v1/dashboard/tables — create a table, generate QR URL
   - GET /api/v1/dashboard/tables/:id/qr — return QR code as PNG
2. Create src/services/qr.service.ts using the `qrcode` npm package
   - QR encodes: https://menuar.app/ar/:restaurantSlug?table=:tableId
   - Error correction level H (survives damage on printed cards)
   - Return as base64 PNG and as buffer (for download)
```

---

## Sprint 3 — Dashboard

**Session 7 — Dashboard scaffold:**
```
Read CLAUDE.md. In apps/dashboard:
1. Set up React 18 + Vite + TypeScript + Tailwind
2. Install and configure Clerk for auth
3. Create a basic layout with sidebar navigation: Menu, Tables, QR Codes, Settings
4. Create src/pages/MenuPage.tsx — shows list of categories and dishes
5. Create src/pages/TablesPage.tsx — shows table list with QR code download buttons
All pages should be auth-protected (redirect to Clerk login if not signed in)
```

**Session 8 — Dish management:**
```
Read CLAUDE.md. In apps/dashboard src/pages:
1. Create DishFormPage.tsx — form to add/edit a dish with all fields:
   name, price, isVeg toggle, spiceLevel (0-3 selector), allergens (multi-select), 
   description textarea, photo upload (shows preview), GLB file upload
2. Create src/api/dishClient.ts with typed fetch for POST/PUT/DELETE dish endpoints
3. Add "Generate AI Description" button that calls POST /api/v1/dashboard/dishes/:id/generate-description
4. Use React Hook Form + Zod for validation
5. Photo uploads go directly to Cloudflare R2 via presigned URL
```

---

## Sprint 4 — AI Layer

**Session 9 — Claude API integration:**
```
Read CLAUDE.md. In packages/api/src/services:
1. Create ai.service.ts that calls Anthropic Claude API (claude-sonnet-4-20250514)
2. Implement generateDishDescription(dishName, cuisineType, price, isVeg):
   - Returns { description, ingredients, allergens, priceContext }
   - Parse response as JSON
   - Use the prompt template in docs/TECH_STACK.md
3. Create translation.service.ts using Google Translate API:
   - translateDish(dish, targetLanguage) returns translated name + description
   - Cache translations in the dish's translations JSON column
4. Add POST /api/v1/dashboard/dishes/:id/generate-description route that calls this service
```

---

## Debugging Prompts (use when things break)

**AR not working on phone:**
```
The AR experience is not working on my phone. Check docs/AR_CONCEPT.md for 
the HTTPS requirement and camera permission handling. The error is: [paste error].
Check if we're handling camera permission denied gracefully and showing the fallback.
```

**3D model too large:**
```
The GLB model at [url] is [size]MB which exceeds our 2MB budget.
Check docs/AR_CONCEPT.md for the optimization command.
Add a file size check in the model upload endpoint that rejects models over 2MB.
```

**Types mismatch:**
```
There's a TypeScript error: [paste error]. 
Check packages/types/src/index.ts for the correct types.
The API response should match ApiSuccess<T> from our shared types package.
```
