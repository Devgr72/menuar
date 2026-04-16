import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { auth } from './lib/auth';
import { toNodeHandler } from 'better-auth/node';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow both http and https localhost in dev; use WEB_URL in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.WEB_URL].filter(Boolean) as string[]
  : ['http://localhost:3000', 'https://localhost:3000', 'http://localhost:3002', process.env.WEB_URL].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, same-origin via proxy)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// Better Auth handles all /api/auth/* routes (sign-in, sign-up, OAuth, sign-out)
// Must be mounted BEFORE express.json() as it reads raw body internally
app.all('/api/auth/*', toNodeHandler(auth));

// Raw body for Razorpay webhook signature verification — mount BEFORE express.json()
app.use(
  '/api/v1/webhook/razorpay',
  express.raw({ type: 'application/json' }),
);

app.use(express.json());

// Serve uploaded files (photos + models) — local storage fallback while R2 not configured
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    const { default: authRoutes } = await import('./routes/auth.routes');
    const { default: subscriptionRoutes } = await import('./routes/subscription.routes');
    const { default: restaurantRoutes } = await import('./routes/restaurant.routes');
    const { default: adminRoutes } = await import('./routes/admin.routes');
    const { default: webhookRoutes } = await import('./routes/webhook.routes');
    const { startPoller } = await import('./services/pipeline.service');

    app.use('/api/v1/menu', menuRoutes);
    app.use('/api/v1/dish', dishRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/subscription', subscriptionRoutes);
    app.use('/api/v1/restaurant', restaurantRoutes);
    app.use('/api/v1/admin', adminRoutes);
    app.use('/api/v1/webhook', webhookRoutes);

    // Dev-only manual activation route (never mounted in production)
    if (process.env.NODE_ENV !== 'production') {
      const { default: devRoutes } = await import('./routes/dev.routes');
      app.use('/api/v1/dev', devRoutes);
      console.log('  POST /api/v1/dev/activate  [DEV ONLY]');
    }

    startPoller();

    console.log('Routes mounted:');
    console.log('  GET  /api/v1/menu/:restaurantSlug');
    console.log('  POST /api/v1/menu/:restaurantSlug/scan');
    console.log('  GET  /api/v1/dish/:dishId');
    console.log('  POST /api/v1/auth/register');
    console.log('  GET  /api/v1/auth/me');
    console.log('  POST /api/v1/subscription/create');
    console.log('  GET  /api/v1/subscription/status');
    console.log('  GET  /api/v1/restaurant/dashboard');
    console.log('  POST /api/v1/restaurant/slots/:n/photos');
    console.log('  GET  /api/v1/admin/stats');
    console.log('  GET  /api/v1/admin/restaurants');
    console.log('  POST /api/v1/admin/slots/:slotId/glb');
    console.log('  POST /api/v1/webhook/razorpay');
  } catch (err) {
    console.error('Failed to mount routes:', err);
  }
}

mountRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`MenuAR API running on port ${PORT}`);
  });
});
