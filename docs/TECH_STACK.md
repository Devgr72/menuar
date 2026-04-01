# Tech Stack — Decisions & Reasoning

## Frontend: Customer AR Experience (apps/web)

### React 18 + Vite
- Why React: Component model maps cleanly to AR overlay UI (dish strip, info panel, status bar)
- Why Vite: Fast HMR, native ESM, excellent for Three.js (large 3D library)
- Why NOT Next.js: AR runs entirely client-side. SSR adds complexity with no benefit for WebAR.

### Mind AR.js (WebAR engine)
- Free, open-source, actively maintained
- Supports both image target tracking AND surface tracking
- First-class Three.js integration (`MindARThree`)
- Works in mobile Safari + Android Chrome (the two browsers that matter)
- Image target compiler: compile a custom marker → phone recognizes it instantly
- CDN: `https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/`

**Alternative if Mind AR has issues:** Use `<model-viewer>` by Google for MVP
- Zero setup, handles WebXR AR automatically
- Android: uses Scene Viewer (system AR)
- iOS: uses Quick Look (system AR)  
- Trade-off: less control over UI, can't do custom overlay UI

### Three.js + GLTF Loader
- Industry standard for WebGL/3D in browser
- Mind AR's official 3D library
- GLTFLoader for loading dish models
- DRACOLoader for compressed models (essential for 2MB budget)
- OrbitControls for touch-based model interaction

### Zustand (state management)
- Tiny (2KB), zero boilerplate
- Synchronizes AR scene state with React UI state
- Much simpler than Redux for this use case

### Tailwind CSS
- Utility-first = fast UI development
- Purges unused styles (important for mobile bundle size)
- JIT mode handles dynamic classes

---

## Frontend: Restaurant Dashboard (apps/dashboard)

### React 18 + Vite + Clerk
- Clerk: Drop-in auth with pre-built UI components (login, signup, org management)
- React Query (TanStack Query): Server state management, caching, optimistic updates
- React Hook Form + Zod: Form handling + validation
- Shadcn/ui: Accessible, unstyled UI components (fits our custom brand)

---

## Backend (packages/api)

### Node.js + Express + TypeScript
- Express: Minimal, flexible, massive ecosystem
- TypeScript: Catch type errors before they hit production
- Why NOT Fastify/Hono: Express familiarity is better for vibe-coding speed

### Prisma + PostgreSQL
- Prisma: Type-safe ORM, excellent schema migration workflow
- PostgreSQL: Relational structure suits restaurant > menu > category > dish hierarchy
- Hosted on: Neon (serverless Postgres, free tier, connects from Railway easily)

### Cloudflare R2 (file storage)
- Zero egress fees (unlike S3 which charges for downloads)
- GLB files get downloaded every time a dish is viewed → egress adds up fast
- Use `@aws-sdk/client-s3` (R2 is S3-compatible API)
- CDN via Cloudflare Workers (automatic, R2 public buckets)

### Clerk SDK (auth middleware)
```typescript
import { clerkMiddleware, requireAuth } from '@clerk/express'
app.use(clerkMiddleware())
app.use('/api/v1/dashboard', requireAuth())
```

---

## AI Services

### Anthropic Claude API (dish descriptions)
- Model: `claude-sonnet-4-20250514`
- Use case: Generate dish descriptions, detect allergens, suggest pairings
- Prompt template (in `packages/api/src/services/ai.service.ts`):

```
You are a food writer for a restaurant menu app. 
Given a dish name and cuisine type, write:
1. A 2-sentence description that makes the dish sound appealing and explains what it is
2. A list of main ingredients (max 8)
3. Likely allergens from: [gluten, dairy, eggs, nuts, shellfish, soy, fish]
4. One sentence explaining why this dish is priced at [price]

Dish: {dishName}
Cuisine: {cuisineType}  
Price: ₹{price}

Respond in JSON only.
```

### Google Translate API
- Use case: Translate dish names + descriptions to 20+ languages
- Trigger: User's `navigator.language` → auto-translate on AR experience load
- Cache translations in PostgreSQL `translations` JSON column

### Meshy.ai API (3D model generation)
- REST API: `POST https://api.meshy.ai/v2/image-to-3d`
- Input: 4 images of dish from different angles
- Output: GLB file URL (download and re-host on our R2)
- Time: 2-5 minutes per dish
- Cost: ~$0.10-0.30 per model (cheap enough to include in setup fee)

```typescript
// Basic Meshy.ai integration
const response = await fetch('https://api.meshy.ai/v2/image-to-3d', {
  method: 'POST',
  headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
  body: JSON.stringify({
    image_urls: [photo1Url, photo2Url, photo3Url, photo4Url],
    should_remesh: true,
    should_texture: true,
  })
})
const { task_id } = await response.json()
// Poll GET /v2/image-to-3d/:task_id until status === 'SUCCEEDED'
// Then download model_urls.glb and upload to R2
```

---

## QR Code Generation

```typescript
import QRCode from 'qrcode'

// Generate QR as PNG buffer
const qrBuffer = await QRCode.toBuffer(
  `https://menuar.app/ar/${restaurant.slug}?table=${table.tableNumber}`,
  {
    errorCorrectionLevel: 'H',  // High — survives damage on printed material
    width: 400,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' }
  }
)

// Store in R2 and return download URL
```

---

## Infrastructure

### Hosting
- **apps/web** → Vercel (auto-deploy from Git, global CDN, free tier fine for MVP)
- **apps/dashboard** → Vercel (same)
- **packages/api** → Railway (persistent Node.js server, $5/mo Hobby plan)
- **PostgreSQL** → Neon (serverless Postgres, free tier = 512MB, enough for MVP)
- **3D models + images** → Cloudflare R2 (free up to 10GB storage, $0 egress)

### Estimated monthly costs at MVP stage
| Service | Cost |
|---------|------|
| Vercel (web + dashboard) | Free |
| Railway (API) | $5 |
| Neon (Postgres) | Free |
| Cloudflare R2 (10GB models) | Free |
| Clerk (up to 10k MAU) | Free |
| Claude API (100 descriptions/mo) | ~$2 |
| Google Translate (light usage) | Free tier |
| Meshy.ai (50 models) | ~$15 |
| **Total** | **~$22/mo** |

---

## Development Environment

### Prerequisites
```
Node.js >= 20
npm >= 10
Git
A phone with Chrome/Safari for AR testing
ngrok account (free) for phone testing
```

### Recommended VS Code Extensions
- Prisma
- Tailwind CSS IntelliSense
- ESLint
- TypeScript Hero

### Key npm packages reference
```json
{
  "apps/web": {
    "dependencies": {
      "react": "^18",
      "three": "^0.168",
      "mind-ar": "^1.2.2",
      "zustand": "^5",
      "react-router-dom": "^6",
      "@google/model-viewer": "^4"
    }
  },
  "packages/api": {
    "dependencies": {
      "express": "^4",
      "@prisma/client": "^5",
      "@clerk/express": "^1",
      "@anthropic-ai/sdk": "^0.30",
      "@aws-sdk/client-s3": "^3",
      "qrcode": "^1.5",
      "zod": "^3"
    }
  }
}
```
