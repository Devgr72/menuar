# AR Concept — Implementation Guide

## The Core AR Experience (Refined)

### What the user sees
- Phone camera is live on screen (full screen)
- Their **physical menu / table is visible** through the camera
- A scrollable horizontal strip of **dish name pills** sits at the bottom
- A **3D dish model floats above the table** anchored to a detected flat surface
- Tapping different dish pills **swaps the 3D model** — the camera/scene stays the same
- The model can be **dragged around** on the surface and **pinched to resize**
- Tapping the model or an info button slides up a **dish detail card**

### Why this UX beats alternatives
- One scanner = whole menu. Customer doesn't hunt for QR codes on each dish.
- The physical menu stays visible (important — they still need to see prices/ordering info)
- Model on the TABLE feels more real than model floating in space
- Swapping models without reloading keeps it snappy and impressive

---

## Technology Choice: Mind AR.js

### Why Mind AR over alternatives

| Option | Cost | Surface Tracking | Image Tracking | No App | Verdict |
|--------|------|-----------------|----------------|--------|---------|
| 8th Wall | $1000+/mo | ✓ | ✓ | ✓ | Too expensive for MVP |
| Mind AR | Free | ✓ | ✓ | ✓ | **Use this** |
| AR.js | Free | Limited | ✓ | ✓ | Less maintained |
| Zappar | Freemium | ✓ | ✓ | ✓ | Good backup option |
| Model Viewer | Free | Native WebXR | ✗ | ✓ | No surface tracking |

Mind AR gives us image target tracking (point at menu → model appears) AND surface tracking (place model on table). Free, actively maintained, Three.js integration built in.

### Phase 1: Surface Tracking (MVP)
User points camera at table → plane is detected → model placed on detected surface.

```
Flow:
User scans QR → /ar/restaurant-slug?table=3
→ React loads MindARThree scene
→ Surface plane detected (blue grid appears briefly)
→ User taps screen to place anchor point
→ 3D dish model renders at anchor, floating slightly above surface
→ Dish pills shown at bottom of screen
→ User taps different pill → model swaps
```

### Phase 2: Image Target Tracking (v1.5)
User points camera at PRINTED QR/pattern on menu → model appears automatically at that location, anchored to the menu itself. No tap needed.

This requires a custom image target compiled with Mind AR's compiler.
We generate a unique image target pattern per restaurant and embed it in their printed QR card.

---

## Mind AR + Three.js Integration Pattern

### Basic setup (what every AR file should follow)
```javascript
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

const mindarThree = new MindARThree({
  container: containerRef.current,
  imageTargetSrc: '/targets/restaurant-slug.mind',  // compiled target file
  maxTrack: 1,
  filterMinCF: 0.001,
  filterBeta: 1000,
  warmupTolerance: 5,
  missTolerance: 5,
});

const { renderer, scene, camera } = mindarThree;

// Create anchor at target index 0
const anchor = mindarThree.addAnchor(0);

// Add 3D model to anchor
const loader = new GLTFLoader();
loader.load(modelUrl, (gltf) => {
  anchor.group.add(gltf.scene);
});

// Start AR
await mindarThree.start();

// Render loop
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

// CRITICAL: Cleanup on unmount
return () => {
  renderer.setAnimationLoop(null);
  mindarThree.stop();
  // Dispose all geometries, materials, textures
};
```

### Surface tracking (alternative for MVP)
```javascript
import { MindARThree } from 'mind-ar/dist/mindar-face-three.prod.js';
// Actually use WebXR hit-test for surface detection
// Or: use the simpler approach — fixed AR scene with gyroscope-based orientation
```

For surface tracking in MVP, use **`<model-viewer>`** web component as the quick win:
- Google's `<model-viewer>` supports WebXR AR natively
- Works on Android Chrome without Mind AR
- iOS uses Quick Look AR
- Zero setup, just drop in a GLB URL

