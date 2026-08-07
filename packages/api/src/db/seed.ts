import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from './connection.js';
import { Restaurant, Table, Menu, Category, Dish } from './models/index.js';

// Procedural Three.js model shown while real AI model is being generated
const PROCEDURAL_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

async function main() {
  console.log('Seeding Spice Garden demo restaurant (Indian cuisine)...');

  await connectDB();

  const existing = await Restaurant.findOne({ slug: 'spice-garden' }).lean();
  if (existing) {
    const menus = await Menu.find({ restaurantId: existing._id }).select('_id').lean();
    const menuIds = menus.map((m) => m._id);
    const categories = await Category.find({ menuId: { $in: menuIds } }).select('_id').lean();
    const categoryIds = categories.map((c) => c._id);

    await Promise.all([
      Dish.deleteMany({ categoryId: { $in: categoryIds } }),
      Category.deleteMany({ menuId: { $in: menuIds } }),
      Menu.deleteMany({ restaurantId: existing._id }),
      Table.deleteMany({ restaurantId: existing._id }),
      Restaurant.deleteOne({ _id: existing._id }),
    ]);
  }

  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  const restaurant = await Restaurant.create({ name: 'Spice Garden', slug: 'spice-garden', plan: 'free' });

  await Table.insertMany(
    [1, 2, 3, 4, 5].map((n) => ({
      restaurantId: restaurant._id,
      tableNumber: n,
      qrCode: `spice-garden-table-${n}`,
      qrUrl: `${baseUrl}/ar/spice-garden?table=${n}`,
    })),
  );

  const menu = await Menu.create({ restaurantId: restaurant._id, name: 'Main Menu', isActive: true });

  const categoryDefs: Array<{
    name: string;
    sortOrder: number;
    dishes: Array<{
      name: string;
      description: string;
      price: number;
      isVeg: boolean;
      spiceLevel: number;
      allergens: string[];
    }>;
  }> = [
    {
      name: 'Starters',
      sortOrder: 1,
      dishes: [
        {
          name: 'Paneer Tikka',
          description: 'Cottage cheese cubes marinated in spiced yoghurt, charred in tandoor. Served with mint chutney.',
          price: 349,
          isVeg: true,
          spiceLevel: 2,
          allergens: ['dairy'],
        },
        {
          name: 'Chicken Seekh Kebab',
          description: 'Minced chicken with herbs and spices, skewered and grilled over charcoal.',
          price: 399,
          isVeg: false,
          spiceLevel: 2,
          allergens: [],
        },
        {
          name: 'Samosa (2 pcs)',
          description: 'Crispy pastry filled with spiced potato and green peas. With tamarind chutney.',
          price: 149,
          isVeg: true,
          spiceLevel: 1,
          allergens: ['gluten'],
        },
      ],
    },
    {
      name: 'Main Course',
      sortOrder: 2,
      dishes: [
        {
          name: 'Butter Chicken',
          description: 'Tender chicken in a rich, creamy tomato-butter gravy. A timeless North Indian classic.',
          price: 449,
          isVeg: false,
          spiceLevel: 1,
          allergens: ['dairy'],
        },
        {
          name: 'Dal Makhani',
          description: 'Black lentils slow-cooked overnight with butter and cream. Smoky, rich and velvety.',
          price: 349,
          isVeg: true,
          spiceLevel: 1,
          allergens: ['dairy'],
        },
        {
          name: 'Palak Paneer',
          description: 'Fresh cottage cheese in smooth spinach-spice gravy. Mildly spiced.',
          price: 379,
          isVeg: true,
          spiceLevel: 1,
          allergens: ['dairy'],
        },
        {
          name: 'Lamb Rogan Josh',
          description: 'Slow-braised lamb in Kashmiri spices — aromatic, deep red, intensely flavoured.',
          price: 529,
          isVeg: false,
          spiceLevel: 3,
          allergens: [],
        },
        {
          name: 'Chana Masala',
          description: 'Chickpeas cooked in tangy tomato-onion masala with fresh coriander.',
          price: 299,
          isVeg: true,
          spiceLevel: 2,
          allergens: [],
        },
      ],
    },
    {
      name: 'Biryani',
      sortOrder: 3,
      dishes: [
        {
          name: 'Chicken Dum Biryani',
          description: 'Aged basmati layered with spiced chicken, dum-cooked in a sealed pot. Served with raita.',
          price: 479,
          isVeg: false,
          spiceLevel: 2,
          allergens: ['dairy'],
        },
        {
          name: 'Veg Dum Biryani',
          description: 'Seasonal vegetables and basmati rice dum-cooked with whole spices and saffron.',
          price: 379,
          isVeg: true,
          spiceLevel: 2,
          allergens: ['dairy'],
        },
      ],
    },
    {
      name: 'Breads',
      sortOrder: 4,
      dishes: [
        {
          name: 'Butter Naan',
          description: 'Soft leavened flatbread baked in tandoor, brushed with butter.',
          price: 69,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['gluten', 'dairy'],
        },
        {
          name: 'Garlic Naan',
          description: 'Tandoor-baked naan topped with roasted garlic and fresh coriander.',
          price: 89,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['gluten', 'dairy'],
        },
      ],
    },
    {
      name: 'Desserts',
      sortOrder: 5,
      dishes: [
        {
          name: 'Gulab Jamun',
          description: 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup. Served warm.',
          price: 149,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['dairy', 'gluten'],
        },
        {
          name: 'Kulfi Falooda',
          description: 'Dense Indian ice cream with rose syrup, vermicelli and basil seeds.',
          price: 179,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['dairy', 'gluten'],
        },
      ],
    },
    {
      name: 'Drinks',
      sortOrder: 6,
      dishes: [
        {
          name: 'Mango Lassi',
          description: 'Thick yoghurt blended with Alphonso mango pulp. Chilled.',
          price: 129,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['dairy'],
        },
        {
          name: 'Masala Chai',
          description: 'Spiced tea brewed with ginger, cardamom, cinnamon and milk.',
          price: 79,
          isVeg: true,
          spiceLevel: 0,
          allergens: ['dairy'],
        },
      ],
    },
  ];

  let dishCount = 0;
  for (const cat of categoryDefs) {
    const category = await Category.create({ menuId: menu._id, name: cat.name, sortOrder: cat.sortOrder });
    await Dish.insertMany(
      cat.dishes.map((d) => ({
        categoryId: category._id,
        name: d.name,
        description: d.description,
        price: d.price,
        isVeg: d.isVeg,
        spiceLevel: d.spiceLevel,
        allergens: d.allergens,
        modelStatus: 'pending',
        modelSource: 'procedural',
        modelUrl: PROCEDURAL_MODEL,
      })),
    );
    dishCount += cat.dishes.length;
  }

  console.log(`✓ Seeded Spice Garden — ${dishCount} dishes across ${categoryDefs.length} categories`);
  console.log(`Demo AR URL: ${baseUrl}/ar/spice-garden?table=1`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectDB());
