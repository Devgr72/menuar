import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const MODEL_SIZE_LIMIT_BYTES = 2 * 1024 * 1024; // 2MB

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Cache stores the original loaded scene — clone() on every retrieval
const modelCache = new Map<string, THREE.Group>();

export async function loadModel(url: string): Promise<THREE.Group> {
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone(true);
  }

  // Best-effort size check — skipped if CORS blocks HEAD
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (bytes > MODEL_SIZE_LIMIT_BYTES) {
        throw new Error(
          `Model exceeds 2MB budget: ${(bytes / 1024 / 1024).toFixed(1)}MB at ${url}`
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Model exceeds')) throw err;
    // CORS / network error on HEAD — proceed optimistically
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf.scene);
        resolve(gltf.scene.clone(true));
      },
      undefined,
      (err) => reject(new Error(`Failed to load model: ${url} — ${err}`))
    );
  });
}

export function disposeModel(model: THREE.Group): void {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function clearModelCache(): void {
  modelCache.forEach((model) => disposeModel(model));
  modelCache.clear();
}
