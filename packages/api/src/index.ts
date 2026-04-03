import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000' }));
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'MenuAR API' });
});

async function mountRoutes() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — skipping DB routes');
    return;
  }

  try {
    const { default: menuRoutes } = await import('./routes/menu.routes');
    const { default: dishRoutes } = await import('./routes/dish.routes');

    app.use('/api/v1/menu', menuRoutes);
    app.use('/api/v1/dish', dishRoutes);

    console.log('Routes mounted:');
    console.log('  GET /api/v1/menu/:restaurantSlug');
    console.log('  GET /api/v1/dish/:dishId');
    console.log('  GET /api/v1/dish/:dishId/model-status');
  } catch (err) {
    console.error('Failed to mount routes:', err);
  }
}

mountRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`MenuAR API running on port ${PORT}`);
  });
});
