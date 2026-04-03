/**
 * Storage abstraction — local disk now, swap to R2 by setting USE_R2=true.
 * All functions return a public-accessible URL to the stored file.
 */
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure subdirectories exist
['originals', 'cleaned', 'models'].forEach((sub) => {
  fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
});

const SERVER_URL = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

export async function saveFile(
  subdir: 'originals' | 'cleaned' | 'models',
  filename: string,
  buffer: Buffer
): Promise<{ key: string; url: string }> {
  if (process.env.USE_R2 === 'true') {
    // R2 path — swap in later when credentials are ready
    const { uploadToR2 } = await import('./r2.service.js');
    const key = `${subdir}/${filename}`;
    const contentType = filename.endsWith('.glb')
      ? 'model/gltf-binary'
      : filename.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
    const url = await uploadToR2(key, buffer, contentType);
    return { key, url };
  }

  // Local disk
  const filePath = path.join(UPLOADS_DIR, subdir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    key: `${subdir}/${filename}`,
    url: `${SERVER_URL}/uploads/${subdir}/${filename}`,
  };
}

export function uploadsDir(): string {
  return UPLOADS_DIR;
}
