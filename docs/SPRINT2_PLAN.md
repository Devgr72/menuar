# Sprint 2 — Production Data Layer Plan

## What We're Building

Full pipeline: restaurant uploads a dish photo → background removed → realistic 3D model
generated from that photo → served in AR so customers see the actual dish on their table.

Target: 200 real Indian dish photos → 200 realistic GLB models, zero cost.

```
Restaurant uploads dish photo
  → background removed (remove.bg)
  → AI generates realistic 3D GLB (Tripo3D free API or Hunyuan3D 2.1)
  → Draco-compressed, uploaded to Cloudflare R2
  → QR generated per table
  → customer scans QR → sees realistic dish model floating on table
```

---

## 3D Model Strategy

**Goal:** Realistic models of real Indian dishes (butter chicken, biryani, dosa, etc.)
Poly Pizza / Sketchfab are ruled out — animated/stylized models, not realistic, wrong aesthetic.

### Primary — Tripo3D Free API

Tripo3D has a confirmed free API tier. This is the primary pipeline.

- **API:** `https://api.tripo3d.ai/v2/openapi/task`
- **Input:** Single dish photo (cleaned background PNG works best)
- **Output:** GLB with textures — photorealistic quality
- **Free tier:** Free API credits available (confirm exact limit at tripo3d.ai/pricing)
- **Time per model:** ~1-3 minutes
- **License:** Generated models are owned by you — commercial use OK

```typescript
// POST /v2/openapi/task
{
  "type": "image_to_model",
  "file": {
    "type": "png",
    "url": "https://your-r2-url/cleaned-dish.png"
  }
}
// Response: { task_id: "..." }

// Poll GET /v2/openapi/task/:task_id
// When status === "success": result.model.url is the GLB download link
```

### Secondary — Hunyuan3D 2.1 (HuggingFace, fully free)

When Tripo3D free credits run out, fall back to Hunyuan3D 2.1 via HuggingFace.

- **HuggingFace Space:** `tencent/Hunyuan3D-2.1`
- **Input:** Single dish photo
- **Output:** GLB with PBR (Physically Based Rendering) textures — realistic in AR lighting
- **Cost:** $0 — rate limited at ~50-100 req/hour on free HuggingFace tier
- **Strategy:** Run in batches overnight. 200 dishes = ~2-4 hours total

**Calling from Node.js** — Gradio Spaces expose a REST API directly, no Python needed:
```typescript
// Hunyuan3D Space REST endpoint (Gradio HTTP API)
const response = await fetch(
  'https://tencent-hunyuan3d-2-1.hf.space/call/image_to_3d',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [imageUrl] }),
  }
);
const { event_id } = await response.json();

// Poll /call/image_to_3d/:event_id for result (Server-Sent Events)
```

### Fallback — Procedural Three.js (existing)

While any model is being generated, the AR experience shows the procedural pizza model
(our existing system). Once the real GLB is ready, model URL updates and the next load
shows the real dish. Zero user-facing wait for the AR experience itself.

### Paid Upgrade Path (when going to production scale)

| Service | Cost | When |
|---------|------|------|
| Tripo3D paid plan | ~$0.20/model | When free credits exhausted |
| Meshy AI (Pro $20/mo) | ~$0.02/model | At 1000+ models/month |

---

## Tech Stack Decisions

| Component | Choice | Cost |
|---|---|---|
| Auth | Clerk | Free up to 10k MAU |
| Database | PostgreSQL + Prisma (Neon) | Free tier |
| File Storage | Cloudflare R2 | Free 10GB storage, $0 egress |
| Background Removal | Remove.bg API | Free 50/mo. Fallback: `rembg` (open-source, $0) |
| 3D Generation (primary) | Tripo3D free API | Free tier |
| 3D Generation (secondary) | Hunyuan3D 2.1 via HuggingFace | $0 |
| AR fallback while generating | Procedural Three.js (existing) | $0 |
| Model CDN | R2 public bucket | $0 egress |
| QR Codes | `qrcode` npm package | $0 |
| Dashboard UI | apps/dashboard (React + Vite + Clerk) | — |
| Job Processing | In-process async polling (MVP) → BullMQ later | — |

---

## Prisma Schema

```
Restaurant  → has many Tables, one active Menu
Table       → belongs to Restaurant, has tableNumber
Menu        → belongs to Restaurant, has many Categories
Category    → has many Dishes, has sortOrder
Dish        → name, price, description, isVeg, spiceLevel,
              allergens[], modelUrl (R2 CDN URL), modelStatus,
              modelSource (tripo | hunyuan | procedural),
              photos (DishPhoto[])
DishPhoto   → originalKey (R2), cleanedKey (R2, bg removed)
DishView    → dishId, tableId, timestamp (analytics)
QrCode      → tableId, qrImageUrl (R2), scanCount
```

### modelStatus values
```
uploaded → bg_removing → bg_done → generating_3d → compressing → ready → failed
```

---

## Photo → 3D Model Pipeline

