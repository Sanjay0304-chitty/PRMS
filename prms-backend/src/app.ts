import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './config';
import { prisma } from './db';
import path from 'path';
import { requestLogger } from './middleware/logging';
import { responseCache } from './middleware/responseCache';
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

app.use(helmet());
// Parse CORS_ORIGIN: supports single string or comma-separated list → array
const corsOrigins = env.CORS_ORIGIN.split(',').map((o: string) => o.trim());
const corsOriginValue = corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins;

app.use(cors({ origin: corsOriginValue }));
app.use(express.json());
app.use(responseCache);
app.use(requestLogger);

// Serve uploaded images statically with cross-origin CORP (frontend is on a different port)
app.use('/images', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '..', 'public', 'images')));

// Serve uploaded user files statically (documents, attachments)
app.use('/files', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Serve generated thumbnails statically
app.use('/api/files/thumbnails', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '..', 'public', 'thumbnails')));

// Serve uploaded property media (images, videos, documents) statically
app.use('/uploads/properties', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '..', 'uploads', 'properties')));

// Serve uploaded physically-signed agreement copies statically
app.use('/uploads/agreements', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '..', 'uploads', 'agreements')));

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ health: 'ok', timestamp: new Date().toISOString(), environment: env.NODE_ENV, db: 'connected' });
  } catch (err) {
    res.status(503).json({ health: 'degraded', timestamp: new Date().toISOString(), db: 'unreachable', error: (err as Error).message });
  }
});

app.get('/', (req, res) => {
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

app.use(router);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`PRMS Backend running on http://localhost:${PORT} (${env.NODE_ENV})`);
});

export default app;