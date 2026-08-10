import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './db/connection.js';
import { Partner } from './db/models/index.js';

const app = express();
const PORT = process.env.PORT || 3001;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Allow both http and https localhost in dev; use WEB_URL in production
const allowedOrigins = [
  'https://menuar-web.vercel.app',
  'https://www.dishdekho.com',
  'https://dishdekho.com',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3002',
  process.env.WEB_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, same-origin via proxy)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
  }),
);

/** Readable per-request log: method, path, status, duration — colorized like the route-level [auth]/[subscription] logs. */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${res.statusCode}\x1b[0m ${req.method} ${req.originalUrl} - ${ms}ms`);
  });
  next();
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'MenuAR API' });
});

async function main() {
  const { isR2Configured } = await import('./services/r2.service.js');
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured — set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL',
    );
  }

  const { isEmailConfigured } = await import('./services/email.service.js');
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM');
  }

  await connectDB();
  console.log('MongoDB Atlas connected');

  // Better Auth handles all /api/auth/* routes (sign-in, sign-up, OAuth, sign-out)
  // Must be mounted BEFORE express.json() as it reads the raw body internally
  const { auth } = await import('./lib/auth.js');
  const { toNodeHandler } = await import('better-auth/node');
  app.all('/api/auth/*', toNodeHandler(auth));

  // Raw body for Razorpay webhook signature verification — mount BEFORE express.json()
  app.use('/api/v1/webhook/razorpay', express.raw({ type: 'application/json' }));

  app.use(express.json());

  const { default: menuRoutes } = await import('./routes/menu.routes.js');
  const { default: dishRoutes } = await import('./routes/dish.routes.js');
  const { default: authRoutes } = await import('./routes/auth.routes.js');
  const { default: subscriptionRoutes } = await import('./routes/subscription.routes.js');
  const { default: restaurantRoutes } = await import('./routes/restaurant.routes.js');
  const { default: adminRoutes } = await import('./routes/admin.routes.js');
  const { default: adminPartnerRoutes } = await import('./routes/adminPartner.routes.js');
  const { default: webhookRoutes } = await import('./routes/webhook.routes.js');
  const { default: inquiryRoutes } = await import('./routes/inquiry.routes.js');
  const { default: menuScanRoutes } = await import('./routes/menuScan.routes.js');
  const { default: menuEditRoutes } = await import('./routes/menuEdit.routes.js');
  const { default: partnerRoutes } = await import('./routes/partner.routes.js');
  const { default: partnerNotificationRoutes } = await import('./routes/partnerNotification.routes.js');
  const { startPoller } = await import('./services/pipeline.service.js');

  app.use('/api/v1/menu', menuRoutes);
  app.use('/api/v1/dish', dishRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/subscription', subscriptionRoutes);
  app.use('/api/v1/restaurant', restaurantRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/admin/partners', adminPartnerRoutes);
  app.use('/api/v1/webhook', webhookRoutes);
  app.use('/api/v1/inquiry', inquiryRoutes);
  app.use('/api/v1/menu-scan', menuScanRoutes);
  app.use('/api/v1/menu-edit', menuEditRoutes);
  app.use('/api/v1/partner', partnerRoutes);
  app.use('/api/v1/partner-notification', partnerNotificationRoutes);

  // Dev-only manual activation route (never mounted in production)
  if (IS_DEV) {
    const { default: devRoutes } = await import('./routes/dev.routes.js');
    app.use('/api/v1/dev', devRoutes);
    console.log('  POST /api/v1/dev/activate  [DEV ONLY]');
  }

  startPoller();

  // Error handler — must be mounted last. Prints full stack traces so failures are visible in the terminal.
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`\x1b[31m✗ ${req.method} ${req.originalUrl}\x1b[0m`, err.stack || err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

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
  console.log('  POST /api/v1/inquiry/contact');
  console.log('  POST /api/v1/inquiry/newsletter');
  console.log('  POST /api/v1/menu-scan');
  console.log('  GET  /api/v1/menu-scan/:id');
  console.log('  POST /api/v1/menu-scan/:id/publish');
  console.log('  GET  /api/v1/menu-edit');
  console.log('  POST /api/v1/menu-edit/categories');
  console.log('  PATCH /api/v1/menu-edit/categories/:id');
  console.log('  DELETE /api/v1/menu-edit/categories/:id');
  console.log('  POST /api/v1/menu-edit/categories/:id/dishes');
  console.log('  PATCH /api/v1/menu-edit/dishes/:id');
  console.log('  DELETE /api/v1/menu-edit/dishes/:id');
  console.log('  GET  /api/v1/admin/stats');
  console.log('  GET  /api/v1/admin/inquiries');
  console.log('  GET  /api/v1/admin/restaurants');
  console.log('  POST /api/v1/admin/slots/:slotId/glb');
  console.log('  POST /api/v1/webhook/razorpay');

  const server = http.createServer(app);
  
  // Setup Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      let token = null;
      if (cookies) {
        const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('partnerToken='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (decoded.role !== 'partner') {
        return next(new Error('Forbidden'));
      }

      const partner = await Partner.findById(decoded.id).select('partnerId status');
      if (!partner || partner.status !== 'Active') {
        return next(new Error('Partner inactive'));
      }

      socket.data.partnerId = partner.partnerId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const partnerId = socket.data.partnerId;
    socket.join(`partner:${partnerId}`);
    console.log(`Socket connected & joined room: partner:${partnerId}`);
    
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: partner:${partnerId}`);
    });
  });

  // Store IO instance globally to use in services
  (global as any).io = io;

  server.listen(PORT, () => {
    console.log(`MenuAR API running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('\x1b[31mFatal startup error:\x1b[0m', err);
  process.exit(1);
});
