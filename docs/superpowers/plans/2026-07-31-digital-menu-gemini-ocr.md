# Digital Menu — Gemini OCR Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a restaurant owner photograph their physical paper menu (up to 20 photos), have Gemini 2.5 Flash extract dishes grouped by category, review/edit the results, and publish them into the live `Menu`/`Category`/`Dish` tables. Also fix the confirmed "Check Again" polling bug on `PaymentCallbackPage`.

**Architecture:** One synchronous backend endpoint uploads photos to Gemini's Files API and runs a single `generateContent` call with a JSON `responseSchema`, validated with zod, persisted as a `MenuScan` draft row. A dedicated frontend page drives upload → processing → review → publish, with nothing written to `Category`/`Dish` until the owner explicitly publishes.

**Tech Stack:** Express + Mongoose (existing), `@google/genai` (new), zod (existing), React Router (existing).

## Global Constraints

- Up to 20 photos per scan (matches spec)
- Nothing is written to live `Category`/`Dish` tables until the owner publishes (review-before-save, per approved spec)
- Gemini infers categories from menu section headers; no flat-list fallback UI needed
- Feature lives at its own route, `/dashboard/digital-menu`, not a modal
- Scan processing is synchronous (single HTTP request/response) — no job queue or polling
- No fuzzy dedup against dishes already in the catalog — the review step is the safeguard (explicit non-goal)
- Model is `gemini-2.5-flash`, key read from `GEMINI_API_KEY` env var
- No automated test harness exists in this repo — every task's verification step is `tsc --noEmit` plus a manual/scripted smoke check, matching how the prior payment-polling fix in this session was verified
- Spec source of truth: `docs/superpowers/specs/2026-07-30-digital-menu-gemini-ocr-design.md`

---

### Task 1: Backend + shared data model changes

