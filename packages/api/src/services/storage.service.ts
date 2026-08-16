/**
 * Storage abstraction — Cloudflare R2 only. All functions return a public CDN URL.
 */
import { uploadToR2, deleteFromR2, isR2Configured } from './r2.service.js';

/**
 * Save a file to R2.
 * @param subdir - arbitrary path like "photos/restaurantId/slot-1" or "qr/restaurantId"
 */
export async function saveFile(
  subdir: string,
  filename: string,
  buffer: Buffer,
): Promise<{ key: string; url: string }> {
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured — set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL',
    );
  }

  const key = `${subdir}/${filename}`;
  const contentType = getContentType(filename);
  const url = await uploadToR2(key, buffer, contentType);
  return { key, url };
}

/** Delete a file from R2. Silently ignores missing files. */
export async function deleteFile(key: string): Promise<void> {
  await deleteFromR2(key).catch(() => {});
}

function getContentType(filename: string): string {
  if (filename.endsWith('.glb')) return 'model/gltf-binary';
  if (filename.endsWith('.usdz')) return 'model/vnd.usdz+zip';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}
