/**
 * DEV UTILITY — regenerates a restaurant's QR code PNG to match the current
 * WEB_URL (e.g. after your LAN IP changes and you need to re-test on a phone).
 * Usage: tsx packages/api/scripts/regenerate-qr-dev.ts <restaurant-slug>
 */
import dotenv from 'dotenv';
dotenv.config();

// Dynamic imports — must run after dotenv.config() since storage.service.ts
// reads R2 env vars at module load time (static imports get hoisted above
// this file's own statements, same as the reason index.ts uses await import()).
async function main() {
  const QRCode = (await import('qrcode')).default;
  const { connectDB, disconnectDB } = await import('../src/db/connection.js');
  const { Restaurant } = await import('../src/db/models/index.js');
  const { saveFile } = await import('../src/services/storage.service.js');

  const slug = process.argv[2];
  const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

  await connectDB();

  const restaurant = slug
    ? await Restaurant.findOne({ slug }).lean()
    : await Restaurant.findOne().sort({ createdAt: -1 }).lean();

  if (!restaurant) {
    console.error(slug ? `No restaurant found with slug "${slug}"` : 'No restaurants found in DB');
    process.exit(1);
  }

  const arUrl = `${WEB_URL}/ar/${restaurant.slug}`;
  const qrBuffer = await QRCode.toBuffer(arUrl, {
    errorCorrectionLevel: 'H',
    width: 512,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  const { url } = await saveFile(`qr/${restaurant._id}`, 'main.png', qrBuffer);
  await Restaurant.updateOne({ _id: restaurant._id }, { qrUrl: url });

  console.log(`Restaurant: ${restaurant.name} (${restaurant.slug})`);
  console.log(`AR URL encoded in QR: ${arUrl}`);
  console.log(`QR image: ${url}`);

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
