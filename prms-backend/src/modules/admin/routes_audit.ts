import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { auditController } from './controller_audit';

const router = express.Router();

router.use(authenticate, adminOnly);
router.get('/audit-logs', auditController.list);
router.get('/audit-logs/:id', auditController.getById);
router.post('/audit-logs', auditController.create);

export default router;