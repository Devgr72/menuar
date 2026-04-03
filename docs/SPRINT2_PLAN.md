# Sprint 2 — Production Data Layer Plan

## What We're Building

Full production pipeline so restaurants can sign up, upload their menu with dish photos,
get 3D models generated automatically, and hand customers a QR code that opens a real AR experience.

```
Restaurant signs up
  → adds menu items + uploads dish photo
  → background removed automatically
  → 3D model generated from photo (free tier: HuggingFace AI)
  → QR generated per table
  → customer scans QR → AR experience with real model on table
```

---

## 3D Model Strategy — Free First, Paid When Ready

> Research done April 2025. Meshy AI free tier has no API access — web UI only, not automatable.
> Best zero-cost path for 200 dish models is a 3-tier approach below.

### Tier 1 — Curated Free GLB Library (instant, zero cost, ~50 models)

Use **Poly Pizza** (poly.pizza) and **Sketchfab** free models to cover the most common dish types.
These are already GLB files, CC0 or CC-BY licensed, ready for WebAR today.

- **Poly Pizza**: 30+ food models, CC0 license, GLB download, low-poly style that looks clean in AR
- **Sketchfab**: thousands of food models, filter by `cc0` tag, GLB export via platform

**What this covers:** pizza, burger, sushi, pasta bowl, rice dish, salad, curry, dessert, steak, soup, sandwich

**Action:** Download ~40 models. Create a `modelLibrary.json` mapping dish keywords → R2 model URL.
When a dish is created, the system keyword-matches to the closest pre-built model.

### Tier 2 — HuggingFace AI Generation (free, automated, ~150 models overnight)

Use **Hunyuan3D 2.1** (Tencent, open-source) or **TRELLIS.2** (Microsoft, MIT) via HuggingFace
Spaces + `gradio_client` Python script. Both produce textured GLB with PBR materials. Both are
scriptable — you feed a dish photo, get a GLB back. No API key. No cost.

**Best model for food photos: Hunyuan3D 2.1**
- HuggingFace Space: `tencent/Hunyuan3D-2.1`
- Input: 1 dish photo (remove.bg first for clean background)
- Output: GLB with PBR textures — looks realistic in AR
- Time: ~30-60 seconds per model on HuggingFace free hardware
- Rate limit: ~50-100 requests/hour on free tier → run overnight in batches
- License: open-source, commercial use OK

**Backup: InstantMesh** (TencentARC/InstantMesh)
- Faster (~10s per model), slightly lower quality
- Also returns GLB, also scriptable via gradio_client
- Use when you need speed over quality

**Batch script approach** (run in `scripts/generate_models.py`):
```python
from gradio_client import Client
import time, os

client = Client("tencent/Hunyuan3D-2.1")
photos = os.listdir("./dish_photos/")

for i, photo in enumerate(photos):
    result = client.predict(photo, api_name="/image_to_3d")
    # result contains the GLB file path
    # compress it, upload to R2
    time.sleep(5)  # stay within rate limits
    if i % 20 == 0:
        time.sleep(60)  # longer pause every 20 models
```

### Tier 3 — Paid APIs (when going to production)

When the MVP is validated and restaurants are paying, switch the pipeline to:

| Option | Cost | Quality | API |
|--------|------|---------|-----|
| **Meshy AI** (Image-to-3D) | ~$0.20/model (Pro plan $20/mo) | Best | Yes |
| **Tripo3D** | ~$0.20-0.40/model (via fal.ai) | Excellent | Yes |
| **Stable Fast 3D** (self-hosted) | ~$0.01/model (GPU rental) | Very good | Self-hosted |

**Note:** Meshy and Tripo have no free API tier — their free plans are web UI only.
For MVP (under 500 models), Meshy at $0.20/model = $100 total. Negligible.

---

## Tech Stack Decisions

| Component | MVP Choice (Free) | Paid Upgrade Path |
|---|---|---|
| Auth | Clerk (free up to 10k MAU) | Same |
| Database | PostgreSQL + Prisma on Neon (free) | Same |
| File Storage | Cloudflare R2 (free 10GB) | Same — R2 scales cheaply |
| Background Removal | Remove.bg (free 50/mo trial) | Remove.bg $9/mo or rembg open-source |
| 3D Model Generation | Hunyuan3D 2.1 via HuggingFace (free) | Meshy AI API ($0.20/model) |
| Model Library | Poly Pizza + Sketchfab free GLBs | Per-dish AI generation |
| Model CDN | R2 public bucket URL | Same |
| QR Codes | `qrcode` npm package | Same |
| Dashboard UI | apps/dashboard (React + Vite + Clerk) | Same |
| Job Processing | In-process polling loop | BullMQ when at scale |

---

## Prisma Schema

```
Restaurant  → has many Tables, one active Menu
Table       → belongs to Restaurant, has tableNumber
Menu        → belongs to Restaurant, has many Categories
Category    → has many Dishes, has sortOrder
Dish        → name, price, description, isVeg, spiceLevel,
              allergens, modelUrl (R2 CDN), modelStatus,
              modelSource (library | ai_free | ai_paid),
              photos (DishPhoto[])
DishPhoto   → original R2 key + cleaned R2 key (after bg removal)
DishView    → analytics: dish viewed, table, timestamp
QrCode      → tableId, imageUrl, scanCount
```

---

## Photo → 3D Model Pipeline (Free Tier)

