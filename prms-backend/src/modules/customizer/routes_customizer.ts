import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { CustomizerController } from './controller_customizer';

const router = express.Router();
const ctrl = new CustomizerController();

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Branding is per-user now (each account has its own), so /config and
// /preview use optionalAuth: a logged-in caller gets their own config, a
// guest (no token yet, e.g. the public landing page before sign-in) gets
// the plain defaults rather than any particular user's customization.
router.get('/config', optionalAuth, ctrl.getConfig);
router.get('/preview', optionalAuth, ctrl.getPreview);
router.get('/health', (_req, res) => res.json({ success: true, service: 'customizer', status: 'ok' }));

// Every authenticated user manages their own branding - not admin-only,
// since each role (and each individual account within a role) has its
// own independent customizer.
router.use(authenticate);
router.put('/config', ctrl.updateConfig);
router.post('/upload-logo', logoUpload.single('logo'), ctrl.uploadLogo);
router.delete('/logo', ctrl.removeLogo);

export default router;
