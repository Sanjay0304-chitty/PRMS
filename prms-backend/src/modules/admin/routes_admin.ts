import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { AdminController } from './controller_admin';
import upload from '../../middleware/fileUpload';

const router = express.Router();
const ctrl = new AdminController();

router.use(authenticate);

// Settings - admin only
router.get('/settings', adminOnly, ctrl.getSettings);
router.get('/settings/category/:category', adminOnly, ctrl.getSettingsByCategory);
router.get('/settings/public', ctrl.getPublicSettings);
router.put('/settings', adminOnly, ctrl.updateSetting);
router.put('/settings/bulk', adminOnly, ctrl.bulkUpdateSettings);
router.post('/settings', adminOnly, ctrl.addSetting);
router.post('/settings/logo', adminOnly, upload.single('logo'), ctrl.uploadLogo);

// Audit logs — see routes_audit.ts, mounted separately in app.ts
// (it has full filter support: level/action/search/sort; this module's
// getAuditLogs only filtered by entity and was superseded by that one).

// Notifications - any authenticated user
router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/:id/read', ctrl.markNotificationRead);
router.post('/notifications/read-all', ctrl.markAllRead);
router.delete('/notifications/:id', ctrl.dismissNotification);

export default router;
