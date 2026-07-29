/**
 * Photo → 3D model pipeline.
 *
 * Provider priority:
 *   1. Tripo3D (free tier API)
 *   2. Hunyuan3D 2.1 via HuggingFace (free, fallback when Tripo credits = 0)
 *
 * startPipeline() → async, returns immediately, runs in background.
 * startPoller()   → setInterval every 15s, drives task completion.
 */
import { Dish, DishPhoto } from '../db/models/index.js';
import { removeBackground } from './bgremoval.service.js';
import { uploadImageToTripo, submitModelTask, pollTask, TripoNoCreditsError } from './tripo.service.js';
import { submitToHunyuan, pollHunyuan } from './hunyuan.service.js';
import { saveFile } from './storage.service.js';

const POLL_INTERVAL = 15_000;

type TaskMeta = { provider: 'tripo' | 'hunyuan'; taskId: string };
const pendingTasks = new Map<string, TaskMeta>(); // dishId → task meta

// ── Helpers ──────────────────────────────────────────────────────────────────

async function downloadAndSaveGlb(dishId: string, glbUrl: string): Promise<void> {
  await Dish.updateOne({ _id: dishId }, { modelStatus: 'compressing' });

  const glbRes = await fetch(glbUrl);
  if (!glbRes.ok) throw new Error(`GLB download failed: ${glbRes.status}`);
  const glbBuffer = Buffer.from(await glbRes.arrayBuffer());

  const { url: modelUrl } = await saveFile('models', `${dishId}.glb`, glbBuffer);
  await Dish.updateOne({ _id: dishId }, { modelStatus: 'ready', modelUrl });

  console.log(`[pipeline] dish=${dishId} ✓ ready → ${modelUrl}`);
}

// ── Main pipeline entry point ────────────────────────────────────────────────

export async function startPipeline(dishId: string, imageBuffer: Buffer): Promise<void> {
  const ts = Date.now();

  try {
    // 1. Save original + start bg removal
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'bg_removing' });

    const { url: originalUrl } = await saveFile('originals', `${dishId}-${ts}.jpg`, imageBuffer);
    await DishPhoto.create({ dishId, originalKey: `originals/${dishId}-${ts}.jpg` });

    // 2. Remove background
    const cleanedBuffer = await removeBackground(imageBuffer);
    const { key: cleanedKey } = await saveFile('cleaned', `${dishId}-${ts}.png`, cleanedBuffer);

    await DishPhoto.updateMany(
      { dishId, originalKey: `originals/${dishId}-${ts}.jpg` },
      { cleanedKey },
    );
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'bg_done', thumbnailUrl: originalUrl });

    // 3. Try Tripo3D, fallback to Hunyuan3D
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'generating_3d' });

    if (process.env.TRIPO_API_KEY) {
      try {
        const fileToken = await uploadImageToTripo(cleanedBuffer, 'image/png');
        const taskId = await submitModelTask(fileToken, 'png');
        await Dish.updateOne({ _id: dishId }, { modelSource: 'tripo' });
        pendingTasks.set(dishId, { provider: 'tripo', taskId });
        console.log(`[pipeline] dish=${dishId} → Tripo task=${taskId}`);
        return;
      } catch (err) {
        if (err instanceof TripoNoCreditsError) {
          console.warn(`[pipeline] Tripo credits exhausted — falling back to Hunyuan3D`);
        } else {
          console.warn(`[pipeline] Tripo error, falling back to Hunyuan3D:`, err);
        }
      }
    }

    // Hunyuan3D fallback
    const eventId = await submitToHunyuan(cleanedBuffer);
    await Dish.updateOne({ _id: dishId }, { modelSource: 'hunyuan' });
    pendingTasks.set(dishId, { provider: 'hunyuan', taskId: eventId });
    console.log(`[pipeline] dish=${dishId} → Hunyuan eventId=${eventId}`);
  } catch (err) {
    console.error(`[pipeline] dish=${dishId} failed:`, err);
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'failed' }).catch(() => {});
  }
}

// ── Poller ───────────────────────────────────────────────────────────────────

async function processPendingTask(dishId: string, meta: TaskMeta): Promise<void> {
  const result = meta.provider === 'tripo' ? await pollTask(meta.taskId) : await pollHunyuan(meta.taskId);

  if (!result.done) {
    console.log(`[poller] dish=${dishId} provider=${meta.provider} still running`);
    return;
  }

  pendingTasks.delete(dishId);

  if (!result.success) {
    console.error(`[poller] dish=${dishId} failed: ${(result as any).error}`);
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'failed' });
    return;
  }

  try {
    await downloadAndSaveGlb(dishId, result.glbUrl);
  } catch (err) {
    console.error(`[poller] dish=${dishId} save error:`, err);
    await Dish.updateOne({ _id: dishId }, { modelStatus: 'failed' });
  }
}

export function startPoller(): void {
  // On restart, reset stuck tasks so they can be resubmitted
  Dish.find({ modelStatus: 'generating_3d' })
    .then((dishes) => {
      if (dishes.length > 0) {
        console.log(`[poller] ${dishes.length} stuck generating_3d → resetting to failed`);
        return Dish.updateMany({ modelStatus: 'generating_3d' }, { modelStatus: 'failed' });
      }
    })
    .catch(() => {});

  setInterval(async () => {
    if (pendingTasks.size === 0) return;
    const tasks = [...pendingTasks.entries()];
    await Promise.allSettled(tasks.map(([dishId, meta]) => processPendingTask(dishId, meta)));
  }, POLL_INTERVAL);

  console.log(`[poller] Started — polling every ${POLL_INTERVAL / 1000}s`);
}
