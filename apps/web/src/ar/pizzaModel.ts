import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

type PizzaType = 'margherita' | 'pepperoni' | 'bbq' | 'fungi' | 'default';

// Blob URL cache — generate once per pizza type per session
const urlCache = new Map<PizzaType, string>();

export function getPizzaType(dishName: string): PizzaType {
  const n = dishName.toLowerCase();
  if (n.includes('margherita')) return 'margherita';
  if (n.includes('pepperoni')) return 'pepperoni';
  if (n.includes('bbq') || n.includes('chicken')) return 'bbq';
  if (n.includes('fungi') || n.includes('mushroom') || n.includes('truffle')) return 'fungi';
  return 'default';
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function mat(color: number, roughness = 0.8, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addCircle(
  group: THREE.Group,
  color: number,
  radius: number,
  height: number,
  y: number,
  roughness = 0.8
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 64, 1),
    mat(color, roughness)
  );
  mesh.position.y = y;
  group.add(mesh);
  return mesh;
}

function addTopping(
  group: THREE.Group,
  color: number,
  r: number,   // topping radius
  h: number,   // topping height
  count: number,
  spreadR: number, // spread within this radius
  yBase: number,
  roughness = 0.85
) {
  const geo = new THREE.CylinderGeometry(r, r * 0.9, h, 16);
  const mat_ = mat(color, roughness);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.3 : -0.3);
    const dist = spreadR * (0.4 + Math.abs(Math.sin(i * 7.3)) * 0.5);
    const mesh = new THREE.Mesh(geo, mat_);
    mesh.position.set(
      Math.cos(angle) * dist,
      yBase,
      Math.sin(angle) * dist
    );
    group.add(mesh);
  }
}

// ─── Build pizza per type ─────────────────────────────────────────────────────

function buildPizza(type: PizzaType): THREE.Group {
  const g = new THREE.Group();

  // ── Base dough (full disk) ──────────────────────────────────────
  addCircle(g, 0xD4A46A, 0.13, 0.024, 0.0, 0.95);   // golden dough

  // ── Crust ring (torus) ─────────────────────────────────────────
  const crustGeo = new THREE.TorusGeometry(0.13, 0.013, 8, 64);
  const crust = new THREE.Mesh(crustGeo, mat(0xC07840, 0.95));
  crust.rotation.x = Math.PI / 2;
  crust.position.y = 0.012;
  g.add(crust);

  // ── Sauce layer ────────────────────────────────────────────────
  const sauceColor =
    type === 'bbq' ? 0x7A2E10 :
    type === 'fungi' ? 0xEEDDC0 :
    0xBB1E00;
  addCircle(g, sauceColor, 0.112, 0.006, 0.015, 0.85);

  // ── Cheese layer ───────────────────────────────────────────────
  const cheeseColor = type === 'fungi' ? 0xEDE0A0 : 0xF0CC5A;
  addCircle(g, cheeseColor, 0.105, 0.005, 0.020, 0.7);

  // ── Toppings by type ──────────────────────────────────────────
  const tY = 0.025;

  switch (type) {
    case 'margherita':
      // Fresh mozzarella blobs
      addTopping(g, 0xFFFAF0, 0.022, 0.012, 7, 0.085, tY, 0.7);
      // Basil leaves (flat green discs)
      addTopping(g, 0x2A6B1E, 0.018, 0.004, 5, 0.070, tY + 0.006, 0.9);
      // Cherry tomato halves
      addTopping(g, 0xCC2200, 0.014, 0.010, 4, 0.060, tY, 0.75);
      break;

    case 'pepperoni':
      // Large pepperoni slices
      addTopping(g, 0x8B1515, 0.028, 0.009, 8, 0.090, tY, 0.8);
      // Smaller inner pepperoni
      addTopping(g, 0xA52020, 0.020, 0.008, 5, 0.050, tY, 0.8);
      // Edge char marks on pepperoni (tiny dark spots)
      addTopping(g, 0x3A0A0A, 0.008, 0.004, 8, 0.088, tY + 0.008, 0.95);
      break;

    case 'bbq':
      // Chicken chunks (tan)
      addTopping(g, 0xD4A06A, 0.028, 0.013, 6, 0.085, tY, 0.8);
      // Caramelized onion pieces (translucent amber)
      addTopping(g, 0xC87C18, 0.014, 0.007, 8, 0.075, tY, 0.75);
      // Red capsicum strips
      addTopping(g, 0xCC2010, 0.010, 0.006, 6, 0.065, tY + 0.005, 0.8);
      break;

    case 'fungi':
      // Wild mushroom caps (large, dark brown)
      addTopping(g, 0x6B3D1A, 0.032, 0.016, 5, 0.082, tY, 0.85);
      // Shiitake mushrooms (lighter)
      addTopping(g, 0x9B6030, 0.020, 0.012, 4, 0.055, tY, 0.8);
      // Truffle shavings (thin dark slices)
      addTopping(g, 0x2A1A08, 0.018, 0.004, 6, 0.070, tY + 0.014, 0.95);
      // Rosemary sprigs (tiny green dots)
      addTopping(g, 0x2D6030, 0.005, 0.008, 8, 0.080, tY, 0.9);
      break;

    default:
      // Mixed — pepperoni + mozzarella
      addTopping(g, 0x8B1515, 0.026, 0.009, 6, 0.085, tY, 0.8);
      addTopping(g, 0xFFFAF0, 0.020, 0.011, 5, 0.065, tY, 0.7);
  }

  return g;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function getPizzaModelUrl(dishName: string): Promise<string> {
  const type = getPizzaType(dishName);

  const cached = urlCache.get(type);
  if (cached) return cached;

  const pizza = buildPizza(type);

  return new Promise<string>((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      pizza,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        urlCache.set(type, url);

        // Dispose Three.js objects — they've been serialised, no longer needed
        pizza.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });

        resolve(url);
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

export function clearPizzaModelCache() {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}
