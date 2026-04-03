/**
 * Tripo3D image-to-3D pipeline.
 * 1. Upload cleaned PNG → get image_token (no public URL needed)
 * 2. Submit image_to_model task → get task_id
 * 3. Poll task until success/failure → return GLB download URL
 */

const BASE = 'https://api.tripo3d.ai/v2/openapi';

function headers() {
  return {
    Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Upload image buffer to Tripo3D and get an image_token.
 * Tripo hosts it internally — no public URL required from our side.
 */
export async function uploadImageToTripo(imageBuffer: Buffer): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'dish.png');

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tripo upload failed ${res.status}: ${text}`);
  }

  const json = await res.json() as { code: number; data: { image_token: string } };
  if (json.code !== 0) throw new Error(`Tripo upload error: code ${json.code}`);

  return json.data.image_token;
}

/**
 * Submit an image-to-model task using the image_token from uploadImageToTripo.
 * Returns task_id for polling.
 */
export async function submitModelTask(imageToken: string): Promise<string> {
  const res = await fetch(`${BASE}/task`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: 'png', image_token: imageToken },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tripo task submit failed ${res.status}: ${text}`);
  }

  const json = await res.json() as { code: number; data: { task_id: string } };
  if (json.code !== 0) throw new Error(`Tripo task error: code ${json.code}`);

  return json.data.task_id;
}

export type TripoTaskStatus =
  | { done: false; status: string }
  | { done: true; success: true; glbUrl: string }
  | { done: true; success: false; error: string };

/**
 * Single poll — call repeatedly until done: true.
 */
export async function pollTask(taskId: string): Promise<TripoTaskStatus> {
  const res = await fetch(`${BASE}/task/${taskId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    return { done: true, success: false, error: `Poll failed: ${res.status}` };
  }

  const json = await res.json() as {
    code: number;
    data: {
      status: string;
      result?: { model?: { url?: string } };
    };
  };

  if (json.code !== 0) {
    return { done: true, success: false, error: `Tripo code ${json.code}` };
  }

  const { status, result } = json.data;

  if (status === 'success') {
    const glbUrl = result?.model?.url;
    if (!glbUrl) return { done: true, success: false, error: 'No GLB URL in result' };
    return { done: true, success: true, glbUrl };
  }

  if (status === 'failed' || status === 'cancelled') {
    return { done: true, success: false, error: `Task ${status}` };
  }

  // queued | running
  return { done: false, status };
}