**Files:**
- Modify: `packages/api/src/db/models/Dish.ts`
- Create: `packages/api/src/db/models/MenuScan.ts`
- Modify: `packages/api/src/db/models/index.ts`
- Modify: `packages/api/src/services/menu.service.ts:41-58,127-143`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: nothing (foundational task)
- Produces:
  - `Dish.ingredients: string[]` (Mongoose field, default `[]`)
  - `MenuScan` Mongoose model, fields: `_id, restaurantId, status: 'ready'|'published'|'discarded', photoKeys: string[], draft: MenuScanDraft, geminiModel: string, createdAt, publishedAt?`
  - Shared types in `@menuar/types`: `MenuScanDish { name, description, price, ingredients: string[], isVeg }`, `MenuScanCategory { name, dishes: MenuScanDish[] }`, `MenuScanDraft { categories: MenuScanCategory[] }`, `MenuScanStatus`, `MenuScanResponse { scanId, draft }`, `MenuScanStatusResponse { scanId, status, draft }`, `MenuScanPublishResponse { categoriesCreated, dishesCreated }`, and `Dish.ingredients?: string[]` added to the existing `Dish` interface (optional, so existing mock data / call sites don't need updating)

- [ ] **Step 1: Add `ingredients` to the `Dish` model**

Edit `packages/api/src/db/models/Dish.ts`, add to `IDish` (after `allergens: string[];`):

```ts
  ingredients: string[];
```

And to `dishSchema` (after `allergens: { type: [String], default: [] },`):

```ts
    ingredients: { type: [String], default: [] },
```

- [ ] **Step 2: Create the `MenuScan` model**

Create `packages/api/src/db/models/MenuScan.ts`:

```ts
import mongoose, { Schema } from 'mongoose';
import { genId } from '../id.js';
import type { MenuScanDraft } from '@menuar/types';

export type MenuScanStatus = 'ready' | 'published' | 'discarded';

export interface IMenuScan {
  _id: string;
  restaurantId: string;
  status: MenuScanStatus;
  photoKeys: string[];
  draft: MenuScanDraft;
  geminiModel: string;
  createdAt: Date;
  publishedAt?: Date;
}

const menuScanSchema = new Schema(
  {
    _id: { type: String, default: genId },
    restaurantId: { type: String, ref: 'Restaurant', required: true },
    status: { type: String, enum: ['ready', 'published', 'discarded'], default: 'ready' },
    photoKeys: { type: [String], default: [] },
    draft: { type: Schema.Types.Mixed, required: true },
    geminiModel: { type: String, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const MenuScan: mongoose.Model<any, any, any, any, any, any> =
  mongoose.models.MenuScan || mongoose.model('MenuScan', menuScanSchema);
```

- [ ] **Step 3: Export `MenuScan` from the models barrel**

Edit `packages/api/src/db/models/index.ts`, add:

```ts
export { MenuScan } from './MenuScan.js';
```

- [ ] **Step 4: Add shared types to `@menuar/types`**

Edit `packages/types/src/index.ts`. Add `ingredients?: string[];` to the existing `Dish` interface, right after `allergens: string[];` (line 83):

```ts
  allergens: string[];
  ingredients?: string[];
```

Then append this new block near the bottom of the file (after the `AdminRestaurant` interface):

```ts
// ─── Digital menu scan (Gemini OCR) ──────────────────────────────────────────

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
```

- [ ] **Step 5: Return `ingredients` from the customer-facing menu service**

Edit `packages/api/src/services/menu.service.ts`. In `getMenuBySlug`, inside the `dishes: (dishesByCategory[c._id] || []).map((d) => ({ ... }))` block, add a line after `allergens: d.allergens,`:

```ts
        allergens: d.allergens,
        ingredients: d.ingredients,
```

In `getDishById`, add a line after `allergens: dish.allergens,`:

```ts
    allergens: dish.allergens,
    ingredients: dish.ingredients,
```

(Leave the synthetic `DishSlot`-based category in `getMenuBySlug` untouched — slots don't track structured ingredients, and the field is optional.)

- [ ] **Step 6: Verify types compile**

Run: `cd packages/types && npx tsc --noEmit && cd ../api && npx tsc --noEmit`
Expected: no errors in either package.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/db/models/Dish.ts packages/api/src/db/models/MenuScan.ts packages/api/src/db/models/index.ts packages/api/src/services/menu.service.ts packages/types/src/index.ts
git commit -m "feat: add MenuScan model and Dish.ingredients field for digital menu OCR"
```

---

### Task 2: Gemini extraction service

**Files:**
- Modify: `packages/api/package.json`
- Modify: `packages/api/.env`
- Modify: `packages/api/.env.example`
- Create: `packages/api/src/services/gemini.service.ts`
- Create (temporary, deleted at end of task): `packages/api/scripts/test-gemini-extraction.ts`

**Interfaces:**
- Consumes: `MenuScanDraft` type from `@menuar/types` (Task 1)
- Produces: `extractMenuFromPhotos(photos: { buffer: Buffer; mimeType: string }[]): Promise<MenuScanDraft>` and `export class GeminiExtractionError extends Error {}`, both from `packages/api/src/services/gemini.service.ts`

- [ ] **Step 1: Add the `@google/genai` dependency**

Edit `packages/api/package.json`, add to `"dependencies"` (alphabetical, after `"@menuar/types": "*",`):

```json
    "@google/genai": "^2.15.0",
```

Run from the repo root: `npm install`
Expected: installs cleanly, `packages/api/node_modules/@google/genai` (or the hoisted root `node_modules/@google/genai`) exists.

- [ ] **Step 2: Replace the unused Vision key with `GEMINI_API_KEY` in env files**

Edit `packages/api/.env` — remove the `GOOGLE_VISION_API_KEY=...` line (no longer used, replaced by Gemini) and add a `GEMINI_API_KEY=` line set to the key the user provided earlier in this conversation. **Do not write the literal key value into this plan file, the spec, commit messages, or any other git-tracked file** — `.env` is the only place it belongs; it's gitignored and must stay that way.

Edit `packages/api/.env.example`, add a new section (after the "Third-Party APIs" section):

```
# ── Gemini (digital menu OCR) ───────────────────────────────────────────────
# Get from: aistudio.google.com/apikey
GEMINI_API_KEY=
```

- [ ] **Step 3: Write `gemini.service.ts`**

Create `packages/api/src/services/gemini.service.ts`:

```ts
import { GoogleGenAI, Type, FileState, createUserContent, createPartFromUri } from '@google/genai';
import type { Schema } from '@google/genai';
import { z } from 'zod';
import type { MenuScanDraft } from '@menuar/types';

let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY must be set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export class GeminiExtractionError extends Error {}

const MenuScanDishSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  price: z.number().nonnegative(),
  ingredients: z.array(z.string()).default([]),
  isVeg: z.boolean().default(false),
});

const MenuScanCategorySchema = z.object({
  name: z.string().min(1),
  dishes: z.array(MenuScanDishSchema),
});

const MenuScanDraftSchema = z.object({
  categories: z.array(MenuScanCategorySchema),
});

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      description:
        'One entry per menu section header visible in the photos (e.g. "Starters", "Main Course"). If no section headers are visible, use a single category named "Menu".',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dishes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: {
                  type: Type.STRING,
                  description: 'Any descriptive text printed under the dish name. Empty string if none.',
                },
                price: {
                  type: Type.NUMBER,
                  description: 'Numeric price with no currency symbol, exactly as printed.',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Individual ingredients if listed. Empty array if none listed.',
                },
                isVeg: {
                  type: Type.BOOLEAN,
                  description:
                    'True if marked vegetarian (green dot/icon or the word "veg"), false if marked non-vegetarian (red dot/icon, "chicken", "mutton", "fish", "egg", etc). Best guess if unmarked.',
                },
              },
              required: ['name', 'price', 'isVeg'],
            },
          },
        },
        required: ['name', 'dishes'],
      },
    },
  },
  required: ['categories'],
};

