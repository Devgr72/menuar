# Digital Menu — Gemini OCR Autofill

**Status:** Approved
**Date:** 2026-07-30

## Problem

Restaurant owners currently enter dishes one at a time (or not at all — the `Menu`/`Category`/`Dish` tables are populated only by a default "Dishes" category created at subscription activation). There is no bulk way to digitize a physical paper menu. This feature lets an owner photograph their existing menu (up to 20 photos) and have dish records auto-extracted and reviewed before being saved.

An earlier version of this design used Google Cloud Vision API for OCR, but that path was blocked on GCP billing not being enabled on the project. This spec replaces that approach with the Gemini 2.5 Flash API, which does OCR + structured extraction in a single multimodal call instead of raw-text OCR followed by separate parsing.

## Decisions

These were confirmed with the user before writing this spec:

1. **Review before save.** Extracted dishes land on an editable review screen; nothing is written to the live `Category`/`Dish` tables until the owner explicitly publishes.
2. **Infer categories.** Gemini groups dishes under the section headers it sees on the menu photo (e.g. "Starters", "Main Course") and these become `Category` records, rather than dumping everything into one flat list.
3. **Dedicated page**, not a modal. The flow (upload → processing → review grid → publish) gets its own route, `/dashboard/digital-menu`, linked from a card/button on `RestaurantDashboardPage`. A modal doesn't have room to review potentially dozens of dishes.

## Non-goals

- Fuzzy deduplication of newly-extracted dishes against dishes that already exist in the catalog from a prior scan or manual entry. The review step is the safeguard against duplicates; automatic dedupe is a possible future improvement, not part of this build.
- Async job queue / polling. The Gemini call happens synchronously inside the upload request. If this proves too slow in practice for 20 photos, that's a follow-up, not a redesign.
- Editing dish 3D models / AR — this feature only touches the text-based `Menu`/`Category`/`Dish` system, entirely separate from the `DishSlot` AR pipeline.

## Architecture / data flow

```
RestaurantDashboardPage → "Scan your menu" → DigitalMenuPage (/dashboard/digital-menu)

1. Upload step (≤20 photos, client-side thumbnails/remove)
   → POST /api/v1/menu-scan  (multipart, requireAuth)
     - each photo saved to R2 under menu-scans/{restaurantId}/{scanId}/page-{n}.jpg
     - all photos uploaded to Gemini Files API
     - single generateContent call on gemini-2.5-flash with a responseSchema
       forcing back: { categories: [ { name, dishes: [ { name, description,
       price, ingredients: string[], isVeg } ] } ] }
     - result validated with zod
     - MenuScan row created: status='ready', draft=<validated result>
     - response: { scanId, draft }

2. Review step (owner edits client-side; nothing persisted yet)
   - edit/remove dish fields (name, description, price, ingredients, veg toggle)
   - rename/add/remove category
   - add a dish manually
   - "Publish menu" button

3. Publish step
   → POST /api/v1/menu-scan/:id/publish  (body = the edited draft)
     - for each category in the draft: upsert a Category by name (case-
       insensitive) under the restaurant's Menu, appending to sortOrder
     - create a Dish row per dish under the resolved categoryId
     - MenuScan.status='published', publishedAt=now
   → client navigates back to dashboard
```

