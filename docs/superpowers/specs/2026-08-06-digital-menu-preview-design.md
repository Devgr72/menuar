# Digital Menu Preview — Design

Date: 2026-08-06
Status: Approved

## Problem

Restaurant owners have no way to see what their digital menu looks like to customers without physically scanning their printed QR code. They need a "Preview" option on the dashboard that shows them exactly what a customer sees after scanning: the public, slug-keyed menu page at `/ar/:restaurantSlug`, including any AR-enabled dishes.

Investigating the existing customer-facing page (`MenuARPage.tsx`) surfaced two real bugs that a preview would immediately expose to owners, so they're in scope for this change too:

1. Category grouping from the API is discarded client-side — all dishes render in one flat list regardless of category.
2. The dish detail panel unconditionally shows a 3D `<model-viewer>` and "View on Table (AR)" button, even for dishes with no `modelUrl` (all current OCR-scanned dishes are text-only, no 3D model) — this looks broken.

## Scope

**In scope:**
- "Preview Digital Menu" button on the restaurant dashboard, linking to the real public menu page.
- A `?preview=1` flag so preview visits don't inflate the real QR scan-count analytics.
- Fix category grouping so the customer view groups dishes under category headers.
- Fix the dish detail panel to only show the AR/3D viewer when a dish actually has a `modelUrl`, falling back to a static photo (`thumbnailUrl`) or emoji placeholder otherwise.

**Out of scope (not touched by this change):**
- Attaching photos to OCR-scanned dishes (`thumbnailUrl` is never set today by the OCR publish flow) — that's a separate gap in the OCR pipeline, not something this preview feature needs to fix to function correctly.
- Per-table QR codes (`Table`/`QrCode` models exist but are unwired dead code) — unrelated to previewing the menu itself.
- Any redesign of `MenuARPage`'s visual style — only the grouping/AR-fallback bugs are fixed, not a broader visual pass.

## Design

### 1. Dashboard button

`RestaurantDashboardPage.tsx` gets a "Preview Menu" button placed inside the existing QR/Engagement card, alongside `QRCodeDisplay`. It's gated on the same `hasDigitalMenu` condition already used for the Edit/Create Digital Menu CTA (`restaurant.photosUsed > 0`), so it's hidden until the owner actually has menu content.

Clicking it calls `window.open(`/ar/${restaurant.slug}?preview=1`, '_blank')`, opening the real public customer page in a new tab. No new route, no new backend endpoint, no iframe — the owner sees the literal page/URL customers get from the QR code.

### 2. Preview mode flag

`MenuARPage.tsx` reads `preview` from the URL query string (`useSearchParams`). When `preview=1` is present, the scan-tracking effect that calls `recordQRScan(restaurantSlug)` on mount is skipped. This is a frontend-only conditional around the existing fire-and-forget call — no backend changes needed, since the scan-count increment is triggered entirely from the frontend effect.

No visible "preview mode" banner is shown — the rendered page is pixel-identical to what a real customer sees, aside from not incrementing the counter.

### 3. Category grouping fix

`useMenu.ts` currently flattens `menu.categories.flatMap(c => c.dishes)` into a single `dishes` array, discarding category boundaries the API already returns. This changes to preserve the `categories` array (each with its own `dishes[]`).

`MenuARPage.tsx` changes its rendering from one flat "Signature Dishes" list to mapping over `categories`, rendering each category's name as a header followed by that category's dishes in a `MenuDishCard` grid. The synthetic `"Dishes"` category (built server-side from ready `DishSlot` AR-pipeline entries, `sortOrder: -1`) continues to render first since the backend already prepends it.

### 4. AR fallback fix

In `DishInfoPanel`, the `<model-viewer>` element and "View on Table (AR)" button are only rendered when `dish.modelUrl` is truthy. When `modelUrl` is absent:
- If `dish.thumbnailUrl` exists, show it as a static image instead of the 3D viewer.
- If neither exists, keep the current 🍽️ emoji placeholder.

This removes the misleading "AR is not supported on this device" failure state for dishes that were never meant to have AR in the first place.

## Testing

- Manual verification in the browser (dev server): click Preview from the dashboard, confirm it opens `/ar/:slug?preview=1` in a new tab, confirm scan count on the dashboard does not increment after repeated preview opens, confirm categories now render as separate grouped sections, confirm a text-only (OCR) dish shows a photo/emoji fallback instead of a broken AR button while a dish with a real `modelUrl` still shows the 3D viewer and AR button correctly.
- No new backend routes or schema changes, so no new automated backend tests are required; existing `menu.service.ts` / `menuScan` tests (if any) are unaffected.
