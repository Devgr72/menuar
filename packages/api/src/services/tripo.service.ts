/**
 * Tripo3D image-to-3D pipeline.
 * Upload image → get file_token → submit task → poll for GLB URL.
 *
 * Error code 2010 = insufficient credits → caller should fallback to Hunyuan3D.
 */

const BASE = 'https://api.tripo3d.ai/v2/openapi';

export class TripoNoCreditsError extends Error {
  constructor() { super('Tripo3D: insufficient credits'); }
}

function authHeader() {
  return { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` };
}

/**
 * Upload image to Tripo3D. Returns file_token for task submission.
 * @param imageBuffer - raw image bytes
 * @param mimeType    - 'image/jpeg' | 'image/png'
 */
export async function uploadImageToTripo(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), `dish.${ext}`);

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tripo upload ${res.status}: ${text}`);
  }

  const json = await res.json() as { code: number; data: { image_token: string } };
  if (json.code !== 0) throw new Error(`Tripo upload error code ${json.code}`);
  return json.data.image_token; // becomes file_token in task body
}

/**
 * Submit image_to_model task. Returns task_id.
 * Throws TripoNoCreditsError if credits are exhausted.
 */
export async function submitModelTask(
  fileToken: string,
  imageType: 'jpeg' | 'png' = 'jpeg'
): Promise<string> {
  const res = await fetch(`${BASE}/task`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: imageType, file_token: fileToken },
    }),
  });

  const json = await res.json() as { code: number; message?: string; data?: { task_id: string } };

  if (json.code === 2010) throw new TripoNoCreditsError();
  if (json.code !== 0 || !json.data) {
    throw new Error(`Tripo task error ${json.code}: ${json.message}`);
  }

  return json.data.task_id;
}

export type TripoTaskStatus =
  | { done: false; status: string }
  | { done: true; success: true; glbUrl: string }
  | { done: true; success: false; error: string };

export async function pollTask(taskId: string): Promise<TripoTaskStatus> {
  const res = await fetch(`${BASE}/task/${taskId}`, { headers: authHeader() });
  if (!res.ok) return { done: true, success: false, error: `Poll failed: ${res.status}` };

  const json = await res.json() as {
    code: number;
    data: { status: string; result?: { model?: { url?: string } } };
  };

  if (json.code !== 0) return { done: true, success: false, error: `Tripo code ${json.code}` };

  const { status, result } = json.data;

  if (status === 'success') {
    const glbUrl = result?.model?.url;
    if (!glbUrl) return { done: true, success: false, error: 'No GLB URL in Tripo result' };
    return { done: true, success: true, glbUrl };
  }
  if (status === 'failed' || status === 'cancelled') {
    return { done: true, success: false, error: `Task ${status}` };
  }
  return { done: false, status };
}