```
1.  Restaurant uploads dish photo (JPG/PNG) via dashboard
2.  Backend (Multer) receives file, uploads original to R2
3.  POST to remove.bg API → clean transparent PNG
      → on failure/credit exhaustion: fall back to rembg subprocess
4.  Upload cleaned PNG to R2, update DishPhoto.cleanedKey
5.  POST cleaned image URL to Tripo3D free API
      → on failure/no credits: POST to Hunyuan3D 2.1 HF Space
6.  Store taskId + modelSource in DB, set modelStatus = generating_3d
7.  Return 202 to dashboard — "Generating model…"
8.  Background polling loop (every 15s):
      → Tripo: GET /v2/openapi/task/:taskId → check status
      → HuggingFace: poll SSE stream for result
9.  When done: download GLB from result URL
10. Run: gltf-pipeline -i raw.glb -o compressed.glb --draco.compressionLevel 7
11. Upload compressed GLB to R2
12. Update Dish.modelUrl + Dish.modelStatus = ready
13. Dashboard shows green "Ready" — AR experience now loads real model
```

---

## Background Removal — Two Options

**Option A: remove.bg API** (preferred, best quality)
- 50 free API calls/month
- `POST https://api.remove.bg/v1.0/removebg` with image file
- Returns clean PNG in response body

**Option B: rembg** (free fallback, unlimited)
- Open-source Python library using U2-Net
- Run as a child process from Node.js or tiny sidecar
- Quality slightly lower but sufficient for food photos with contrasting backgrounds
```typescript
// Node.js child process approach
import { execFile } from 'child_process';
execFile('rembg', ['i', inputPath, outputPath], callback);
```

**Strategy:** Use remove.bg until credits run low, then switch to rembg.
The API service layer abstracts both — single `removeBackground(imagePath)` function.

---

## API Endpoints to Build

```
GET  /api/v1/menu/:restaurantSlug          → full menu for AR experience
GET  /api/v1/dish/:dishId                  → single dish detail
POST /api/v1/dishes                        → create dish (dashboard)
POST /api/v1/dishes/:dishId/photo          → upload photo + trigger full pipeline
GET  /api/v1/dishes/:dishId/model-status   → poll model generation status
GET  /api/v1/qr/:restaurantSlug/:tableId   → generate/fetch QR code image
POST /api/v1/restaurants                   → create restaurant (onboarding)
```

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=                    # Neon PostgreSQL connection string

# Clerk
CLERK_SECRET_KEY=
VITE_CLERK_PUBLISHABLE_KEY=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=                   # https://pub-xxxx.r2.dev

# Background removal
REMOVE_BG_API_KEY=               # remove.bg — 50 free/mo

# 3D Model Generation
TRIPO_API_KEY=                   # tripo3d.ai — free tier key
HUGGINGFACE_API_TOKEN=           # optional — raises HF rate limits

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## Build Order — Starting Now

### Phase A — Data Layer
- [ ] 1. Full Prisma schema + `prisma migrate dev` + seed (1 restaurant, 10 Indian dishes)
- [ ] 2. `GET /api/v1/menu/:restaurantSlug` endpoint — frontend reads real DB, not mock data
- [ ] 3. Cloudflare R2 setup: bucket created, CORS configured, upload helper service

### Phase B — Model Pipeline
- [ ] 4. Photo upload endpoint (Multer → R2 original storage)
- [ ] 5. remove.bg integration → cleaned PNG stored in R2
- [ ] 6. Tripo3D API integration — submit task, store taskId
- [ ] 7. Polling service — checks task status every 15s, downloads GLB when done
- [ ] 8. Hunyuan3D HuggingFace fallback (same polling interface, different provider)
- [ ] 9. gltf-pipeline compression step → final GLB under 2MB → R2
- [ ] 10. `GET /api/v1/dishes/:dishId/model-status` endpoint for dashboard polling

### Phase C — QR + Dashboard
- [ ] 11. QR code generation endpoint + R2 storage
- [ ] 12. `apps/dashboard` scaffold — React + Vite + Clerk auth
- [ ] 13. Dashboard: dish list, add dish, photo upload UI, model status live indicator
- [ ] 14. Connect AR frontend to real API (currently hardcoded to mock data)

---

## Key Challenges

1. **Tripo3D free credit limit** — Monitor usage. When credits hit 0, auto-fallback to Hunyuan3D.
   Design the model generation service with a provider interface so switching is one config change.

2. **GLB size** — Both Tripo and Hunyuan output 5-20MB raw. Always compress before R2.
   `npx gltf-pipeline -i raw.glb -o out.glb --draco.compressionLevel 7`

3. **Hunyuan3D via Node.js** — No npm gradio client. Call the Space's Gradio HTTP API directly
   via `fetch`. It's just REST + SSE polling — no Python sidecar needed.

4. **R2 CORS** — Without CORS config, browsers will block GLB fetches from the AR page.
   Set this before any end-to-end testing.

5. **remove.bg vs rembg quality** — For Indian food (curries, rice) with complex backgrounds,
   remove.bg is noticeably better. Exhaust free credits on important dishes first.

6. **Model orientation** — AI-generated models sometimes come out upside-down or sideways.
   Add a simple rotation correction step (Three.js) in the AR viewer when loading.

---

## Cost Summary

| Item | Free Phase (200 dishes) | Paid Phase |
|------|------------------------|------------|
| 3D generation | Tripo3D free + HuggingFace | ~$0.20/model (Tripo paid) |
| Background removal | remove.bg 50/mo free | $9/mo for unlimited |
| Storage + CDN | Cloudflare R2 free 10GB | $0.015/GB after |
| Database | Neon free tier | $19/mo (Neon Pro) |
| **Total for 200 dishes** | **$0** | — |