```
1. Restaurant uploads dish photo (JPG/PNG) via dashboard
2. Backend receives file (Multer)
3. POST to Remove.bg API → clean transparent PNG (no background)
4. Store original + cleaned photo in Cloudflare R2
5. Try keyword match against model library (Poly Pizza / Sketchfab)
     → if match found: set modelUrl immediately (instant)
     → if no match: fall through to AI generation
6. POST cleaned photo to HuggingFace Hunyuan3D 2.1 via gradio_client
   → get taskId / prediction ID back
7. Return "Processing…" status to dashboard
8. Background poll every 15s until GLB result is ready
9. Download GLB from HuggingFace result URL
10. Run gltf-pipeline Draco compression → under 2MB
11. Upload compressed GLB to R2
12. Update Dish.modelUrl + Dish.modelStatus = "ready"
13. Dashboard live-updates: pending → processing → ready
```

### Model Status Flow
```
uploaded → bg_removing → bg_done → matching_library → generating_3d → compressing → ready → failed
```

### Fallback Chain
```
1. Poly Pizza / Sketchfab keyword match  (instant, always works)
2. HuggingFace AI generation             (free, ~1 min, requires photo)
3. Procedural Three.js model             (instant, browser-side, current system)
```

---

## Background Removal — Free Options

**remove.bg** — 50 free credits/month (1 credit = 1 image). API is clean and reliable.
Sufficient for MVP testing with 200 dishes spread over a few months.

**rembg** (self-hosted open-source alternative):
```bash
pip install rembg
rembg i input.png output.png
```
- Runs locally or on any server, no API cost
- Quality slightly lower than remove.bg for complex backgrounds
- Use this if remove.bg credits run out during testing

For the Node.js API, call rembg as a child process or set up a tiny Python FastAPI sidecar.

---

## API Endpoints to Build

```
GET  /api/v1/menu/:restaurantSlug          → full menu for AR experience
GET  /api/v1/dish/:dishId                  → single dish detail
POST /api/v1/dishes                        → create dish (dashboard)
POST /api/v1/dishes/:dishId/photo          → upload photo + trigger pipeline
GET  /api/v1/dishes/:dishId/model-status   → poll 3D generation status
GET  /api/v1/qr/:restaurantSlug/:tableId   → generate/fetch QR code image
POST /api/v1/restaurants                   → create restaurant (onboarding)
```

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=

# Clerk (auth)
CLERK_SECRET_KEY=
VITE_CLERK_PUBLISHABLE_KEY=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=               # e.g. https://pub-xxxx.r2.dev

# Background removal (free tier: 50/mo)
REMOVE_BG_API_KEY=           # get at remove.bg — free trial

# HuggingFace (for AI generation — no key needed for Spaces, but add for higher rate limits)
HUGGINGFACE_API_TOKEN=       # optional — get free at huggingface.co/settings/tokens

# When upgrading to paid AI generation (later):
# MESHY_API_KEY=             # meshy.ai — $20/mo for 1000 models
# TRIPO_API_KEY=             # tripo3d.ai via fal.ai — pay per model

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## Build Order for Next Session

### Phase A — Data Layer (connect frontend to real DB)
- [ ] Step 1 — Full Prisma schema + migration + seed script (10 dishes for one demo restaurant)
- [ ] Step 2 — `GET /api/v1/menu/:restaurantSlug` working + frontend reading from it (not mock)
- [ ] Step 3 — Cloudflare R2 bucket setup + upload helper + CORS configured

### Phase B — Model Library (instant free 3D models)
- [ ] Step 4 — Download ~40 food GLBs from Poly Pizza, upload to R2, create `modelLibrary.json`
- [ ] Step 5 — Keyword match service: `getModelForDish(dishName) → R2 model URL`
- [ ] Step 6 — Seed dishes now load real GLB models from library — AR experience shows real food

### Phase C — Photo Pipeline (generate models from real photos)
- [ ] Step 7 — Photo upload endpoint (Multer → R2)
- [ ] Step 8 — Remove.bg background removal on upload
- [ ] Step 9 — HuggingFace Hunyuan3D integration (gradio_client Python sidecar or direct HTTP)
- [ ] Step 10 — Polling loop + model-status endpoint + dashboard status updates
- [ ] Step 11 — gltf-pipeline compression step before R2 upload

### Phase D — QR + Dashboard
- [ ] Step 12 — QR code generation endpoint + R2 storage
- [ ] Step 13 — apps/dashboard scaffold (Clerk auth + menu management UI)
- [ ] Step 14 — Dashboard: dish list, add/edit dish, photo upload, status indicator

---

## Key Challenges to Watch

1. **HuggingFace rate limits** — Free tier allows ~50-100 req/hour. Batch overnight. Add retry logic with exponential backoff.
2. **GLB size** — AI models output 5-20MB raw. Always Draco-compress to under 2MB with `gltf-pipeline -i in.glb -o out.glb --draco.compressionLevel 7`.
3. **Python sidecar for HuggingFace** — Node.js doesn't have a gradio_client. Options: (a) spawn Python child process, (b) tiny FastAPI sidecar on Railway, (c) call the Space's REST API directly via fetch (Gradio exposes HTTP endpoints).
4. **iOS AR** — model-viewer handles it. iOS 15+ supports GLB in AR Quick Look natively. No USDZ conversion needed.
5. **R2 CORS** — Must configure R2 bucket CORS to allow requests from the web app domain before models will load.
6. **rembg vs remove.bg** — If remove.bg credits run low during testing, switch to `rembg` via Python subprocess. Same interface, zero cost.

---

## Free vs Paid Cost Summary

| Phase | Model Source | Cost |
|-------|-------------|------|
| MVP Testing (200 dishes) | Poly Pizza library + HuggingFace AI | $0 |
| Background removal (200 dishes) | Remove.bg free 50/mo × a few months | $0 |
| Production launch | Meshy AI API at $0.20/model | ~$40 for 200 models |
| At scale (1000 dishes/mo) | Meshy API on Pro plan | $20/mo flat |

**The free approach is sufficient to test with 200 real dish photos before spending a dollar.**