const EXTRACTION_PROMPT = `You are reading photos of a restaurant's physical menu. Extract every dish into structured data.

Rules:
- Group dishes under the section headers printed on the menu (e.g. "Starters", "Main Course", "Desserts", "Beverages"). If a photo has no visible section header, group its dishes under a category named "Menu".
- The same photo set may show the same dish twice (e.g. an overlapping shot) — do not duplicate it.
- If a price has multiple sizes/variants (e.g. "Half 120 / Full 220"), use the higher price and note the sizes in the description.
- Skip anything that is not a dish (restaurant name, tagline, page numbers, decorative text).
- Output must match the provided response schema exactly.`;

const FILE_ACTIVE_POLL_INTERVAL_MS = 500;
const FILE_ACTIVE_POLL_TIMEOUT_MS = 15_000;

async function waitForFileActive(ai: GoogleGenAI, fileName: string): Promise<void> {
  const deadline = Date.now() + FILE_ACTIVE_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const file = await ai.files.get({ name: fileName });
    if (file.state === FileState.ACTIVE) return;
    if (file.state === FileState.FAILED) {
      throw new GeminiExtractionError(`Gemini failed to process an uploaded photo: ${fileName}`);
    }
    await new Promise((r) => setTimeout(r, FILE_ACTIVE_POLL_INTERVAL_MS));
  }
  throw new GeminiExtractionError(`Timed out waiting for Gemini to process an uploaded photo: ${fileName}`);
}

