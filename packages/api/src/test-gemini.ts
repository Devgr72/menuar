import dotenv from 'dotenv';
import path from 'path';
import { extractMenuFromPhotos } from './services/gemini.service.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  try {
    const dummyImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const draft = await extractMenuFromPhotos([{ buffer: dummyImage, mimeType: 'image/png' }]);
    console.log('Success:', draft);
  } catch (err) {
    console.error('Error in extractMenuFromPhotos:', err);
  }
}

run();
