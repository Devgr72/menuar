/**
 * Hunyuan3D 2.1 via HuggingFace Gradio HTTP API — completely free.
 * Space: tencent/Hunyuan3D-2.1
 *
 * Gradio REST pattern:
 *   POST /call/{api_name}        → { event_id }
 *   GET  /call/{api_name}/{id}   → SSE stream, last "complete" event has [glbUrl]
 */

const SPACE = 'https://tencent-hunyuan3d-2-1.hf.space';
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

function hfHeaders(): Record<string, string> {
  return HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
}

/**
 * Submit image to Hunyuan3D and return a polling event_id.
 * imageBuffer should be a clean PNG (bg removed) for best results.
 */
export async function submitToHunyuan(imageBuffer: Buffer): Promise<string> {
  // Gradio accepts base64-encoded images in the predict payload
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const res = await fetch(`${SPACE}/call/image_to_3d`, {
    method: 'POST',
    headers: { ...hfHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [{ path: dataUri }] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hunyuan submit ${res.status}: ${text}`);
  }

  const json = await res.json() as { event_id: string };
  return json.event_id;
}

export type HunyuanStatus =
  | { done: false }
  | { done: true; success: true; glbUrl: string }
  | { done: true; success: false; error: string };

/**
 * Poll the SSE stream for a previously submitted event_id.
 * Reads the stream with a timeout — returns current status.
 */
export async function pollHunyuan(eventId: string): Promise<HunyuanStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30s read window

  try {
    const res = await fetch(`${SPACE}/call/image_to_3d/${eventId}`, {
      headers: hfHeaders(),
      signal: controller.signal,
    });

    if (!res.ok) return { done: true, success: false, error: `HF poll ${res.status}` };
    if (!res.body) return { done: false };

    const text = await res.text();
    clearTimeout(timeout);

    // Parse SSE — look for the "complete" event
    const lines = text.split('\n');
    let lastEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) lastEvent = line.slice(7).trim();
      if (line.startsWith('data:') && lastEvent === 'complete') {
        try {
          const data = JSON.parse(line.slice(5).trim()) as unknown[];
          // Hunyuan returns [glbFilePath, previewUrl, ...]
          const glbPath = data[0] as string | { path?: string } | null;
          const glbUrl = typeof glbPath === 'string' ? glbPath : glbPath?.path;
          if (glbUrl) return { done: true, success: true, glbUrl };
          return { done: true, success: false, error: 'No GLB path in Hunyuan result' };
        } catch {
          return { done: true, success: false, error: 'Failed to parse Hunyuan result' };
        }
      }
      if (line.startsWith('data:') && lastEvent === 'error') {
        return { done: true, success: false, error: `Hunyuan error: ${line.slice(5).trim()}` };
      }
    }

    // Stream didn't complete yet
    return { done: false };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') return { done: false };
    return { done: true, success: false, error: String(err) };
  }
}
