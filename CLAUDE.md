# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?

MenuAR is a WebAR restaurant menu platform. Customers scan a QR code per table → browser opens camera → 3D dish models appear floating on the table in AR (no app required). Restaurants manage their menu via a dashboard. B2B SaaS — restaurants pay, customers use free.

Core UX: scan QR → camera activates → dish name pills on screen → tap dish → 3D model appears → pinch/rotate → tap dish card → slide-up info panel.

---

## Commands

```bash
# Install all workspace dependencies
npm install

# Run everything (Turborepo)
npm run dev

# Run individual apps
cd apps/web && npm run dev        # AR web app on port 3000
cd packages/api && npm run dev    # API on port 3001 (tsx watch)

# Build
npm run build                     # builds all packages in dependency order
cd apps/web && npm run build      # tsc + vite build

# Lint
npm run lint
cd apps/web && npm run lint       # ESLint, max-warnings 0

# Database
cd packages/api && npx prisma migrate dev    # run migrations
cd packages/api && npx prisma generate      # regenerate Prisma client
cd packages/api && npx prisma studio        # visual DB browser
```

**Note:** `packages/types` must build before `apps/web` and `packages/api` — Turborepo handles this automatically via `"dependsOn": ["^build"]`.

---

## Architecture

This is a **npm workspaces + Turborepo monorepo** with three packages:

### `packages/types` — shared types
- Single source of truth for TypeScript interfaces shared across frontend and API
- Compiled to `dist/` before other packages build
- Add shared types here; never duplicate them in app code

### `apps/web` — customer-facing AR experience
- React 18 + Vite, served on port 3000
- **AR layer** (`src/ar/`): All Mind AR + Three.js logic lives exclusively in custom hooks here. Never put Three.js code in JSX components.
  - `useARScene.ts` — current entry point: camera permission, MindAR init/cleanup, Three.js renderer lifecycle
  - Mind AR is initialized only after explicit user gesture (browser requirement)
  - Always cap `pixelRatio` at `Math.min(window.devicePixelRatio, 2)`
  - Always dispose geometries/materials/textures on unmount
  - Never load multiple GLTF models simultaneously — queue them
- **UI layer** (`src/components/`): Pure React UI, no AR/Three.js logic
- **State** (`src/store/`): Zustand — lightweight global state
- **Pages** (`src/pages/`): Route-level components. Currently `MenuARPage` is the only page (wired directly in `App.tsx`, no router yet)
- Currently deployed: AR scaffold with rotating cube on an image target, camera permission flow, AR fallback for unsupported devices

### `packages/api` — Express backend
- Node.js + Express + Prisma, run via `tsx watch`
- Currently a skeleton: only a `GET /` health check endpoint
- **Layer boundaries**: routes (`src/routes/`) handle only request/response; business logic goes in services (`src/services/`); all queries through service layer, never in routes
- All routes use Zod validation on request body
- All errors return `{ error: string, code: string }`
- Auth middleware on all `/dashboard` routes; rate limiting on all public routes
- Prisma schema (`prisma/schema.prisma`) currently only has `Restaurant` model — full schema (Table, Menu, Category, Dish, DishView) still needs to be built

### `apps/dashboard` — restaurant admin panel (not yet scaffolded)
- Planned: React + Vite, Clerk auth, menu management UI

---

## Current Build State (MVP Sprint Progress)

**Sprint 1 (AR Core) — in progress:**
- [x] WebAR scaffold — Mind AR + Three.js + React rendering a cube on image target
- [x] Camera permission flow + graceful AR fallback component
- [ ] GLTF model loader (load real food models)
- [ ] Dish overlay UI (scrollable pills at bottom)
- [ ] Dish tap → 3D model swap
- [ ] Pinch/rotate model interaction
- [ ] Dish info slide-up panel

**Sprint 2–4** (data layer, dashboard, AI) not started.

See `docs/MVP_SCOPE.md` for the full ordered feature list. Read `docs/AR_CONCEPT.md` before touching AR code.

---

## Code Rules

### TypeScript
- Strict mode always (`"strict": true` in all tsconfigs)
- No `any` — use `unknown` with type guards
- Define types/interfaces before implementing functions
- Shared types only in `packages/types/src/index.ts`

### React
- Functional components only
- Props typed with explicit interface (not inline)
- Components stay under 150 lines — extract if larger
- File naming: `PascalCase.tsx` for components, `useXxx.ts` for hooks, `camelCase.ts` for utils

### AR / Three.js
- All Three.js/Mind AR logic in `apps/web/src/ar/` custom hooks — never in JSX
- MindAR import uses `@ts-ignore` (no official types): `import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'`
- Three.js is pinned to `0.149.0` (root `overrides`) — do not upgrade without checking Mind AR compatibility
- For MVP, use **surface tracking** (not image target tracking) — simpler, no `.mind` file needed per menu
- The current scaffold uses an image target (demo `.mind` file from CDN); swap to surface tracking for real deployment
- Always handle AR-not-supported: show `ARFallback` with 2D content

### API
- Routes in `src/routes/` (kebab-case paths, e.g. `/api/v1/dish-views`)
- Use Prisma transactions for multi-table writes
- Never raw SQL
- All API calls from frontend go through a typed client (to be created at `packages/api-client/`)

### Models
- GLTF/GLB only, Draco-compressed, max 2MB per model
- Lazy load on tap — never preload all dish models
- Store in Cloudflare R2; serve via CDN URL

### Environment variables
- All vars documented in `.env.example` before use
- Backend vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLOUDFLARE_R2_*`, `ANTHROPIC_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`, `MESHY_API_KEY`
- Frontend vars (Vite): `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_MINDAR_LICENSE`

### Constraints
- HTTPS only — camera/AR APIs require secure context
- Mobile-first (375–430px). Desktop secondary.
- WebAR only — never suggest native app approaches
- QR is per-table, not per-dish — one QR opens the full menu AR experience
- AR experience is anonymous — no user personal data stored
- Do not add npm packages without checking bundle size impact
