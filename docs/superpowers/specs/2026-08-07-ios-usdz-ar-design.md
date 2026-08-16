# iPhone AR Support (USDZ) for Dish Slots

## Problem

The customer-facing AR menu (`MenuARPage.tsx` / `DishInfoPanel.tsx`) uses `<model-viewer>` with a GLB model per dish. This already gives Android customers AR via Scene Viewer / WebXR, and gives every customer an embedded 3D viewer. It does **not** give iPhone customers native AR: Safari has no WebXR support, and iOS's AR (Quick Look) requires a `.usdz` file supplied via `<model-viewer>`'s `ios-src` attribute, which nothing in the codebase currently sets or stores.

Since restaurants' clientele is both Android and iPhone, and the QR code on the dashboard is meant for real, offline, in-restaurant scanning, AR needs to work on both.

## Ground truth: how dish 3D models actually reach production

The dish objects served to customers come from **`DishSlot`** records (`packages/api/src/db/models/DishSlot.ts`), not the older `Dish`/`Category` schema. This is a fully manual, human-curated pipeline:

1. Restaurant uploads a menu photo + up to 4 angle photos to a slot (`POST /api/v1/restaurant/slots/:n/photos`) → status `photos_uploaded`.
2. The DishDekho ops team manually builds the 3D model themselves from those photos, using whatever tool produces the best result, and uploads the finished `.glb` via the admin panel (`POST /api/v1/admin/slots/:slotId/glb`) → status `glb_ready`.

There is a separate, fully-automated Tripo3D/Hunyuan3D pipeline in the code (`pipeline.service.ts`, wired only to `dish.routes.ts`), but it is not used by any live restaurant today — it's out of scope for this change.

Because model creation is already manual and tool-agnostic, there's no reliable way to auto-convert an uploaded GLB to USDZ (Tripo's own convert API only works on models Tripo itself generated, which these aren't guaranteed to be). The team confirmed they can export USDZ themselves from whatever tool they use, so the fix is to let them upload both files together — no conversion service needed.

## Design

### Data model
`DishSlot` gets two new optional fields, mirroring the existing `glbKey`/`glbUrl` pair:
```ts
usdzKey?: string;
usdzUrl?: string;
```
The `glb_ready` status enum value is unchanged — it now means "3D model ready" (glb, optionally + usdz), not literally "only a glb exists." Renaming it would touch existing data for no functional benefit.

### Backend API
`POST /api/v1/admin/slots/:slotId/glb` (`admin.routes.ts`) changes from `multer.single('glb')` to `multer.fields([{ name: 'glb', maxCount: 1 }, { name: 'usdz', maxCount: 1 }])`.

- Both files are **required** in the same request (400 if either is missing). This route has exactly one caller (the admin UI), which is updated in the same change, so tightening the contract is safe.
- Separate `fileFilter` checks per field: `.glb`/`model/gltf-binary`/`application/octet-stream` for the glb field (existing rule, unchanged); `.usdz`/`model/vnd.usdz+zip`/`application/octet-stream` for the usdz field.
- Both buffers are uploaded via the existing `saveFile` helper (R2), under `models/{restaurantId}/slot-{slotNumber}/dish.glb` and `.../dish.usdz`.
- Response and DB update include both `glbUrl` and `usdzUrl`.

### Serving to customers
`menu.service.ts`'s `getMenuBySlug` already builds a synthetic `Dish`-shaped object per ready slot (mapping `modelUrl: slot.glbUrl`). It gets one more line: `usdzUrl: slot.usdzUrl`. The shared `Dish` type in `packages/types` gets `usdzUrl?: string`.

### Frontend AR wiring
`MenuARPage.tsx`'s hidden AR-host `<model-viewer>` (the one `activateAR()` is called on) gets an `ios-src` attribute set to the selected dish's `usdzUrl` — **only rendered when the value is present**, so dishes without a USDZ yet degrade exactly like today (AR button still visible per existing `modelUrl` gating in `DishInfoPanel.tsx`, but tapping it on iPhone shows the existing "AR is not supported on this device" hint instead of a broken state).

No changes to Android behavior — Scene Viewer / WebXR already work off `src` (glb) and are untouched.

### Admin UI
`AdminSlotDetail.tsx` currently uploads on selecting a single `.glb` file (`onChange` fires the upload immediately). That interaction changes to a two-step stage-then-submit form: pick GLB, pick USDZ, then an "Upload 3D Model" button that's disabled until both files are chosen, submitting both in one multipart request via an updated `uploadSlotGLB` (renamed conceptually but can keep its name) in `apps/admin/src/api/client.ts`. Once uploaded, both "Preview GLB" and "Preview USDZ" links are shown.

## Out of scope
- Any GLB→USDZ conversion service (not needed — team supplies both files).
- The legacy automated Tripo/Hunyuan pipeline and `Dish`/`Category` schema (`dish.routes.ts`) — not used by live restaurants.
- Changing the `glb_ready` status enum name.

## Verification
Manual, end-to-end, no existing test suite covers these routes:
1. Upload a real GLB + USDZ pair to an open slot for a real restaurant via the admin panel; confirm the dish goes live on the dashboard.
2. Re-run the iPhone QR-scan flow (same network/HTTPS setup already fixed separately): confirm "View on Table (AR)" launches native Quick Look instead of showing "not supported."
3. If an Android device is available, confirm the same dish still launches AR there via Scene Viewer/WebXR (expected unchanged, but worth confirming no regression).
