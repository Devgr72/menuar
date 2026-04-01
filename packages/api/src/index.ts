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

// Routes — only mount if DB is available
async function mountRoutes() {
  try {
    const { default: menuRoutes } = await import('./routes/menu.routes');
    app.use('/api/v1/menu', menuRoutes);
    console.log('Routes mounted: /api/v1/menu');
  } catch (err) {
    console.warn('Could not mount routes (database may not be configured):', err);
  }
}

mountRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`MenuAR API running on port ${PORT}`);
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set — database routes unavailable');
    }
  });
});
