import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './config';
import { prisma } from './db';
import path from 'path';
import fs from 'fs';
import { valerieGuard } from './middleware/valerieGuard';
import { protectAgreements, protectUserFiles, protectPropertyUploads } from './middleware/fileAuth';
import { requestLogger } from './middleware/logging';
import { responseCache } from './middleware/responseCache';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/routes_auth';
import userRoutes from './modules/user/routes_user';
import propertyRoutes from './modules/property/routes_property';
import searchRoutes from './modules/search/routes_search';
import bookingRoutes from './modules/booking/routes_booking';
import paymentRoutes from './modules/payment/routes_payment';
import maintenanceRoutes from './modules/maintenance/routes_maintenance';
import communicationRoutes from './modules/communication/routes_communication';
import adminRoutes from './modules/admin/routes_admin';
import auditRoutes from './modules/admin/routes_audit';
import reportingRoutes from './modules/reporting/routes_reporting';
import agentRoutes from './modules/agent/routes_agent';
import categoryRoutes from './modules/category/routes_category';
import themeRoutes from './modules/theme/routes_theme';
import favoriteRoutes from './modules/favorite/routes_favorite';

// Initialize Firebase if possible
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: env.GCP_SA_KEY ? JSON.parse(env.GCP_SA_KEY) : { projectId: 'prms-local' },
    });
  } catch {
    console.log('[Firebase] Running without credential (local mode)');
  }
}

const app = express();
const router = express.Router();
const PORT = env.PORT;

// Parse CORS_ORIGIN: supports single string or comma-separated list → array
const corsOrigins = env.CORS_ORIGIN.split(',').map((o: string) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (/^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(origin)) {
      return callback(null, true);
    }
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Valerie Guard: Mounted before routes and static files
app.use(express.json());
app.use(valerieGuard);
app.use(responseCache);
app.use(requestLogger);

// Serve public property images statically with cross-origin CORP (frontend is on a different port)
app.use('/images', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, '..', 'public', 'images')));

// Serve generated thumbnails statically
app.use('/api/files/thumbnails', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, '..', 'public', 'thumbnails')));

// Serve uploaded user files with role-based authentication (owner or admin)
app.use('/files', protectUserFiles, express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Serve uploaded property media (public photos/videos stay public; documents restricted to landlord/tenant/admin)
app.use('/uploads/properties', protectPropertyUploads, express.static(path.join(__dirname, '..', 'uploads', 'properties')));

// Serve uploaded physically-signed agreement copies with strict authentication (landlord, tenant, admin)
app.use('/uploads/agreements', protectAgreements, express.static(path.join(__dirname, '..', 'uploads', 'agreements')));

// Serve uploaded maintenance attachments with strict authentication
app.use('/uploads/maintenance', protectAgreements, express.static(path.join(__dirname, '..', 'uploads', 'maintenance')));

const frontendDist = path.join(__dirname, '..', '..', 'prms-frontend', 'dist');

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ health: 'ok', timestamp: new Date().toISOString(), environment: env.NODE_ENV, db: 'connected' });
  } catch (err) {
    res.status(503).json({ health: 'degraded', timestamp: new Date().toISOString(), db: 'unreachable', error: (err as Error).message });
  }
});

app.get('/', (req, res) => {
  if (fs.existsSync(frontendDist)) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  res.json({ app: 'PRMS Backend', version: '1.0.0', status: 'running', documentation: '/health' });
});

router.post('/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Missing Firebase token' });
    const decodedToken = await getAuth().verifyIdToken(token);
    res.json({ userId: decodedToken.uid, email: decodedToken.email, name: decodedToken.name });
  } catch (error) { res.status(401).json({ error: 'Invalid Firebase token' }); }
});

router.use(apiLimiter);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/search', searchRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/communication', communicationRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', auditRoutes);
router.use('/reports', reportingRoutes);
router.use('/agents', agentRoutes);
router.use('/categories', categoryRoutes);
router.use('/themes', themeRoutes);
router.use('/favorites', favoriteRoutes);
import notificationRoutes from './modules/notification/routes_notification';
router.use('/notifications', notificationRoutes);

import customizerRoutes from './modules/customizer/routes_customizer';
router.use('/customizer', customizerRoutes);

import viewingRoutes from './modules/viewing/routes_viewing';
router.use('/viewings', viewingRoutes);

import agreementRoutes from './modules/agreement/routes_agreement';
router.use('/agreements', agreementRoutes);

import privacyRoutes from './modules/privacy/routes_privacy';
router.use('/privacy', privacyRoutes);

app.use('/api', router);
app.use(router);

// Serve frontend dist when built (single-origin hosting mode with SPA fallback)
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    // Skip static assets, uploads, and health/api endpoints
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/files') ||
      req.path.startsWith('/images') ||
      req.path.startsWith('/health') ||
      path.extname(req.path)
    ) {
      return next();
    }
    // API clients expecting JSON should not receive HTML
    if (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`PRMS Backend running on http://localhost:${PORT} (${env.NODE_ENV})`);
});

export default app;
