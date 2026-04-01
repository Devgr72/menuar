import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder GLB — replace with real dish models from Meshy.ai in Sprint 4
const PLACEHOLDER_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

async function main() {
  console.log('Seeding Pizza Palace demo restaurant...');

  // Clean existing demo data
  await prisma.restaurant.deleteMany({ where: { slug: 'pizza-palace' } });

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Pizza Palace',
      slug: 'pizza-palace',
      plan: 'free',
      tables: {
        create: [
          { tableNumber: 1, qrCode: 'pp-table-1', qrUrl: 'http://localhost:3000/ar/pizza-palace?table=1' },
          { tableNumber: 2, qrCode: 'pp-table-2', qrUrl: 'http://localhost:3000/ar/pizza-palace?table=2' },
          { tableNumber: 3, qrCode: 'pp-table-3', qrUrl: 'http://localhost:3000/ar/pizza-palace?table=3' },
        ],
      },
      menus: {
        create: {
          name: 'Main Menu',
          isActive: true,
          categories: {
            create: [
              {
                name: 'Pizzas',
                sortOrder: 1,
                dishes: {
                  create: [
                    {
                      name: 'Margherita',
                      description: 'Classic tomato base, fresh mozzarella, basil, extra virgin olive oil.',
                      price: 12.99,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                    {
                      name: 'Pepperoni Feast',
                      description: 'Generous layers of pepperoni on rich tomato sauce and melted mozzarella.',
                      price: 15.99,
                      isVeg: false,
                      spiceLevel: 1,
                      allergens: ['gluten', 'dairy'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                    {
                      name: 'BBQ Chicken',
                      description: 'Smoky BBQ sauce, grilled chicken, caramelised onions, cheddar.',
                      price: 16.99,
                      isVeg: false,
                      spiceLevel: 1,
                      allergens: ['gluten', 'dairy'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                    {
                      name: 'Truffle Fungi',
                      description: 'Wild mushrooms, truffle oil, mozzarella, rosemary, sea salt.',
                      price: 18.99,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                  ],
                },
              },
              {
                name: 'Pasta',
                sortOrder: 2,
                dishes: {
                  create: [
                    {
                      name: 'Pasta Carbonara',
                      description: 'Spaghetti, crispy pancetta, egg yolk, parmesan, black pepper.',
                      price: 13.99,
                      isVeg: false,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy', 'egg'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                    {
                      name: 'Penne Arrabbiata',
                      description: 'Penne in spicy tomato and garlic sauce, fresh basil.',
                      price: 11.99,
                      isVeg: true,
                      spiceLevel: 2,
                      allergens: ['gluten'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                  ],
                },
              },
              {
                name: 'Desserts',
                sortOrder: 3,
                dishes: {
                  create: [
                    {
                      name: 'Tiramisu',
                      description: 'Espresso-soaked ladyfingers, mascarpone cream, dusted with cocoa.',
                      price: 7.99,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['gluten', 'dairy', 'egg'],
                      modelUrl: PLACEHOLDER_MODEL,
                    },
                    {
                      name: 'Panna Cotta',
                      description: 'Silky vanilla panna cotta with mixed berry coulis.',
                      price: 6.99,
                      isVeg: true,
                      spiceLevel: 0,
                      allergens: ['dairy'],
                      modelUrl: PLACEHOLDER_MODEL,
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

  console.log(`Created restaurant: ${restaurant.name} (slug: ${restaurant.slug})`);
  console.log('Demo URL: http://localhost:3000/ar/pizza-palace?table=1');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
