import { PrismaClient, ModelStatus, ModelSource } from '@prisma/client';

const prisma = new PrismaClient();

// Procedural Three.js model shown while real AI model is being generated
const PROCEDURAL_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

async function main() {
  console.log('Seeding Spice Garden demo restaurant (Indian cuisine)...');

  await prisma.restaurant.deleteMany({ where: { slug: 'spice-garden' } });

  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  await prisma.restaurant.create({
    data: {
      name: 'Spice Garden',
      slug: 'spice-garden',
      plan: 'free',

      tables: {
        create: [1, 2, 3, 4, 5].map((n) => ({
          tableNumber: n,
          qrCode: `spice-garden-table-${n}`,
          qrUrl: `${baseUrl}/ar/spice-garden?table=${n}`,
        })),
      },

      menus: {
        create: {
          name: 'Main Menu',
          isActive: true,
          categories: {
            create: [

              // ── Starters ────────────────────────────────────────────────
              {
                name: 'Starters',
                sortOrder: 1,
                dishes: {
                  create: [
                    {
                      name: 'Paneer Tikka',
                      description: 'Cottage cheese cubes marinated in spiced yoghurt, charred in tandoor. Served with mint chutney.',
                      price: 349,
                      isVeg: true,
                      spiceLevel: 2,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Chicken Seekh Kebab',
                      description: 'Minced chicken with herbs and spices, skewered and grilled over charcoal.',
                      price: 399,
                      isVeg: false,
                      spiceLevel: 2,
                      allergens: [],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Samosa (2 pcs)',
                      description: 'Crispy pastry filled with spiced potato and green peas. With tamarind chutney.',
                      price: 149,
                      isVeg: true,
                      spiceLevel: 1,
                      allergens: ['gluten'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

              // ── Main Course ─────────────────────────────────────────────
              {
                name: 'Main Course',
                sortOrder: 2,
                dishes: {
                  create: [
                    {
                      name: 'Butter Chicken',
                      description: 'Tender chicken in a rich, creamy tomato-butter gravy. A timeless North Indian classic.',
                      price: 449,
                      isVeg: false,
                      spiceLevel: 1,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Dal Makhani',
                      description: 'Black lentils slow-cooked overnight with butter and cream. Smoky, rich and velvety.',
                      price: 349,
                      isVeg: true,
                      spiceLevel: 1,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Palak Paneer',
                      description: 'Fresh cottage cheese in smooth spinach-spice gravy. Mildly spiced.',
                      price: 379,
                      isVeg: true,
                      spiceLevel: 1,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Lamb Rogan Josh',
                      description: 'Slow-braised lamb in Kashmiri spices — aromatic, deep red, intensely flavoured.',
                      price: 529,
                      isVeg: false,
                      spiceLevel: 3,
                      allergens: [],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Chana Masala',
                      description: 'Chickpeas cooked in tangy tomato-onion masala with fresh coriander.',
                      price: 299,
                      isVeg: true,
                      spiceLevel: 2,
                      allergens: [],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

              // ── Biryani ─────────────────────────────────────────────────
              {
                name: 'Biryani',
                sortOrder: 3,
                dishes: {
                  create: [
                    {
                      name: 'Chicken Dum Biryani',
                      description: 'Aged basmati layered with spiced chicken, dum-cooked in a sealed pot. Served with raita.',
                      price: 479,
                      isVeg: false,
                      spiceLevel: 2,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Veg Dum Biryani',
                      description: 'Seasonal vegetables and basmati rice dum-cooked with whole spices and saffron.',
                      price: 379,
                      isVeg: true,
                      spiceLevel: 2,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

              // ── Breads ──────────────────────────────────────────────────
              {
                name: 'Breads',
                sortOrder: 4,
                dishes: {
                  create: [
                    {
                      name: 'Butter Naan',
                      description: 'Soft leavened flatbread baked in tandoor, brushed with butter.',
                      price: 69,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Garlic Naan',
                      description: 'Tandoor-baked naan topped with roasted garlic and fresh coriander.',
                      price: 89,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

              // ── Desserts ────────────────────────────────────────────────
              {
                name: 'Desserts',
                sortOrder: 5,
                dishes: {
                  create: [
                    {
                      name: 'Gulab Jamun',
                      description: 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup. Served warm.',
                      price: 149,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['dairy', 'gluten'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Kulfi Falooda',
                      description: 'Dense Indian ice cream with rose syrup, vermicelli and basil seeds.',
                      price: 179,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['dairy', 'gluten'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

              // ── Drinks ──────────────────────────────────────────────────
              {
                name: 'Drinks',
                sortOrder: 6,
                dishes: {
                  create: [
                    {
                      name: 'Mango Lassi',
                      description: 'Thick yoghurt blended with Alphonso mango pulp. Chilled.',
                      price: 129,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                    {
                      name: 'Masala Chai',
                      description: 'Spiced tea brewed with ginger, cardamom, cinnamon and milk.',
                      price: 79,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['dairy'],
                      modelStatus: ModelStatus.pending,
                      modelSource: ModelSource.procedural,
                      modelUrl: PROCEDURAL_MODEL,
                    },
                  ],
                },
              },

            ],
          },
        },
      },
    },
  });

  const count = await prisma.dish.count();
  console.log(`✓ Seeded Spice Garden — ${count} dishes across 6 categories`);
  console.log(`Demo AR URL: ${baseUrl}/ar/spice-garden?table=1`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