```html
<model-viewer
  src="/models/truffle-caesar.glb"
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  auto-rotate
  shadow-intensity="1"
>
  <button slot="ar-button">View in your space</button>
</model-viewer>
```

**Recommendation: Use `<model-viewer>` for MVP surface AR, then graduate to Mind AR for image target tracking in v1.5.**

---

## 3D Model Pipeline

### Sources for MVP (in order of preference)
1. **AI generation via Meshy.ai** — Send 4 photos of dish → get GLB in ~2 mins → review → upload
2. **Poly Pizza / Sketchfab free models** — Free food models for placeholders during dev
3. **Manual Blender** — Only for hero dishes that need to look perfect

### Model requirements
- Format: GLB (self-contained, single file)
- Size: < 2MB per model (use Draco compression)
- Poly count: < 50k triangles (for mobile GPU)
- Textures: max 1024x1024px, JPEG compressed
- Origin: centered at (0,0,0), food facing upward (+Y)
- Scale: 1 unit = 1 meter (Mind AR default)

### Optimization command
```bash
# Install gltf-pipeline
npm install -g gltf-pipeline

# Compress a model
gltf-pipeline -i input.glb -o output.glb --draco.compressionLevel 7

# Check model stats
npx gltf-transform inspect model.glb
```

---

## AR Scene Architecture

```
ARScene (React component)
├── MindARProvider      — manages mindarThree lifecycle
├── SceneCanvas         — Three.js renderer canvas (full screen)
├── DishAnchor          — the 3D model that lives in AR space
│   ├── ActiveDishModel — currently selected GLTF model
│   ├── RotationRig     — handles auto-rotate + user drag-rotate
│   └── ScaleRig        — handles pinch-to-scale
├── DishStrip           — scrollable pill row (bottom of screen, HTML overlay)
│   └── DishPill[]      — one per dish, tap to set activeDish
├── DishInfoPanel       — slide-up detail panel (HTML overlay)
│   ├── DishName
│   ├── PriceTag
│   ├── VegBadge
│   ├── SpiceLevel
│   ├── Ingredients
│   └── AIDescription
└── ARStatusBar         — top bar: restaurant name, close button, language selector
```

### State (Zustand store)
```typescript
interface MenuARStore {
  // AR state
  arStarted: boolean
  arSupported: boolean
  surfaceDetected: boolean
  
  // Menu data
  restaurant: Restaurant | null
  menu: Menu | null
  dishes: Dish[]
  
  // Active dish
  activeDishId: string | null
  infoOpen: boolean
  
  // Actions
  setActiveDish: (id: string) => void
  toggleInfo: () => void
  startAR: () => void
}
```

---

## Camera Permission Handling

```typescript
// Always ask BEFORE initializing AR
async function requestCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (result.state === 'granted') return 'granted';
    
    // Try to actually get the stream — this triggers the permission prompt
    await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    return 'granted';
  } catch {
    return 'denied';
  }
}
```

### Permission denied fallback
Show a 2D scrollable menu with model-viewer spinning models instead of AR.
Never show a blank screen or error. Always give value.

---

## Performance Rules for AR

1. **Load models lazily** — only fetch GLB when that dish is first tapped
2. **Cache loaded models** — once a GLB is loaded, store it in a Map, don't re-fetch
3. **Limit scene objects** — only one dish model visible at a time (dispose previous)
4. **Throttle drag events** — requestAnimationFrame, not every touchmove
5. **Renderer pixel ratio** — cap at `Math.min(window.devicePixelRatio, 2)` for battery life
6. **Suspend AR when tab hidden** — pause render loop on `visibilitychange`

---

## HTTPS Requirement

WebAR requires:
- HTTPS (camera API only works on secure context)
- OR localhost (for development)

For local dev:
```bash
# Vite with HTTPS
npm run dev -- --https
# OR use mkcert for trusted local cert
mkcert -install && mkcert localhost
```

For testing on phone during dev:
```bash
# Expose local dev to phone via ngrok
npx ngrok http 5173
# Use the https:// ngrok URL on your phone
```
