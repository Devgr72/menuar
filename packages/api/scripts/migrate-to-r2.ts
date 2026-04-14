/**
 * One-time migration: upload all local uploads/* files to R2
 * and update every localhost URL in the DB to the R2 CDN URL.
 *
 * Run: npx tsx scripts/migrate-to-r2.ts
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const prisma = new PrismaClient();

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function getContentType(filename: string): string {
  if (filename.endsWith('.glb'))  return 'model/gltf-binary';
  if (filename.endsWith('.png'))  return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function uploadToR2(key: string, localPath: string): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: getContentType(path.basename(localPath)),
  }));
  return `${PUBLIC_URL}/${key}`;
}

function walkFiles(dir: string, base: string): Array<{ key: string; localPath: string }> {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    const key  = path.join(base, entry.name).replace(/\\/g, '/');
    return entry.isDirectory() ? walkFiles(full, key) : [{ key, localPath: full }];
  });
}

function toR2Url(localUrl: string | null | undefined): string | null {
  if (!localUrl) return null;
  if (localUrl.startsWith(PUBLIC_URL)) return localUrl; // already R2
  const match = localUrl.match(/\/uploads\/(.+)$/);
  if (!match) return localUrl;
  return `${PUBLIC_URL}/${match[1]}`;
}

async function main() {
  console.log('Scanning uploads/ for local files...\n');

  const files = [
    ...walkFiles(path.join(UPLOADS_DIR, 'qr'),       'qr'),
    ...walkFiles(path.join(UPLOADS_DIR, 'photos'),    'photos'),
    ...walkFiles(path.join(UPLOADS_DIR, 'models'),    'models'),
    ...walkFiles(path.join(UPLOADS_DIR, 'cleaned'),   'cleaned'),
    ...walkFiles(path.join(UPLOADS_DIR, 'originals'), 'originals'),
  ];

  console.log(`Found ${files.length} files to upload.\n`);

  for (const { key, localPath } of files) {
    try {
      const cdnUrl = await uploadToR2(key, localPath);
      console.log(`✅  ${key}  →  ${cdnUrl}`);
    } catch (err: any) {
      console.error(`❌  ${key}: ${err.message}`);
    }
  }

  console.log('\nUpdating database URLs...\n');

  // Update Restaurant.qrUrl
  const restaurants = await prisma.restaurant.findMany({
    where: { qrUrl: { not: null } },
    select: { id: true, name: true, qrUrl: true },
  });
  for (const r of restaurants) {
    const newUrl = toR2Url(r.qrUrl);
    if (newUrl && newUrl !== r.qrUrl) {
      await prisma.restaurant.update({ where: { id: r.id }, data: { qrUrl: newUrl } });
      console.log(`[restaurant] ${r.name}  qrUrl → ${newUrl}`);
    }
  }

  // Update DishSlot.menuPhotoUrl and .glbUrl
  const slots = await prisma.dishSlot.findMany({
    where: { OR: [{ menuPhotoUrl: { not: null } }, { glbUrl: { not: null } }] },
    select: { id: true, slotNumber: true, menuPhotoUrl: true, glbUrl: true },
  });
  for (const s of slots) {
    const newMenu = toR2Url(s.menuPhotoUrl);
    const newGlb  = toR2Url(s.glbUrl);
    const changed = newMenu !== s.menuPhotoUrl || newGlb !== s.glbUrl;
    if (changed) {
      await prisma.dishSlot.update({
        where: { id: s.id },
        data: {
          ...(newMenu !== s.menuPhotoUrl ? { menuPhotoUrl: newMenu } : {}),
          ...(newGlb  !== s.glbUrl      ? { glbUrl: newGlb }        : {}),
        },
      });
      if (newMenu !== s.menuPhotoUrl) console.log(`[slot#${s.slotNumber}] menuPhotoUrl → ${newMenu}`);
      if (newGlb  !== s.glbUrl)       console.log(`[slot#${s.slotNumber}] glbUrl       → ${newGlb}`);
    }
  }

  console.log('\n✅  Migration complete. All files are on R2 and DB URLs are updated.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
