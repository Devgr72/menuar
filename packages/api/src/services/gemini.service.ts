import { GoogleGenAI, Type, FileState, createUserContent, createPartFromUri } from '@google/genai';
import type { Schema } from '@google/genai';
import { z } from 'zod';
import type { MenuScanDraft } from '@menuar/types';

let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY must be set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export class GeminiExtractionError extends Error {}

const MenuScanDishSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  price: z.number().nonnegative(),
  ingredients: z.array(z.string()).default([]),
  isVeg: z.boolean().default(false),
});

const MenuScanCategorySchema = z.object({
  name: z.string().min(1),
  dishes: z.array(MenuScanDishSchema),
});

const MenuScanDraftSchema = z.object({
  categories: z.array(MenuScanCategorySchema),
});

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      description:
        'One entry per menu section header visible in the photos (e.g. "Starters", "Main Course"). If no section headers are visible, use a single category named "Menu".',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dishes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: {
                  type: Type.STRING,
                  description: 'Descriptive text for the dish. If printed on the menu, extract it. If NOT printed, use your knowledge (tailored to Indian cuisine) to generate a short, appetizing description (max 1 short sentence).',
                },
                price: {
                  type: Type.NUMBER,
                  description: 'Numeric price with no currency symbol, exactly as printed.',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Individual ingredients. If listed on the menu, extract them. If NOT listed, generate 3-4 key ingredients based on your knowledge of the dish (tailored to Indian cuisine).',
                },
                isVeg: {
                  type: Type.BOOLEAN,
                  description:
                    'True if marked vegetarian (green dot/icon or the word "veg"), false if marked non-vegetarian (red dot/icon, "chicken", "mutton", "fish", "egg", etc). Best guess if unmarked.',
                },
              },
              required: ['name', 'price', 'isVeg'],
            },
          },
        },
        required: ['name', 'dishes'],
      },
    },
  },
  required: ['categories'],
};

const EXTRACTION_PROMPT = `You are reading photos of a restaurant's physical menu. Extract every dish into structured data.

Rules:
- Group dishes under the section headers printed on the menu (e.g. "Starters", "Main Course", "Desserts", "Beverages"). If a photo has no visible section header, group its dishes under a category named "Menu".
- The same photo set may show the same dish twice (e.g. an overlapping shot) — do not duplicate it.
- If a price has multiple sizes/variants (e.g. "Half 120 / Full 220"), use the higher price and note the sizes in the description.
- Skip anything that is not a dish (restaurant name, tagline, page numbers, decorative text).
- IMPORTANT: If a dish lacks a printed description or ingredients, YOU MUST GENERATE them using your knowledge of Indian cuisine. Keep descriptions very short and punchy (1 sentence max).
- Output must match the provided response schema exactly.`;

const FILE_ACTIVE_POLL_INTERVAL_MS = 500;
const FILE_ACTIVE_POLL_TIMEOUT_MS = 15_000;

async function waitForFileActive(ai: GoogleGenAI, fileName: string): Promise<void> {
  const deadline = Date.now() + FILE_ACTIVE_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let file;
    try {
      file = await ai.files.get({ name: fileName });
    } catch (err) {
      throw new GeminiExtractionError(
        `Gemini file status check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (file.state === FileState.ACTIVE) return;
    if (file.state === FileState.FAILED) {
      throw new GeminiExtractionError(`Gemini failed to process an uploaded photo: ${fileName}`);
    }
    await new Promise((r) => setTimeout(r, FILE_ACTIVE_POLL_INTERVAL_MS));
  }
  throw new GeminiExtractionError(`Timed out waiting for Gemini to process an uploaded photo: ${fileName}`);
}

/** Extracts structured dish data from up to 20 menu photos using Gemini (gemini-flash-latest). */
export async function extractMenuFromPhotos(
  photos: { buffer: Buffer; mimeType: string }[],
): Promise<MenuScanDraft> {
  if (photos.length === 0) {
    throw new GeminiExtractionError('No photos provided');
  }

  const ai = getGeminiClient();

  let uploaded;
  try {
    uploaded = await Promise.all(
      photos.map((photo, i) =>
        ai.files.upload({
          file: new Blob([new Uint8Array(photo.buffer)], { type: photo.mimeType }),
          config: { mimeType: photo.mimeType, displayName: `menu-page-${i + 1}` },
        }),
      ),
    );
  } catch (err) {
    throw new GeminiExtractionError(
      `Gemini file upload failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  for (const file of uploaded) {
    if (!file.name) throw new GeminiExtractionError('Gemini did not return a file name after upload');
    await waitForFileActive(ai, file.name);
  }

  const fileParts = uploaded.map((file) => {
    if (!file.uri || !file.mimeType) {
      throw new GeminiExtractionError('Gemini file upload is missing its uri/mimeType');
    }
    return createPartFromUri(file.uri, file.mimeType);
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [createUserContent([EXTRACTION_PROMPT, ...fileParts])],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  } catch (err) {
    throw new GeminiExtractionError(
      `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const text = response.text;
  if (!text) {
    throw new GeminiExtractionError('Gemini returned an empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiExtractionError('Gemini returned malformed JSON');
  }

  const result = MenuScanDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiExtractionError(`Gemini response did not match the expected shape: ${result.error.message}`);
  }

  const nonEmptyCategories = result.data.categories.filter((c) => c.dishes.length > 0);
  if (nonEmptyCategories.length === 0) {
    throw new GeminiExtractionError('No dishes were detected in the uploaded photos');
  }

  // `nonEmptyCategories` is guaranteed by the successful `safeParse` above to match
  // `MenuScanCategory[]` exactly. The cast is needed because this project's tsconfig has
  // `strict: false` (so `strictNullChecks` is off), which makes zod's inferred object types
  // structurally all-optional at compile time even though zod enforces required fields at
  // runtime — a known interaction, not a real type mismatch.
  return { categories: nonEmptyCategories } as MenuScanDraft;
}
