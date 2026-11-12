import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './config';
import { prisma, bootstrap } from './db';
import path from 'path';
import fs from 'fs';
import { valerieGuard, startValerieGuard } from './middleware/valerieGuard';
import { protectAgreements, protectUserFiles, protectPropertyUploads, protectMaintenance, protectUserThumbnails } from './middleware/fileAuth';
import { isAllowedOrigin } from './middleware/corsPolicy';
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

// Trust local reverse proxies (such as cloudflared quick tunnels on loopback)
app.set('trust proxy', 'loopback');

// Parse CORS_ORIGIN: supports single string or comma-separated list → array
const corsOrigins = env.CORS_ORIGIN.split(',').map((o: string) => o.trim());

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      const tunnelHost = req.headers.host;
      const isSameTunnelOrigin = Boolean(
        origin &&
        tunnelHost &&
        /^[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(tunnelHost) &&
        origin === `https://${tunnelHost}`
      );
      return callback(null, isSameTunnelOrigin || isAllowedOrigin(origin, corsOrigins, env.NODE_ENV));
    },
    credentials: true,
  })(req, res, next);
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      connectSrc: [
        "'self'",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.firebaseapp.com",
        ...(env.NODE_ENV === 'development' ? ["http://localhost:*", "ws://localhost:*", "http://127.0.0.1:*"] : []),
      ],
      frameSrc: ["'self'", "https://www.google.com", "https://*.firebaseapp.com", "https://accounts.google.com"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
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
app.use('/api/files/thumbnails', protectUserThumbnails, express.static(path.join(__dirname, '..', 'public', 'thumbnails')));

// Serve uploaded user files with role-based authentication (owner or admin)
app.use('/files', protectUserFiles, express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Serve uploaded property media (public photos/videos stay public; documents restricted to landlord/tenant/admin)
app.use('/uploads/properties', protectPropertyUploads, express.static(path.join(__dirname, '..', 'uploads', 'properties')));

// Serve uploaded physically-signed agreement copies with strict authentication (landlord, tenant, admin)
app.use('/uploads/agreements', protectAgreements, express.static(path.join(__dirname, '..', 'uploads', 'agreements')));

// Serve uploaded maintenance attachments with strict authentication
app.use('/uploads/maintenance', protectMaintenance, express.static(path.join(__dirname, '..', 'uploads', 'maintenance')));

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

const isSpaPagePath = (reqPath: string) => (
  !reqPath.startsWith('/api') &&
  !reqPath.startsWith('/uploads') &&
  !reqPath.startsWith('/files') &&
  !reqPath.startsWith('/images') &&
  !reqPath.startsWith('/health') &&
  !path.extname(reqPath)
);

// Serve built frontend and browser page navigations before bare-path API router
// so refreshing SPA routes like /properties returns the UI instead of raw JSON.
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.headers.accept?.includes('text/html') && isSpaPagePath(req.path)) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

app.use('/api', router);
app.use(router);

if (fs.existsSync(frontendDist)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !isSpaPagePath(req.path)) return next();
    if (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

// Bootstrap database: connect, create tables if missing, seed default admin
bootstrap()
  .then(async () => {
    const server = app.listen(PORT, () => {
      console.log(`PRMS Backend running on http://localhost:${PORT} (${env.NODE_ENV})`);
      startValerieGuard();   // check in with Valerie from the start, not only after the first visitor
    });
  })
  .catch((err: Error) => {
    console.error('[Startup] Database bootstrap failed:', err);
    process.exit(1);
  });

export default app;
