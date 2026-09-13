import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { ThemeController } from './controller_theme';

const router = express.Router();
const ctrl = new ThemeController();

router.use(authenticate);

// Theme data - authenticated users
router.get('/', ctrl.getTheme);
router.get('/:themeId/draft', ctrl.getDraft);
router.get('/:themeId/versions', ctrl.getVersions);

// Admin only - write operations
router.put('/:themeId/draft', adminOnly, ctrl.saveDraft);
router.post('/:themeId/publish', adminOnly, ctrl.publishDraft);
router.post('/:themeId/versions/:version/restore', adminOnly, ctrl.restoreVersion);

export default router;