/** Extracts structured dish data from up to 20 menu photos using Gemini 2.5 Flash. */
export async function extractMenuFromPhotos(
  photos: { buffer: Buffer; mimeType: string }[],
): Promise<MenuScanDraft> {
  if (photos.length === 0) {
    throw new GeminiExtractionError('No photos provided');
  }

  const ai = getGeminiClient();

  const uploaded = await Promise.all(
    photos.map((photo, i) =>
      ai.files.upload({
        file: new Blob([photo.buffer], { type: photo.mimeType }),
        config: { mimeType: photo.mimeType, displayName: `menu-page-${i + 1}` },
      }),
    ),
  );

  for (const file of uploaded) {
    if (!file.name) throw new GeminiExtractionError('Gemini did not return a file name after upload');
    await waitForFileActive(ai, file.name);
  }

  const fileParts = uploaded.map((file) => {
    if (!file.uri || !file.mimeType) {
      throw new GeminiExtractionError('Gemini file upload is missing its uri/mimeType');
    }
    return createPartFromUri(file.uri, file.mimeType);
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [createUserContent([EXTRACTION_PROMPT, ...fileParts])],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  } catch (err) {
    throw new GeminiExtractionError(
      `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const text = response.text;
  if (!text) {
    throw new GeminiExtractionError('Gemini returned an empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiExtractionError('Gemini returned malformed JSON');
  }

  const result = MenuScanDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiExtractionError(`Gemini response did not match the expected shape: ${result.error.message}`);
  }

  const nonEmptyCategories = result.data.categories.filter((c) => c.dishes.length > 0);
  if (nonEmptyCategories.length === 0) {
    throw new GeminiExtractionError('No dishes were detected in the uploaded photos');
  }

  return { categories: nonEmptyCategories };
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: no errors. If `ai.files.get({ name })`'s parameter shape doesn't match (the installed SDK version differs from what's documented here), TypeScript will point at the exact line — fix the field name to match what `node_modules/@google/genai/dist/node/node.d.ts` actually declares for `GetFileParameters` and re-run.

- [ ] **Step 5: Manual smoke test against a real menu photo**

Create a throwaway script `packages/api/scripts/test-gemini-extraction.ts`:

```ts
import 'dotenv/config';
import { readFileSync } from 'fs';
import { extractMenuFromPhotos } from '../src/services/gemini.service.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: tsx scripts/test-gemini-extraction.ts <path-to-menu-photo.jpg>');
  process.exit(1);
}

const buffer = readFileSync(path);
const mimeType = path.endsWith('.png') ? 'image/png' : 'image/jpeg';

extractMenuFromPhotos([{ buffer, mimeType }])
  .then((draft) => console.log(JSON.stringify(draft, null, 2)))
  .catch((err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
  });
```

Run: `cd packages/api && npx tsx scripts/test-gemini-extraction.ts <path-to-a-real-menu-photo>`
Expected: prints JSON with a non-empty `categories` array whose dishes roughly match what's on the photo. **Ask the user for a real menu photo to test with if none is available in the repo** — this step must pass against a real image before continuing, since it's the only verification that the Gemini integration and the provided API key actually work end-to-end.

Then delete the script (it was only for this verification step, not part of the shipped app):

```bash
rm packages/api/scripts/test-gemini-extraction.ts
rmdir packages/api/scripts 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json package-lock.json packages/api/.env.example packages/api/src/services/gemini.service.ts
git commit -m "feat: add Gemini 2.5 Flash menu extraction service"
```

(`.env` is gitignored and intentionally not committed.)

---

### Task 3: Menu-scan backend routes

**Files:**
- Create: `packages/api/src/routes/menuScan.routes.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `extractMenuFromPhotos`, `GeminiExtractionError` (Task 2); `MenuScan` model (Task 1); `saveFile` from `packages/api/src/services/storage.service.ts`; `requireAuth` from `packages/api/src/middleware/auth.js`; `genId` from `packages/api/src/db/id.js`; `MenuScanDraft` type from `@menuar/types`
- Produces: router mounted at `/api/v1/menu-scan` with:
  - `POST /` (multipart, field name `photos`, up to 20) → `{ scanId: string, draft: MenuScanDraft }`
  - `GET /:id` → `{ scanId: string, status: MenuScanStatus, draft: MenuScanDraft }`
  - `POST /:id/publish` (body: `MenuScanDraft`) → `{ categoriesCreated: number, dishesCreated: number }`

- [ ] **Step 1: Write `menuScan.routes.ts`**

Create `packages/api/src/routes/menuScan.routes.ts`:

```ts
import { Router, Response } from 'express';
import multer from 'multer';
import { Restaurant, RestaurantOwner, Menu, Category, Dish, MenuScan } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { saveFile } from '../services/storage.service.js';
import { genId } from '../db/id.js';
import { extractMenuFromPhotos, GeminiExtractionError } from '../services/gemini.service.js';
import type { MenuScanDraft } from '@menuar/types';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

/** Looks up the caller's restaurant, or writes a 404 response and returns null. */
async function requireOwnerRestaurant(userId: string, res: Response) {
  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  const restaurant = await Restaurant.findById(owner.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  return { owner, restaurant };
}

/** POST /api/v1/menu-scan — upload up to 20 menu photos, extract dishes with Gemini */
router.post('/', requireAuth, upload.array('photos', 20), async (req, res) => {
  const userId = res.locals.userId as string;
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    res.status(400).json({ error: 'No photos uploaded', code: 'NO_FILES' });
    return;
  }

  const ctx = await requireOwnerRestaurant(userId, res);
  if (!ctx) return;
  const { restaurant } = ctx;

  let draft: MenuScanDraft;
  try {
    draft = await extractMenuFromPhotos(files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })));
  } catch (err) {
    if (err instanceof GeminiExtractionError) {
      res.status(422).json({ error: err.message, code: 'EXTRACTION_FAILED' });
      return;
    }
    throw err;
  }

  const scanId = genId();
  const photoKeys = await Promise.all(
    files.map(async (file, i) => {
      const ext = file.mimetype.split('/')[1] || 'jpg';
      const { key } = await saveFile(`menu-scans/${restaurant._id}/${scanId}`, `page-${i + 1}.${ext}`, file.buffer);
      return key;
    }),
  );

  const scan = await MenuScan.create({
    _id: scanId,
    restaurantId: restaurant._id,
    status: 'ready',
    photoKeys,
    draft,
    geminiModel: 'gemini-2.5-flash',
  });

  res.json({ scanId: scan._id, draft: scan.draft });
});

/** GET /api/v1/menu-scan/:id — reload a scan's draft (e.g. after a page refresh mid-review) */
router.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const ctx = await requireOwnerRestaurant(userId, res);
  if (!ctx) return;

  const scan = await MenuScan.findOne({ _id: req.params.id, restaurantId: ctx.restaurant._id }).lean();
  if (!scan) {
    res.status(404).json({ error: 'Scan not found', code: 'SCAN_NOT_FOUND' });
    return;
  }

  res.json({ scanId: scan._id, status: scan.status, draft: scan.draft });
});

/** POST /api/v1/menu-scan/:id/publish — commit the (possibly owner-edited) draft to the live menu */
router.post('/:id/publish', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const ctx = await requireOwnerRestaurant(userId, res);
  if (!ctx) return;
  const { restaurant } = ctx;

  const scan = await MenuScan.findOne({ _id: req.params.id, restaurantId: restaurant._id });
  if (!scan) {
    res.status(404).json({ error: 'Scan not found', code: 'SCAN_NOT_FOUND' });
    return;
  }
  if (scan.status === 'published') {
    res.status(409).json({ error: 'Scan already published', code: 'ALREADY_PUBLISHED' });
    return;
  }

  const draft = req.body as MenuScanDraft;
  if (!draft || !Array.isArray(draft.categories) || draft.categories.length === 0) {
    res.status(400).json({ error: 'No categories to publish', code: 'EMPTY_DRAFT' });
    return;
  }

  let menu = await Menu.findOne({ restaurantId: restaurant._id, isActive: true });
  if (!menu) {
    menu = await Menu.create({ restaurantId: restaurant._id, name: 'Menu', isActive: true });
  }

  const existingCategories = await Category.find({ menuId: menu._id }).lean();
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let nextSortOrder =
    existingCategories.length > 0 ? Math.max(...existingCategories.map((c) => c.sortOrder)) + 1 : 0;

  let categoriesCreated = 0;
  let dishesCreated = 0;

  for (const draftCategory of draft.categories) {
    const name = draftCategory.name?.trim();
    if (!name || draftCategory.dishes.length === 0) continue;

    let category = categoryByName.get(name.toLowerCase());
    if (!category) {
      category = await Category.create({ menuId: menu._id, name, sortOrder: nextSortOrder });
      nextSortOrder += 1;
      categoryByName.set(name.toLowerCase(), category);
      categoriesCreated += 1;
    }

    for (const draftDish of draftCategory.dishes) {
      const dishName = draftDish.name?.trim();
      if (!dishName || typeof draftDish.price !== 'number') continue;

      await Dish.create({
        categoryId: category._id,
        name: dishName,
        description: draftDish.description ?? '',
        price: draftDish.price,
        ingredients: draftDish.ingredients ?? [],
        isVeg: Boolean(draftDish.isVeg),
      });
      dishesCreated += 1;
    }
  }

  scan.status = 'published';
  scan.publishedAt = new Date();
  await scan.save();

  res.json({ categoriesCreated, dishesCreated });
});

export default router;
```

- [ ] **Step 2: Mount the route**

Edit `packages/api/src/index.ts`. Add an import alongside the other route imports (after `const { default: inquiryRoutes } = await import('./routes/inquiry.routes.js');`):

```ts
  const { default: menuScanRoutes } = await import('./routes/menuScan.routes.js');
```

Add the mount alongside the others (after `app.use('/api/v1/inquiry', inquiryRoutes);`):

```ts
  app.use('/api/v1/menu-scan', menuScanRoutes);
```

Add to the startup log list (after `console.log('  POST /api/v1/inquiry/newsletter');`):

```ts
  console.log('  POST /api/v1/menu-scan');
  console.log('  GET  /api/v1/menu-scan/:id');
  console.log('  POST /api/v1/menu-scan/:id/publish');
```

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke test against the running dev server**

Start (or confirm already running) the API dev server: `npm run dev` (from repo root, or `cd packages/api && npm run dev`).

With a real logged-in session cookie (reuse the browser dev session from the running web app, or sign in via curl using the existing `/api/auth` flow), verify:

```bash
curl -s -X POST http://localhost:3001/api/v1/menu-scan \
  -H "Cookie: <paste a valid session cookie>" \
  -F "photos=@/path/to/real-menu-photo.jpg"
```

Expected: `200` with `{ "scanId": "...", "draft": { "categories": [...] } }`. Then:

```bash
curl -s http://localhost:3001/api/v1/menu-scan/<scanId> -H "Cookie: <same cookie>"
```

Expected: same draft returned. This step is easiest to actually run once Task 5 (frontend) exists — it's fine to defer the live curl check to Task 7's end-to-end pass and only confirm compilation here, as long as Task 7 explicitly re-verifies this route.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/menuScan.routes.ts packages/api/src/index.ts
git commit -m "feat: add /api/v1/menu-scan routes for digital menu OCR"
```

---

### Task 4: Frontend API client functions

**Files:**
- Modify: `apps/web/src/api/client.ts`

**Interfaces:**
- Consumes: `MenuScanResponse`, `MenuScanStatusResponse`, `MenuScanDraft`, `MenuScanPublishResponse` types from `@menuar/types` (Task 1); route contracts from Task 3
- Produces: `scanMenuPhotos(files: File[]): Promise<MenuScanResponse>`, `getMenuScan(scanId: string): Promise<MenuScanStatusResponse>`, `publishMenuScan(scanId: string, draft: MenuScanDraft): Promise<MenuScanPublishResponse>`

- [ ] **Step 1: Add the new functions**

Edit `apps/web/src/api/client.ts`. Add to the type import at the top:

```ts
import type {
  DashboardResponse,
  DishSlot,
  AdminStats,
  AdminRestaurant,
  MenuScanResponse,
  MenuScanStatusResponse,
  MenuScanDraft,
  MenuScanPublishResponse,
} from '@menuar/types'
```

Add a new section at the end of the file:

```ts
// ─── Digital menu (Gemini OCR) ─────────────────────────────────────────────────

export async function scanMenuPhotos(files: File[]): Promise<MenuScanResponse> {
  const formData = new FormData()
  files.forEach((f) => formData.append('photos', f))

  const res = await fetch(`${API_URL}/api/v1/menu-scan`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Menu scan failed' }))
    throw new Error(body.error)
  }

  return res.json()
}

export async function getMenuScan(scanId: string): Promise<MenuScanStatusResponse> {
  return apiFetch(`/api/v1/menu-scan/${scanId}`)
}

export async function publishMenuScan(
  scanId: string,
  draft: MenuScanDraft,
): Promise<MenuScanPublishResponse> {
  return apiFetch(`/api/v1/menu-scan/${scanId}/publish`, {
    method: 'POST',
    body: JSON.stringify(draft),
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/client.ts
git commit -m "feat: add digital menu scan API client functions"
```

---

### Task 5: Digital Menu page (upload → review → publish)

**Files:**
- Create: `apps/web/src/pages/DigitalMenuPage.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/RestaurantDashboardPage.tsx:319-331`

**Interfaces:**
- Consumes: `scanMenuPhotos`, `getMenuScan`, `publishMenuScan` (Task 4); `MenuScanDraft`, `MenuScanCategory`, `MenuScanDish` types (Task 1); `ProtectedRoute` component (existing, `apps/web/src/components/auth/ProtectedRoute.tsx`)
- Produces: route `/dashboard/digital-menu`; a "Scan your menu" entry point on `RestaurantDashboardPage`

- [ ] **Step 1: Write `DigitalMenuPage.tsx`**

Create `apps/web/src/pages/DigitalMenuPage.tsx`. This persists the in-progress `scanId` to `localStorage` and tries to resume it on mount, so a reload mid-review re-fetches the saved draft via `GET /api/v1/menu-scan/:id` instead of losing the scan (per the spec's reload-resilience requirement) — it does NOT recover in-progress edits made since the last load, only the original extracted draft:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { scanMenuPhotos, getMenuScan, publishMenuScan } from '../api/client'
import type { MenuScanDraft, MenuScanCategory, MenuScanDish } from '@menuar/types'

type Step = 'upload' | 'processing' | 'review' | 'publishing' | 'done' | 'error'

const MAX_PHOTOS = 20
const SCAN_ID_STORAGE_KEY = 'digitalMenuScanId'

function emptyDish(): MenuScanDish {
  return { name: '', description: '', price: 0, ingredients: [], isVeg: false }
}

export default function DigitalMenuPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [photos, setPhotos] = useState<File[]>([])
  const [scanId, setScanId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MenuScanDraft | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [publishSummary, setPublishSummary] = useState<{ categoriesCreated: number; dishesCreated: number } | null>(null)

  // Resume an in-progress scan after a reload, if one was left mid-review.
  useEffect(() => {
    const savedScanId = localStorage.getItem(SCAN_ID_STORAGE_KEY)
    if (!savedScanId) return

    getMenuScan(savedScanId)
      .then((result) => {
        if (result.status !== 'ready') {
          localStorage.removeItem(SCAN_ID_STORAGE_KEY)
          return
        }
        setScanId(result.scanId)
        setDraft(result.draft)
        setStep('review')
      })
      .catch(() => localStorage.removeItem(SCAN_ID_STORAGE_KEY))
  }, [])

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return
    const selected = Array.from(fileList).slice(0, MAX_PHOTOS)
    setPhotos(selected)
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleScan() {
    setStep('processing')
    try {
      const result = await scanMenuPhotos(photos)
      setScanId(result.scanId)
      setDraft(result.draft)
      localStorage.setItem(SCAN_ID_STORAGE_KEY, result.scanId)
      setStep('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Menu scan failed')
      setStep('error')
    }
  }

  function updateCategory(index: number, updater: (c: MenuScanCategory) => MenuScanCategory) {
    setDraft((prev) => {
      if (!prev) return prev
      const categories = prev.categories.map((c, i) => (i === index ? updater(c) : c))
      return { categories }
    })
  }

  function removeCategory(index: number) {
    setDraft((prev) => (prev ? { categories: prev.categories.filter((_, i) => i !== index) } : prev))
  }

  function addCategory() {
    setDraft((prev) => ({ categories: [...(prev?.categories ?? []), { name: 'New Category', dishes: [emptyDish()] }] }))
  }

  function updateDish(categoryIndex: number, dishIndex: number, updater: (d: MenuScanDish) => MenuScanDish) {
    updateCategory(categoryIndex, (c) => ({
      ...c,
      dishes: c.dishes.map((d, i) => (i === dishIndex ? updater(d) : d)),
    }))
  }

  function removeDish(categoryIndex: number, dishIndex: number) {
    updateCategory(categoryIndex, (c) => ({ ...c, dishes: c.dishes.filter((_, i) => i !== dishIndex) }))
  }

  function addDish(categoryIndex: number) {
    updateCategory(categoryIndex, (c) => ({ ...c, dishes: [...c.dishes, emptyDish()] }))
  }

  async function handlePublish() {
    if (!scanId || !draft) return
    setStep('publishing')
    try {
      const summary = await publishMenuScan(scanId, draft)
      setPublishSummary(summary)
      localStorage.removeItem(SCAN_ID_STORAGE_KEY)
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed')
      setStep('error')
    }
  }

  const totalDishes = draft?.categories.reduce((sum, c) => sum + c.dishes.length, 0) ?? 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 lg:p-12">
      <main className="max-w-5xl mx-auto space-y-8">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-[#94A3B8] hover:text-[#0F2747] mb-4">
            ← Back to dashboard
          </button>
          <h1 className="font-fraunces text-3xl font-bold text-[#0F2747]">Scan your menu</h1>
          <p className="font-outfit text-[#64748B] mt-1">
            Upload photos of your physical menu and Gemini will read the dishes for you.
          </p>
        </div>

        {step === 'upload' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F1F5F9] space-y-6">
            <label className="block border-2 border-dashed border-[#E2E8F0] rounded-2xl p-10 text-center cursor-pointer hover:border-[#FF6B00] transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <p className="font-outfit font-semibold text-[#0F2747]">Click to select up to {MAX_PHOTOS} photos</p>
              <p className="text-sm text-[#94A3B8] mt-1">JPG or PNG, one photo per menu page</p>
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="relative rounded-xl overflow-hidden border border-[#F1F5F9]">
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={photos.length === 0}
              className="w-full bg-[#FF6B00] hover:bg-[#E85F00] disabled:bg-slate-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Scan {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'menu'}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="font-outfit font-semibold text-[#0F2747]">Reading your menu with AI…</p>
            <p className="text-sm text-[#94A3B8] mt-1">This can take up to a minute for {photos.length} photos.</p>
          </div>
        )}

        {step === 'review' && draft && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-outfit font-semibold text-[#0F2747]">
                Found {totalDishes} dish{totalDishes === 1 ? '' : 'es'} across {draft.categories.length} categor
                {draft.categories.length === 1 ? 'y' : 'ies'}
              </p>
              <button onClick={addCategory} className="text-sm font-bold text-[#FF6B00]">+ Add category</button>
            </div>

            {draft.categories.map((category, ci) => (
              <div key={ci} className="bg-white rounded-3xl p-6 shadow-sm border border-[#F1F5F9] space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    value={category.name}
                    onChange={(e) => updateCategory(ci, (c) => ({ ...c, name: e.target.value }))}
                    className="font-fraunces text-lg font-bold text-[#0F2747] border-b border-transparent focus:border-[#FF6B00] outline-none flex-1"
                  />
                  <button onClick={() => removeCategory(ci)} className="text-xs font-bold text-[#EF4444]">Remove category</button>
                </div>

                {category.dishes.map((dish, di) => (
                  <div key={di} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-4 rounded-2xl bg-[#F8FAFC]">
                    <input
                      value={dish.name}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, name: e.target.value }))}
                      placeholder="Dish name"
                      className="sm:col-span-3 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      value={dish.description}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, description: e.target.value }))}
                      placeholder="Description"
                      className="sm:col-span-4 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={dish.price}
                      onChange={(e) => updateDish(ci, di, (d) => ({ ...d, price: Number(e.target.value) }))}
                      placeholder="Price"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <input
                      value={dish.ingredients.join(', ')}
                      onChange={(e) =>
                        updateDish(ci, di, (d) => ({
                          ...d,
                          ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="Ingredients (comma separated)"
                      className="sm:col-span-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                    />
                    <label className="sm:col-span-1 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={dish.isVeg}
                        onChange={(e) => updateDish(ci, di, (d) => ({ ...d, isVeg: e.target.checked }))}
                      />
                      Veg
                    </label>
                    <button
                      onClick={() => removeDish(ci, di)}
                      className="sm:col-span-12 text-left text-xs font-bold text-[#EF4444]"
                    >
                      Remove dish
                    </button>
                  </div>
                ))}

                <button onClick={() => addDish(ci)} className="text-sm font-bold text-[#FF6B00]">+ Add dish</button>
              </div>
            ))}

            <button
              onClick={handlePublish}
              disabled={totalDishes === 0}
              className="w-full bg-[#FF6B00] hover:bg-[#E85F00] disabled:bg-slate-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Publish menu ({totalDishes} dish{totalDishes === 1 ? '' : 'es'})
            </button>
          </div>
        )}

        {step === 'publishing' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="font-outfit font-semibold text-[#0F2747]">Publishing your menu…</p>
          </div>
        )}

        {step === 'done' && publishSummary && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-fraunces text-xl font-bold text-[#0F2747] mb-2">Menu published!</p>
            <p className="text-sm text-[#64748B] mb-6">
              Added {publishSummary.dishesCreated} dish{publishSummary.dishesCreated === 1 ? '' : 'es'} across{' '}
              {publishSummary.categoriesCreated} new categor{publishSummary.categoriesCreated === 1 ? 'y' : 'ies'}.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-semibold rounded-xl py-3 px-8 text-sm transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-[#F1F5F9] text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center text-3xl border-4 border-red-100">
              ⚠️
            </div>
            <p className="font-fraunces text-xl font-bold text-[#0F2747] mb-2">Something went wrong</p>
            <p className="text-sm text-[#64748B] mb-6">{errorMsg}</p>
            <button
              onClick={() => setStep('upload')}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-semibold rounded-xl py-3 px-8 text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Add the route**

Edit `apps/web/src/App.tsx`. Add the import (after `import RestaurantDashboardPage from './pages/RestaurantDashboardPage'`):

```tsx
import DigitalMenuPage from './pages/DigitalMenuPage'
```

Add the route (after the `/dashboard` route block):

```tsx
        <Route
          path="/dashboard/digital-menu"
          element={
            <ProtectedRoute require="active">
              <DigitalMenuPage />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 3: Add the entry point on the dashboard**

Edit `apps/web/src/pages/RestaurantDashboardPage.tsx`. In the "Dish Management Section" header block (around line 320-331), change:

```tsx
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-fraunces text-2xl font-bold text-[#0F2747]">Dish Portfolio</h3>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {slots.filter(s => s.status === 'glb_ready').slice(0, 3).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#F1F5F9]" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#64748B]">{liveCount}/{slots.length} slots used</span>
                </div>
              </div>
```

to:

```tsx
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-fraunces text-2xl font-bold text-[#0F2747]">Dish Portfolio</h3>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {slots.filter(s => s.status === 'glb_ready').slice(0, 3).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#F1F5F9]" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#64748B]">{liveCount}/{slots.length} slots used</span>
                  <button
                    onClick={() => navigate('/dashboard/digital-menu')}
                    className="text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#E85F00] transition-colors px-4 py-2 rounded-xl"
                  >
                    Scan your menu
                  </button>
                </div>
              </div>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/DigitalMenuPage.tsx apps/web/src/App.tsx apps/web/src/pages/RestaurantDashboardPage.tsx
git commit -m "feat: add digital menu scan page (upload, review, publish)"
```

---

### Task 6: Fix the "Check Again" polling bug on PaymentCallbackPage

**Files:**
- Modify: `apps/web/src/pages/PaymentCallbackPage.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new (bug fix only, no interface change)

- [ ] **Step 1: Make "Check Again" actually restart the poll**

Edit `apps/web/src/pages/PaymentCallbackPage.tsx`. Add a retry counter state (after `const [dots, setDots] = useState('.')`):

```tsx
  const [retryKey, setRetryKey] = useState(0)
```

Change the poll effect's dependency array from `[navigate]` to `[navigate, retryKey]`:

```tsx
  }, [navigate, retryKey])
```

Change the "Check Again" button's `onClick` from `() => setState('loading')` to:

```tsx
                  <button
                    onClick={() => { setState('loading'); setRetryKey((k) => k + 1) }}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Check Again
                  </button>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify the fix**

Run the dev server, navigate to `/payment-callback` in a state where the subscription is still `pending` (or use the dev-only "Simulate payment success" / let it exhaust its 20 attempts to reach the `pending` UI state), click "Check Again", and confirm in the network tab that a fresh burst of `GET /api/v1/subscription/status` calls starts again (rather than nothing happening).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/PaymentCallbackPage.tsx
git commit -m "fix: Check Again button now restarts subscription status polling"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-6
- Produces: nothing (confidence check before calling the feature done)

- [ ] **Step 1: Full monorepo typecheck**

Run:
```bash
cd packages/types && npx tsc --noEmit
cd ../api && npx tsc --noEmit
cd ../../apps/web && npx tsc --noEmit
```
Expected: no errors in any package.

- [ ] **Step 2: Boot the dev server and confirm the new routes are listed**

Run: `npm run dev` (repo root) or restart the already-running dev server so it picks up all changes.
Expected: startup log includes the three new `/api/v1/menu-scan*` lines and no fatal startup errors (e.g. missing `GEMINI_API_KEY` would throw at first use, not at boot, since the client is lazily constructed — confirm no boot-time crash regardless).

- [ ] **Step 3: Full browser walkthrough**

In a browser, signed in as a restaurant owner with an active subscription:
1. Go to `/dashboard`, click "Scan your menu".
2. Upload 1-3 real menu photos, click "Scan".
3. Confirm the review screen shows categories/dishes that roughly match the photos.
4. Reload the browser tab while still on the review screen — confirm it re-shows the review screen with the same draft (via the `localStorage` resume path in Task 5), not the upload screen.
5. Edit at least one field (e.g. a price), remove one dish, click "Publish menu".
6. Confirm the success screen shows the right counts, then navigate to the dashboard.
7. Confirm the newly published dishes appear by checking the public menu at `/ar/<restaurant-slug>` (or querying `GET /api/v1/menu/<restaurant-slug>` directly) — the new `Category`/`Dish` records should be visible there.

Expected: all seven steps work without console errors, and the published dishes are visible via the existing menu-read path.

- [ ] **Step 4: Report status**

If any step fails, return to the relevant task above, form a hypothesis for the failure, fix it there (not with a patch bolted onto this task), and re-run this task's steps from the top.
