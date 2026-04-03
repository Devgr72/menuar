/**
 * Photo → 3D model pipeline orchestrator.
 *
 * startPipeline(dishId, imageBuffer):
 *   1. Save original photo
 *   2. Remove background (remove.bg)
 *   3. Upload cleaned image to Tripo3D → get image_token
 *   4. Submit task → get task_id
 *   5. Register with poller
 *
 * PipelinePoller.start():
 *   - setInterval every POLL_INTERVAL ms
 *   - For each pending task: poll Tripo3D
 *   - On success: download GLB, save, update DB
 */
import { PrismaClient, ModelStatus, ModelSource } from '@prisma/client';
import { removeBackground } from './bgremoval.service.js';
import { uploadImageToTripo, submitModelTask, pollTask } from './tripo.service.js';
import { saveFile } from './storage.service.js';

const prisma = new PrismaClient();
const POLL_INTERVAL = 15_000; // 15 seconds

// dishId → tripoTaskId for all in-flight tasks
const pendingTasks = new Map<string, string>();

// ── Main pipeline entry point ────────────────────────────────────────────────

export async function startPipeline(dishId: string, imageBuffer: Buffer): Promise<void> {
  const ts = Date.now();

  try {
    // 1. Save original
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.bg_removing },
    });

    const { url: originalUrl } = await saveFile('originals', `${dishId}-${ts}.jpg`, imageBuffer);

    // Save DishPhoto record
    await prisma.dishPhoto.create({
      data: { dishId, originalKey: `originals/${dishId}-${ts}.jpg` },
    });

    // 2. Remove background
    const cleanedBuffer = await removeBackground(imageBuffer);

    const { key: cleanedKey } = await saveFile('cleaned', `${dishId}-${ts}.png`, cleanedBuffer);

    // Update DishPhoto with cleaned key
    await prisma.dishPhoto.updateMany({
      where: { dishId, originalKey: `originals/${dishId}-${ts}.jpg` },
      data: { cleanedKey },
    });

    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.bg_done },
    });

    // 3. Upload to Tripo3D + submit task
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.generating_3d, modelSource: ModelSource.tripo },
    });

    const imageToken = await uploadImageToTripo(cleanedBuffer);
    const taskId = await submitModelTask(imageToken);

    console.log(`[pipeline] dish=${dishId} tripoTaskId=${taskId}`);
    pendingTasks.set(dishId, taskId);

    // Update thumbnail URL from original
    await prisma.dish.update({
      where: { id: dishId },
      data: { thumbnailUrl: originalUrl },
    });

  } catch (err) {
    console.error(`[pipeline] Failed to start pipeline for dish ${dishId}:`, err);
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.failed },
    }).catch(() => {});
  }
}

// ── Background poller ────────────────────────────────────────────────────────

async function processPendingTask(dishId: string, taskId: string): Promise<void> {
  const result = await pollTask(taskId);

  if (!result.done) {
    console.log(`[poller] dish=${dishId} status=${result.status}`);
    return; // still running — check again next interval
  }

  pendingTasks.delete(dishId);

  if (!result.success) {
    console.error(`[poller] dish=${dishId} failed: ${result.error}`);
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.failed },
    });
    return;
  }

  // Download GLB and save
  try {
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.compressing },
    });

    const glbRes = await fetch(result.glbUrl);
    if (!glbRes.ok) throw new Error(`GLB download failed: ${glbRes.status}`);
    const glbBuffer = Buffer.from(await glbRes.arrayBuffer());

    const { url: modelUrl } = await saveFile('models', `${dishId}.glb`, glbBuffer);

    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.ready, modelUrl },
    });

    console.log(`[poller] dish=${dishId} ready → ${modelUrl}`);
  } catch (err) {
    console.error(`[poller] dish=${dishId} GLB save error:`, err);
    await prisma.dish.update({
      where: { id: dishId },
      data: { modelStatus: ModelStatus.failed },
    });
  }
}

export function startPoller(): void {
  // Recover any dishes stuck in generating_3d from a previous server restart
  prisma.dish
    .findMany({ where: { modelStatus: ModelStatus.generating_3d } })
    .then((dishes) => {
      if (dishes.length > 0) {
        console.log(`[poller] ${dishes.length} dish(es) stuck in generating_3d — marking failed for resubmission`);
        return prisma.dish.updateMany({
          where: { modelStatus: ModelStatus.generating_3d },
          data: { modelStatus: ModelStatus.failed },
        });
      }
    })
    .catch(() => {});

  setInterval(async () => {
    if (pendingTasks.size === 0) return;

    const tasks = [...pendingTasks.entries()];
    await Promise.allSettled(
      tasks.map(([dishId, taskId]) => processPendingTask(dishId, taskId))
    );
  }, POLL_INTERVAL);

  console.log(`[poller] Started — polling every ${POLL_INTERVAL / 1000}s`);
}
