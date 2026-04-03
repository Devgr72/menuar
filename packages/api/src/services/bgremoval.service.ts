/**
 * Background removal via remove.bg API.
 * Falls back to original image if API key missing or credits exhausted.
 */

const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    console.warn('[bgremoval] No REMOVE_BG_API_KEY — skipping background removal');
    return imageBuffer;
  }

  try {
    const form = new FormData();
    form.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'dish.jpg');
    form.append('size', 'auto');
    form.append('format', 'png');

    const res = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[bgremoval] remove.bg error ${res.status}: ${text}`);
      return imageBuffer; // graceful fallback
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn('[bgremoval] remove.bg call failed:', err);
    return imageBuffer;
  }
}
