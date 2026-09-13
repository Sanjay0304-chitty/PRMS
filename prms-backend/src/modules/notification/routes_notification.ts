import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { notificationController } from './controller_notification';

const router = express.Router();

router.use(authenticate);
router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);
router.patch('/read-all', notificationController.markAllRead);
router.delete('/:id', notificationController.delete);
router.post('/', adminOnly, notificationController.create);

export default router;