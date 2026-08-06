# iPhone AR Support (USDZ) for Dish Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin panel upload a USDZ file alongside each dish slot's GLB, and serve it to `<model-viewer>` as `ios-src` so "View on Table (AR)" launches native Quick Look AR on iPhone — Android AR (Scene Viewer/WebXR) already works via the existing GLB and is untouched.

**Architecture:** Add `usdzKey`/`usdzUrl` fields to `DishSlot`, extend the existing admin GLB-upload endpoint to require both a `glb` and a `usdz` file in one request, thread `usdzUrl` through `menu.service.ts` into the customer-facing `Dish` object, and conditionally set `ios-src` on the AR `<model-viewer>` in the customer app. Update the admin upload UI to a two-file stage-then-submit form.

**Tech Stack:** Express + Mongoose (packages/api), React + Vite (apps/web), Next.js (apps/admin), shared types in packages/types, file storage via Cloudflare R2 (`saveFile`/`storage.service.ts`), multer for multipart uploads.

## Global Constraints

- No changes to the automated Tripo3D/Hunyuan3D pipeline (`pipeline.service.ts`, `dish.routes.ts`) or the `Dish`/`Category` schema — not used by live restaurants (per `docs/superpowers/specs/2026-08-07-ios-usdz-ar-design.md`).
- No GLB→USDZ conversion service — the ops team supplies both files directly.
- `DishSlot.status` enum values are unchanged; `'glb_ready'` still means "3D model ready."
- **This repo has no test framework configured** (no jest/vitest anywhere, confirmed via search). "Test" steps below substitute the closest real check available: `tsc --noEmit` for type safety, and `curl`/manual verification for runtime behavior. Do not add a test framework as part of this plan — out of scope.
- Every backend TypeScript task must pass `npx tsc --noEmit` run from `packages/api/` before committing.
- The dev servers (`npm run dev` from repo root, via turbo) must be running for manual `curl` verification steps — they were already started and left running during the earlier network-setup work; if not running, start with `npm run dev` from the repo root and wait for `MenuAR API running on port 3001` and `VITE ... ready` in the output before proceeding.

---

### Task 1: DishSlot schema — add usdzKey/usdzUrl fields

**Files:**
- Modify: `packages/api/src/db/models/DishSlot.ts`

**Interfaces:**
- Produces: `IDishSlot.usdzKey?: string`, `IDishSlot.usdzUrl?: string` — consumed by Task 3 (route handler) and Task 4 (menu.service.ts).

- [ ] **Step 1: Add the fields to the `IDishSlot` interface**

In `packages/api/src/db/models/DishSlot.ts`, change:

```ts
  glbKey?: string;
  glbUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

to:

```ts
  glbKey?: string;
  glbUrl?: string;
  usdzKey?: string;
  usdzUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Add the fields to the Mongoose schema**

In the same file, change:

```ts
    glbKey: { type: String },
    glbUrl: { type: String },
  },
  { timestamps: true },
);
```

to:

```ts
    glbKey: { type: String },
    glbUrl: { type: String },
    usdzKey: { type: String },
    usdzUrl: { type: String },
  },
  { timestamps: true },
);
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/db/models/DishSlot.ts
git commit -m "feat: add usdzKey/usdzUrl fields to DishSlot schema"
```

---

### Task 2: Shared types — usdzUrl on Dish and DishSlot

**Files:**
- Modify: `packages/types/src/index.ts:56-93`

**Interfaces:**
- Consumes: nothing.
- Produces: `DishSlot.usdzKey?: string`, `DishSlot.usdzUrl?: string`, `Dish.usdzUrl?: string` — consumed by Task 4 (backend response typing), Task 5 (MenuARPage.tsx), Task 6 (admin client.ts), Task 7 (AdminSlotDetail.tsx).

- [ ] **Step 1: Add `usdzKey`/`usdzUrl` to the `DishSlot` interface**

In `packages/types/src/index.ts`, change:

```ts
  glbKey?: string;
  glbUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dish {
```

to:

```ts
  glbKey?: string;
  glbUrl?: string;
  usdzKey?: string;
  usdzUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dish {
```

- [ ] **Step 2: Add `usdzUrl` to the `Dish` interface**

In the same file, change:

```ts
  isAvailable: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
```

to:

```ts
  isAvailable: boolean;
  modelUrl?: string;
  usdzUrl?: string;
  thumbnailUrl?: string;
```

- [ ] **Step 3: Build the package**

