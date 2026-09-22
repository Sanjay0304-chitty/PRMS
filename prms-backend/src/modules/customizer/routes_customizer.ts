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

// A logged-in caller gets their personal config. Guests and accounts that
// have not customized yet receive the administrator's system defaults.
router.get('/config', optionalAuth, ctrl.getConfig);
router.get('/preview', optionalAuth, ctrl.getPreview);
router.get('/health', (_req, res) => res.json({ success: true, service: 'customizer', status: 'ok' }));

// Every authenticated user can manage personal colours. The controller
// limits company-name and logo changes to administrators and landlords.
router.use(authenticate);
router.put('/config', ctrl.updateConfig);
router.delete('/config', ctrl.resetConfig);
router.post('/upload-logo', logoUpload.single('logo'), ctrl.uploadLogo);
router.delete('/logo', ctrl.removeLogo);

export default router;
