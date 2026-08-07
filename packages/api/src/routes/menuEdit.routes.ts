import { Router, Response } from 'express';
import multer from 'multer';
import { Restaurant, RestaurantOwner, Menu, Category, Dish } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { saveFile } from '../services/storage.service.js';
import { toId } from '../db/serialize.js';
import type { CreateCategoryInput, UpdateCategoryInput, CreateDishInput, UpdateDishInput } from '@menuar/types';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

/** Looks up the caller's restaurant, or writes a 404 response and returns null. */
async function requireOwnerRestaurant(userId: string, res: Response) {
  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  const restaurant = await Restaurant.findById(owner.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  return { owner, restaurant };
}

/** Verifies a category belongs to the caller's own menu, or writes a 404 and returns null. */
async function requireOwnedCategory(categoryId: string, restaurantId: string, res: Response) {
  const category = await Category.findById(categoryId);
  if (!category) {
    res.status(404).json({ error: 'Category not found', code: 'CATEGORY_NOT_FOUND' });
    return null;
  }
  const menu = await Menu.findById(category.menuId).lean();
  if (!menu || menu.restaurantId !== restaurantId) {
    res.status(404).json({ error: 'Category not found', code: 'CATEGORY_NOT_FOUND' });
    return null;
  }
  return category;
}

/** GET /api/v1/menu-edit — the owner's full editable text menu (Category/Dish only, not AR slots) */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const menu = await Menu.findOne({ restaurantId: ctx.restaurant._id, isActive: true }).lean();
    if (!menu) {
      res.json({ menuId: null, categories: [] });
      return;
    }

    const categoryDocs = await Category.find({ menuId: menu._id }).sort({ sortOrder: 1 }).lean();
    const categoryIds = categoryDocs.map((c) => c._id);
    const dishDocs = await Dish.find({ categoryId: { $in: categoryIds } }).sort({ name: 1 }).lean();

    const dishesByCategory: Record<string, ReturnType<typeof toId>[]> = {};
    for (const d of dishDocs) {
      (dishesByCategory[d.categoryId] ??= []).push(toId(d));
    }

    const categories = categoryDocs.map((c) => ({
      ...toId(c),
      dishes: dishesByCategory[c._id] || [],
    }));

    res.json({ menuId: menu._id, categories });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to load menu', code: 'MENU_EDIT_FETCH_ERROR', details: String(err) });
  }
});

/** POST /api/v1/menu-edit/categories — create a new, initially empty category */
router.post('/categories', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const { name } = req.body as CreateCategoryInput;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Category name is required', code: 'INVALID_NAME' });
      return;
    }

    let menu = await Menu.findOne({ restaurantId: ctx.restaurant._id, isActive: true });
    if (!menu) {
      menu = await Menu.create({ restaurantId: ctx.restaurant._id, name: 'Menu', isActive: true });
    }

    const existingCategories = await Category.find({ menuId: menu._id }).lean();
    const nextSortOrder =
      existingCategories.length > 0 ? Math.max(...existingCategories.map((c) => c.sortOrder)) + 1 : 0;

    const category = await Category.create({ menuId: menu._id, name: name.trim(), sortOrder: nextSortOrder });
    res.json({ ...toId(category.toObject()), dishes: [] });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to create category', code: 'CATEGORY_CREATE_ERROR', details: String(err) });
  }
});

/** PATCH /api/v1/menu-edit/categories/:categoryId — rename a category */
router.patch('/categories/:categoryId', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const category = await requireOwnedCategory(req.params.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    const { name } = req.body as UpdateCategoryInput;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Category name is required', code: 'INVALID_NAME' });
      return;
    }

    category.name = name.trim();
    await category.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to rename category', code: 'CATEGORY_UPDATE_ERROR', details: String(err) });
  }
});

/** DELETE /api/v1/menu-edit/categories/:categoryId — delete a category and its dishes */
router.delete('/categories/:categoryId', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const category = await requireOwnedCategory(req.params.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    await Dish.deleteMany({ categoryId: category._id });
    await Category.deleteOne({ _id: category._id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to delete category', code: 'CATEGORY_DELETE_ERROR', details: String(err) });
  }
});

/** POST /api/v1/menu-edit/categories/:categoryId/dishes — add a dish manually */
router.post('/categories/:categoryId/dishes', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const category = await requireOwnedCategory(req.params.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    const { name, description, price, ingredients, isVeg } = req.body as CreateDishInput;
    if (!name?.trim() || typeof price !== 'number') {
      res.status(400).json({ error: 'Dish name and price are required', code: 'INVALID_DISH' });
      return;
    }

    const dish = await Dish.create({
      categoryId: category._id,
      name: name.trim(),
      description: description ?? '',
      price,
      ingredients: ingredients ?? [],
      isVeg: Boolean(isVeg),
    });

    res.json(toId(dish.toObject()));
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to add dish', code: 'DISH_CREATE_ERROR', details: String(err) });
  }
});

/** PATCH /api/v1/menu-edit/dishes/:dishId — edit a dish's fields */
router.patch('/dishes/:dishId', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const dish = await Dish.findById(req.params.dishId);
    if (!dish) {
      res.status(404).json({ error: 'Dish not found', code: 'DISH_NOT_FOUND' });
      return;
    }
    const category = await requireOwnedCategory(dish.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    const { name, description, price, ingredients, isVeg } = req.body as UpdateDishInput;
    if (name !== undefined) dish.name = name.trim();
    if (description !== undefined) dish.description = description;
    if (price !== undefined) dish.price = price;
    if (ingredients !== undefined) dish.ingredients = ingredients;
    if (isVeg !== undefined) dish.isVeg = isVeg;
    await dish.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to update dish', code: 'DISH_UPDATE_ERROR', details: String(err) });
  }
});

/** DELETE /api/v1/menu-edit/dishes/:dishId */
router.delete('/dishes/:dishId', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const dish = await Dish.findById(req.params.dishId);
    if (!dish) {
      res.status(404).json({ error: 'Dish not found', code: 'DISH_NOT_FOUND' });
      return;
    }
    const category = await requireOwnedCategory(dish.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    await Dish.deleteOne({ _id: dish._id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to delete dish', code: 'DISH_DELETE_ERROR', details: String(err) });
  }
});

/** POST /api/v1/menu-edit/dishes/:dishId/photo — upload a dish photo */
router.post('/dishes/:dishId/photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const dish = await Dish.findById(req.params.dishId);
    if (!dish) {
      res.status(404).json({ error: 'Dish not found', code: 'DISH_NOT_FOUND' });
      return;
    }
    const category = await requireOwnedCategory(dish.categoryId, ctx.restaurant._id, res);
    if (!category) return;

    if (!req.file) {
      res.status(400).json({ error: 'No photo uploaded', code: 'NO_FILE' });
      return;
    }

    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const { url } = await saveFile(`dish-photos/${ctx.restaurant._id}/${dish._id}`, filename, req.file.buffer);

    dish.thumbnailUrl = url;
    await dish.save();

    res.json({ thumbnailUrl: url });
  } catch (err) {
    console.error('[MenuEdit Error]', err);
    res.status(500).json({ error: 'Failed to upload dish photo', code: 'PHOTO_UPLOAD_ERROR', details: String(err) });
  }
});

export default router;