Run: `cd packages/types && npx tsc`
Expected: exits 0, `packages/types/dist/index.d.ts` now contains `usdzUrl`. (This regenerates the compiled `.d.ts` that `apps/web`, `apps/admin`, and `packages/api` all resolve `@menuar/types` to — required even though a `tsc -w` watcher may already be running in the dev servers, so the change is guaranteed to be picked up.)

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts packages/types/dist
git commit -m "feat: add usdzUrl to shared Dish and DishSlot types"
```

---

### Task 3: Backend API — accept GLB + USDZ together in the admin upload route

**Files:**
- Modify: `packages/api/src/routes/admin.routes.ts:12-26` (multer config), `packages/api/src/routes/admin.routes.ts:193-231` (route handler)
- Modify: `packages/api/src/services/storage.service.ts:32-38` (`getContentType`)

**Interfaces:**
- Consumes: `IDishSlot.usdzKey`/`usdzUrl` (Task 1), `saveFile(subdir, filename, buffer)` (existing, unchanged signature).
- Produces: `POST /api/v1/admin/slots/:slotId/glb` now requires multipart fields `glb` and `usdz` (both required), and responds `{ slotId, glbUrl, usdzUrl, status }` — consumed by Task 6 (admin client.ts).

- [ ] **Step 1: Add `.usdz` content-type support**

In `packages/api/src/services/storage.service.ts`, change:

```ts
function getContentType(filename: string): string {
  if (filename.endsWith('.glb')) return 'model/gltf-binary';
  if (filename.endsWith('.png')) return 'image/png';
```

to:

```ts
function getContentType(filename: string): string {
  if (filename.endsWith('.glb')) return 'model/gltf-binary';
  if (filename.endsWith('.usdz')) return 'model/vnd.usdz+zip';
  if (filename.endsWith('.png')) return 'image/png';
```

- [ ] **Step 2: Replace the single-file multer config with a two-field config**

In `packages/api/src/routes/admin.routes.ts`, change:

```ts
const glbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25MB for GLB
  fileFilter: (_req, file, cb) => {
    const isGlb =
      file.originalname.toLowerCase().endsWith('.glb') ||
      file.mimetype === 'model/gltf-binary' ||
      file.mimetype === 'application/octet-stream';
    if (!isGlb) {
      cb(new Error('Only GLB files are allowed'));
    } else {
      cb(null, true);
    }
  },
});
```

to:

```ts
const modelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 2 }, // 25MB per file (GLB + USDZ)
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (file.fieldname === 'glb') {
      const isGlb =
        name.endsWith('.glb') ||
        file.mimetype === 'model/gltf-binary' ||
        file.mimetype === 'application/octet-stream';
      if (!isGlb) return cb(new Error('The "glb" field must be a .glb file'));
      return cb(null, true);
    }
    if (file.fieldname === 'usdz') {
      const isUsdz =
        name.endsWith('.usdz') ||
        file.mimetype === 'model/vnd.usdz+zip' ||
        file.mimetype === 'application/octet-stream';
      if (!isUsdz) return cb(new Error('The "usdz" field must be a .usdz file'));
      return cb(null, true);
    }
    cb(new Error(`Unexpected field: ${file.fieldname}`));
  },
});
```

- [ ] **Step 3: Replace the route handler**

In the same file, change:

```ts
/** POST /api/v1/admin/slots/:slotId/glb — upload GLB and mark slot ready */
router.post('/slots/:slotId/glb', requireAdminAuth, glbUpload.single('glb'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No GLB file provided', code: 'NO_FILE' });
    return;
  }

  const slot = await DishSlot.findById(req.params.slotId);
  if (!slot) {
    res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
    return;
  }

  // Delete old GLB if exists
  if (slot.glbKey) {
    await deleteFile(slot.glbKey).catch(() => {});
  }

  const { key, url } = await saveFile(`models/${slot.restaurantId}/slot-${slot.slotNumber}`, 'dish.glb', file.buffer);

  const body = req.body as Record<string, string>;
  const updated = await DishSlot.findByIdAndUpdate(
    slot._id,
    {
      glbKey: key,
      glbUrl: url,
      status: 'glb_ready',
      ...(body.dishName && { dishName: body.dishName }),
      ...(body.description && { description: body.description }),
      ...(body.ingredients && { ingredients: body.ingredients }),
      ...(body.price && { price: parseFloat(body.price) }),
      ...(body.isVeg !== undefined && { isVeg: body.isVeg === 'true' }),
    },
    { new: true },
  ).lean();

  res.json({ slotId: updated!._id, glbUrl: updated!.glbUrl, status: updated!.status });
});
```

to:

```ts
/** POST /api/v1/admin/slots/:slotId/glb — upload GLB + USDZ pair and mark slot ready */
router.post(
  '/slots/:slotId/glb',
  requireAdminAuth,
  modelUpload.fields([
    { name: 'glb', maxCount: 1 },
    { name: 'usdz', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as { glb?: Express.Multer.File[]; usdz?: Express.Multer.File[] } | undefined;
    const glbFile = files?.glb?.[0];
    const usdzFile = files?.usdz?.[0];

    if (!glbFile) {
      res.status(400).json({ error: 'No GLB file provided', code: 'NO_FILE' });
      return;
    }
    if (!usdzFile) {
      res.status(400).json({ error: 'No USDZ file provided', code: 'NO_FILE' });
      return;
    }

    const slot = await DishSlot.findById(req.params.slotId);
    if (!slot) {
      res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
      return;
    }

    // Delete old model files if they exist
    if (slot.glbKey) await deleteFile(slot.glbKey).catch(() => {});
    if (slot.usdzKey) await deleteFile(slot.usdzKey).catch(() => {});

    const dir = `models/${slot.restaurantId}/slot-${slot.slotNumber}`;
    const [{ key: glbKey, url: glbUrl }, { key: usdzKey, url: usdzUrl }] = await Promise.all([
      saveFile(dir, 'dish.glb', glbFile.buffer),
      saveFile(dir, 'dish.usdz', usdzFile.buffer),
    ]);

    const body = req.body as Record<string, string>;
    const updated = await DishSlot.findByIdAndUpdate(
      slot._id,
      {
        glbKey,
        glbUrl,
        usdzKey,
        usdzUrl,
        status: 'glb_ready',
        ...(body.dishName && { dishName: body.dishName }),
        ...(body.description && { description: body.description }),
        ...(body.ingredients && { ingredients: body.ingredients }),
        ...(body.price && { price: parseFloat(body.price) }),
        ...(body.isVeg !== undefined && { isVeg: body.isVeg === 'true' }),
      },
      { new: true },
    ).lean();

    res.json({ slotId: updated!._id, glbUrl: updated!.glbUrl, usdzUrl: updated!.usdzUrl, status: updated!.status });
  },
);
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Restart the API dev server and manually verify the endpoint's validation**

The API's `tsx watch` process auto-restarts on file save, but confirm it's actually up:

```bash
curl -s http://localhost:3001/ 
```
Expected: `{"status":"ok","service":"MenuAR API"}`

Get an admin token and confirm the route now rejects a request missing the `usdz` field (replace the email/password with the values in `packages/api/.env`'s `ADMIN_EMAILS`/`ADMIN_PASSWORD`):

```bash
TOKEN=$(curl -sk -X POST https://192.168.1.7:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"devgr102@gmail.com","password":"menuar@admin2026"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "token: ${TOKEN:0:20}..."

# Fetch a real slotId to test against (Acha Ji Restaurant's restaurantId from earlier: 91385df5-e91a-4445-9768-dacc0365653b)
curl -sk https://192.168.1.7:3000/api/v1/admin/restaurants/91385df5-e91a-4445-9768-dacc0365653b/slots \
  -H "Authorization: Bearer $TOKEN"
```
Expected: JSON listing 3 slots, all `status: "empty"`. Copy one slot's `id`.

```bash
SLOT_ID=<paste a slot id from the previous response>
curl -sk -X POST "https://192.168.1.7:3000/api/v1/admin/slots/$SLOT_ID/glb" \
  -H "Authorization: Bearer $TOKEN" \
  -F "glb=@/dev/null;filename=empty.glb;type=model/gltf-binary"
```
Expected: `{"error":"No USDZ file provided","code":"NO_FILE"}` with HTTP 400 — confirms both files are now required. (Task 8 does the real end-to-end upload with actual model files.)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/admin.routes.ts packages/api/src/services/storage.service.ts
git commit -m "feat: require GLB + USDZ pair in admin slot model upload"
```

---

### Task 4: Serve usdzUrl to customers

**Files:**
- Modify: `packages/api/src/services/menu.service.ts:81-98`

**Interfaces:**
- Consumes: `IDishSlot.usdzUrl` (Task 1).
- Produces: `getMenuBySlug()`'s per-dish objects now include `usdzUrl` — consumed by Task 5 (`MenuARPage.tsx` via `useMenu`/`menuClient`).

- [ ] **Step 1: Map `usdzUrl` into the slot-derived dish object**

In `packages/api/src/services/menu.service.ts`, change:

```ts
      dishes: readySlots.map((slot) => ({
        id: `slot-${slot._id}`,
        categoryId: `slots-cat-${restaurant._id}`,
        name: slot.dishName ?? `Dish ${slot.slotNumber}`,
        description: slot.description ?? '',
        price: slot.price ?? 0,
        isVeg: slot.isVeg,
        spiceLevel: 0,
        allergens: [] as string[],
        isAvailable: true,
        modelUrl: slot.glbUrl,
        thumbnailUrl: slot.menuPhotoUrl,
```

to:

```ts
      dishes: readySlots.map((slot) => ({
        id: `slot-${slot._id}`,
        categoryId: `slots-cat-${restaurant._id}`,
        name: slot.dishName ?? `Dish ${slot.slotNumber}`,
        description: slot.description ?? '',
        price: slot.price ?? 0,
        isVeg: slot.isVeg,
        spiceLevel: 0,
        allergens: [] as string[],
        isAvailable: true,
        modelUrl: slot.glbUrl,
        usdzUrl: slot.usdzUrl,
        thumbnailUrl: slot.menuPhotoUrl,
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/menu.service.ts
git commit -m "feat: include usdzUrl in customer menu API response"
```

---

### Task 5: Frontend AR — set ios-src on the AR model-viewer

**Files:**
- Modify: `apps/web/src/pages/MenuARPage.tsx:82-92`

**Interfaces:**
- Consumes: `Dish.usdzUrl` (Task 2), `Dish.modelUrl` (existing).
- Produces: nothing consumed by later tasks — this is the customer-facing behavior change.

- [ ] **Step 1: Conditionally set `ios-src`**

In `apps/web/src/pages/MenuARPage.tsx`, change:

```tsx
      <model-viewer
        ref={modelViewerRef as React.RefObject<HTMLElement>}
        src={selectedDish?.modelUrl ?? ''}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        style={{ display: 'none' }}
      >
        <button slot="ar-button" style={{ display: 'none' }} />
      </model-viewer>
```

to:

```tsx
      <model-viewer
        ref={modelViewerRef as React.RefObject<HTMLElement>}
        src={selectedDish?.modelUrl ?? ''}
        {...(selectedDish?.usdzUrl ? { 'ios-src': selectedDish.usdzUrl } : {})}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        style={{ display: 'none' }}
      >
        <button slot="ar-button" style={{ display: 'none' }} />
      </model-viewer>
```

(`ios-src` is already declared on the `model-viewer` JSX intrinsic in `apps/web/src/types/model-viewer.d.ts:19` — no type-declaration change needed. Spreading it conditionally means dishes without a USDZ yet get no `ios-src` attribute at all, so iOS falls back to today's "AR is not supported on this device" hint instead of pointing Quick Look at a missing file.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/MenuARPage.tsx
git commit -m "feat: set ios-src on AR model-viewer when a dish has a USDZ"
```

---

### Task 6: Admin API client — send both files

**Files:**
- Modify: `apps/admin/src/api/client.ts:53-81`

**Interfaces:**
- Consumes: `POST /api/v1/admin/slots/:slotId/glb` now requiring `glb` + `usdz` fields (Task 3).
- Produces: `uploadSlotGLB(token, slotId, glbFile, usdzFile, meta): Promise<{ slotId: string; glbUrl: string; usdzUrl: string; status: string }>` — consumed by Task 7 (`AdminSlotDetail.tsx`).

- [ ] **Step 1: Add the `usdzFile` parameter and form field**

In `apps/admin/src/api/client.ts`, change:

```ts
export async function uploadSlotGLB(
  token: string,
  slotId: string,
  glbFile: File,
  meta: { dishName?: string; description?: string; ingredients?: string; price?: number; isVeg?: boolean },
): Promise<{ slotId: string; glbUrl: string; status: string }> {
  // We need to use standard fetch for file uploads, overriding Content-Type 
  // so browser boundary forms correctly.
  const formData = new FormData()
  formData.append('glb', glbFile)
  if (meta.dishName) formData.append('dishName', meta.dishName)
```

to:

```ts
export async function uploadSlotGLB(
  token: string,
  slotId: string,
  glbFile: File,
  usdzFile: File,
  meta: { dishName?: string; description?: string; ingredients?: string; price?: number; isVeg?: boolean },
): Promise<{ slotId: string; glbUrl: string; usdzUrl: string; status: string }> {
  // We need to use standard fetch for file uploads, overriding Content-Type 
  // so browser boundary forms correctly.
  const formData = new FormData()
  formData.append('glb', glbFile)
  formData.append('usdz', usdzFile)
  if (meta.dishName) formData.append('dishName', meta.dishName)
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: errors referencing `AdminSlotDetail.tsx`'s call to `uploadSlotGLB` with the old (now-mismatched) argument count — this is expected and resolved by Task 7. Confirm no *other* errors exist.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/api/client.ts
git commit -m "feat: send GLB + USDZ together from admin API client"
```

---

### Task 7: Admin UI — two-file stage-then-submit upload form

**Files:**
- Modify: `apps/admin/src/components/AdminSlotDetail.tsx`

**Interfaces:**
- Consumes: `uploadSlotGLB(token, slotId, glbFile, usdzFile, meta)` (Task 6), `DishSlot.glbUrl`/`usdzUrl` (Task 2).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add staged-file state and a ref map for the USDZ input**

In `apps/admin/src/components/AdminSlotDetail.tsx`, change:

```tsx
  const [uploadingGlb, setUploadingGlb] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState<Record<string, { dishName: string; description: string; ingredients: string; price: string; isVeg: boolean }>>({})
  const glbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
```

to:

```tsx
  const [uploadingGlb, setUploadingGlb] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState<Record<string, { dishName: string; description: string; ingredients: string; price: string; isVeg: boolean }>>({})
  const glbInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const usdzInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [stagedFiles, setStagedFiles] = useState<Record<string, { glb?: File; usdz?: File }>>({})
```

- [ ] **Step 2: Replace `handleGLBUpload` with `handleModelUpload`**

Change:

```tsx
  async function handleGLBUpload(slot: DishSlot, file: File) {
    setUploadingGlb(slot.id)
    try {
      const token = await getCustomToken()
      if (!token) return
      const meta = metaForm[slot.id]
      await uploadSlotGLB(token, slot.id, file, {
        dishName: meta?.dishName || undefined,
        description: meta?.description || undefined,
        ingredients: meta?.ingredients || undefined,
        price: meta?.price ? parseFloat(meta.price) : undefined,
        isVeg: meta?.isVeg,
      })
      await loadSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'GLB upload failed')
    } finally {
      setUploadingGlb(null)
    }
  }
```

to:

```tsx
  async function handleModelUpload(slot: DishSlot) {
    const staged = stagedFiles[slot.id]
    if (!staged?.glb || !staged?.usdz) return
    setUploadingGlb(slot.id)
    try {
      const token = await getCustomToken()
      if (!token) return
      const meta = metaForm[slot.id]
      await uploadSlotGLB(token, slot.id, staged.glb, staged.usdz, {
        dishName: meta?.dishName || undefined,
        description: meta?.description || undefined,
        ingredients: meta?.ingredients || undefined,
        price: meta?.price ? parseFloat(meta.price) : undefined,
        isVeg: meta?.isVeg,
      })
      setStagedFiles((f) => ({ ...f, [slot.id]: {} }))
      await loadSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : '3D model upload failed')
    } finally {
      setUploadingGlb(null)
    }
  }
```

- [ ] **Step 3: Replace the upload UI block**

Change:

```tsx
            {/* GLB upload */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <input
                type="file"
                accept=".glb"
                className="hidden"
                ref={(el) => { if (el) glbInputRefs.current[slot.id] = el }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleGLBUpload(slot, file)
                }}
              />
              <button
                onClick={() => glbInputRefs.current[slot.id]?.click()}
                disabled={uploadingGlb === slot.id}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
              >
                {uploadingGlb === slot.id
                  ? 'Uploading...'
                  : slot.status === 'glb_ready'
                    ? 'Replace 3D Model'
                    : 'Upload 3D Model (.glb)'}
              </button>
              {slot.glbUrl && (
                <a
                  href={slot.glbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Preview GLB
                </a>
              )}
              {slot.status === 'glb_ready' && (
                <span className="text-green-600 text-xs font-semibold flex items-center gap-1 ml-auto">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Live in AR
                </span>
              )}
            </div>
```

to:

```tsx
            {/* 3D model upload: GLB (Android AR + in-app viewer) + USDZ (iPhone AR) */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">3D Model — GLB + USDZ required together</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".glb"
                  className="hidden"
                  ref={(el) => { if (el) glbInputRefs.current[slot.id] = el }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setStagedFiles((f) => ({ ...f, [slot.id]: { ...f[slot.id], glb: file } }))
                  }}
                />
                <button
                  onClick={() => glbInputRefs.current[slot.id]?.click()}
                  disabled={uploadingGlb === slot.id}
                  className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 shadow-sm text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  {stagedFiles[slot.id]?.glb ? `✓ ${stagedFiles[slot.id]!.glb!.name}` : 'Choose .glb'}
                </button>

                <input
                  type="file"
                  accept=".usdz"
                  className="hidden"
                  ref={(el) => { if (el) usdzInputRefs.current[slot.id] = el }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setStagedFiles((f) => ({ ...f, [slot.id]: { ...f[slot.id], usdz: file } }))
                  }}
                />
                <button
                  onClick={() => usdzInputRefs.current[slot.id]?.click()}
                  disabled={uploadingGlb === slot.id}
                  className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 shadow-sm text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  {stagedFiles[slot.id]?.usdz ? `✓ ${stagedFiles[slot.id]!.usdz!.name}` : 'Choose .usdz'}
                </button>

                <button
                  onClick={() => handleModelUpload(slot)}
                  disabled={uploadingGlb === slot.id || !stagedFiles[slot.id]?.glb || !stagedFiles[slot.id]?.usdz}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  {uploadingGlb === slot.id
                    ? 'Uploading...'
                    : slot.status === 'glb_ready'
                      ? 'Replace 3D Model'
                      : 'Upload 3D Model'}
                </button>

                {slot.glbUrl && (
                  <a
                    href={slot.glbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Preview GLB
                  </a>
                )}
                {slot.usdzUrl && (
                  <a
                    href={slot.usdzUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Preview USDZ
                  </a>
                )}
                {slot.status === 'glb_ready' && (
                  <span className="text-green-600 text-xs font-semibold flex items-center gap-1 ml-auto">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Live in AR
                  </span>
                )}
              </div>
            </div>
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: no errors (this resolves the mismatched-argument error noted at the end of Task 6).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/AdminSlotDetail.tsx
git commit -m "feat: two-file GLB+USDZ upload form in admin slot detail"
```

---

### Task 8: End-to-end verification with real files

**Files:** none (manual verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–7.

- [ ] **Step 1: Get a real GLB + USDZ pair**

If you don't already have a matching test pair, download a free sample USDZ from Apple's AR Quick Look gallery (e.g. `https://developer.apple.com/augmented-reality/quick-look/`) — these ship with `.glb`/`.gltf` siblings in most sample packs — or export both formats for any existing dish model your team has on hand.

- [ ] **Step 2: Log into the admin panel and upload both files to an open slot**

```bash
open http://localhost:3002
```
Log in with the admin credentials (`ADMIN_EMAILS`/`ADMIN_PASSWORD` in `packages/api/.env`), open Acha Ji Restaurant, choose an empty slot, click "Choose .glb" and "Choose .usdz" to stage both files, fill in a dish name, then click "Upload 3D Model."

Expected: slot status flips to "Live," "Preview GLB" and "Preview USDZ" links both appear, and clicking each opens a real model in the browser/Finder.

- [ ] **Step 3: Confirm the customer API now returns usdzUrl**

```bash
curl -sk https://192.168.1.7:3000/api/v1/menu/acha-ji-restaurant | grep -o '"usdzUrl":"[^"]*"'
```
Expected: a non-empty R2 URL ending in `.usdz`.

- [ ] **Step 4: Re-run the iPhone test**

On the same WiFi network, scan the dashboard's QR code with an iPhone (or revisit `https://192.168.1.7:3000/ar/acha-ji-restaurant` in Safari if already trusted from the earlier network setup), open the dish you just uploaded, and tap "View on Table (AR)."

Expected: iOS Quick Look opens (not the "AR is not supported on this device" hint) and places the model via the camera.

- [ ] **Step 5: If an Android phone is available, confirm no regression**

Same URL, same dish, tap "View on Table (AR)" in Chrome for Android.

Expected: Scene Viewer or WebXR AR launches as it did before this change (GLB path is untouched).

- [ ] **Step 6: Record the result**

No commit for this task — it's verification only. If any step fails, treat it as a bug against the specific task that owns the failing behavior (schema/API in Tasks 1–4, frontend in Task 5, admin UI in Tasks 6–7) rather than patching around it here.