If the owner reloads the page mid-review, `GET /api/v1/menu-scan/:id` reloads the last-saved draft (in-progress client-side edits since that load are not recovered — acceptable, since a full re-scan is cheap and the alternative is auto-saving every keystroke, which isn't worth the complexity here).

## Backend changes

**New model — `MenuScan`** (`packages/api/src/db/models/MenuScan.ts`):

| field | type | notes |
|---|---|---|
| `_id` | string | via existing `genId()` helper, consistent with other models |
| `restaurantId` | string, ref `Restaurant` | |
| `status` | `'ready' \| 'published' \| 'discarded'` | no `'failed'` status — a failed Gemini call returns an error to the client without ever creating a row |
| `photoKeys` | string[] | R2 keys of the original uploaded photos, kept for audit/reprocessing |
| `draft` | Mixed | `{ categories: [{ name, sortOrder, dishes: [{ name, description, price, ingredients, isVeg }] }] }` |
| `geminiModel` | string | e.g. `'gemini-2.5-flash'`, for audit if the model version changes later |
| `createdAt` | Date | |
| `publishedAt` | Date? | |

**`Dish` model** (`packages/api/src/db/models/Dish.ts`) gains `ingredients: string[]` (default `[]`), mirrored in `packages/types/src/index.ts`.

**New service `packages/api/src/services/gemini.service.ts`**:
- `getGeminiClient()` — lazy singleton, same pattern as `getClient()` in `razorpay.service.ts`. Reads `GEMINI_API_KEY` from env.
- `extractMenuFromPhotos(photos: { buffer: Buffer; mimeType: string }[]): Promise<MenuScanDraft>`:
  - uploads each photo through the Gemini Files API (not inlined as base64 — 20 photos at a few MB each can exceed inline request-size limits; the Files API has no such per-request ceiling)
  - one `generateContent` call referencing all uploaded files, with a system instruction describing the extraction task and a `responseSchema` (`responseMimeType: 'application/json'`) matching the `MenuScanDraft` shape
  - parses and validates the JSON response with zod; throws a typed error (e.g. `GeminiExtractionError`) on malformed/empty output, which the route maps to a 422 with a user-facing message ("Couldn't read the menu — try clearer or better-lit photos")

**New routes `packages/api/src/routes/menuScan.routes.ts`**, mounted at `/api/v1/menu-scan`, all `requireAuth` and scoped to the caller's own restaurant (looked up the same way `subscription.routes.ts` and `auth.routes.ts` do, via `RestaurantOwner.findOne({ userId })`):
- `POST /` — multer (memory storage, up to 20 files, ~8MB/file) → R2 upload → Gemini extraction → `MenuScan` creation → returns `{ scanId, draft }`
- `GET /:id` — returns a scan's current `draft` (must belong to caller's restaurant)
- `POST /:id/publish` — body is the (possibly edited) draft; upserts `Category`/`Dish` rows; marks the scan published

**Env**: `GEMINI_API_KEY` added to `packages/api/.env` and `.env.example` (`.env` is already gitignored). `@google/genai` added as a dependency of `packages/api`.

## Frontend changes

- **`apps/web/src/pages/DigitalMenuPage.tsx`** at route `/dashboard/digital-menu`, wrapped in `<ProtectedRoute require="active">` (same guard as the dashboard — this is a paid-tier feature).
- Entry point: a new card/button on `RestaurantDashboardPage.tsx` ("Scan your menu").
- Local state machine mirroring the existing `PaymentCallbackPage`/`DishPhotoUploadModal` patterns: `'upload' | 'processing' | 'review' | 'publishing' | 'done' | 'error'`.
  - **Upload**: select/drag up to 20 images, thumbnail previews, per-photo remove, "Scan Menu" button.
  - **Processing**: spinner ("Reading your menu with AI…").
  - **Review**: dishes grouped by category; each dish card is editable (name, description, price, ingredients as a tag input, veg/non-veg toggle, delete); category-level rename/add/delete; "add dish manually" affordance; dish/category counts; "Publish menu" button.
  - **Publishing → done**: success state, navigate back to `/dashboard`.
- New functions in `apps/web/src/api/client.ts`: `scanMenuPhotos(files)`, `getMenuScan(id)`, `publishMenuScan(id, draft)`.
- New shared types in `packages/types/src/index.ts`: `MenuScanDraft`, `MenuScanDraftCategory`, `MenuScanDraftDish`; `Dish` type gets `ingredients?: string[]`.

## Also in scope: the "Check Again" polling bug

Separately from this feature, fix the confirmed bug in `PaymentCallbackPage.tsx`: the "Check Again" button (shown after the 40s poll times out) only calls `setState('loading')` — it doesn't actually restart the polling loop, since that `useEffect` already exited. The button should re-trigger a fresh poll (e.g. by moving the poll logic into a `useCallback` that both the mount effect and the button's `onClick` can invoke, or by keying the effect off a retry counter).

## Testing

No automated test harness exists in this repo. Verification will be:
- `tsc --noEmit` on `packages/api` and `apps/web` after each change
- A manual smoke test of `gemini.service.ts` against a real menu photo before wiring it into the route
- Running the dev server and driving the full upload → review → publish flow in a browser, then confirming the resulting `Category`/`Dish` rows via the existing dashboard/menu views
