/**
 * Storage abstraction — local disk now, swap to R2 by setting USE_R2=true.
 * All functions return a public-accessible URL to the stored file.
 */
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure base directories exist
['originals', 'cleaned', 'models', 'photos', 'qr'].forEach((sub) => {
  fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
});

const SERVER_URL = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

/**
 * Save a file to local disk or R2.
 * @param subdir - arbitrary path like "photos/restaurantId/slot-1" or "qr/restaurantId"
 */
export async function saveFile(
  subdir: string,
  filename: string,
  buffer: Buffer,
): Promise<{ key: string; url: string }> {
  const key = `${subdir}/${filename}`;

  if (process.env.USE_R2 === 'true') {
    const { uploadToR2 } = await import('./r2.service.js');
    const contentType = getContentType(filename);
    const url = await uploadToR2(key, buffer, contentType);
    return { key, url };
  }

  // Local disk
  const dir = path.join(UPLOADS_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    key,
    url: `${SERVER_URL}/uploads/${key}`,
  };
}

/**
 * Delete a file from local disk or R2.
 * Silently ignores missing files.
 */
export async function deleteFile(key: string): Promise<void> {
  if (process.env.USE_R2 === 'true') {
    const { deleteFromR2 } = await import('./r2.service.js');
    await deleteFromR2(key);
    return;
  }

  const filePath = path.join(UPLOADS_DIR, key);
  try {
    fs.unlinkSync(filePath);
  } catch {
    // File may not exist — ignore
  }
}

export function uploadsDir(): string {
  return UPLOADS_DIR;
}

function getContentType(filename: string): string {
  if (filename.endsWith('.glb')) return 'model/gltf-binary';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}
