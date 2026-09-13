import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly, adminOrLandlord } from '../../middleware/rbac';
import { CategoryController } from './controller_category';

const router = express.Router();
const ctrl = new CategoryController();

router.use(authenticate);

// Shared categories - any authenticated user can read
router.get('/shared', ctrl.shared);

// Personal (non-admin) endpoints - a landlord's own categories
router.get('/personal', ctrl.personalList);
router.post('/personal', ctrl.createPersonal);
router.put('/personal/:id', ctrl.updatePersonal);
router.delete('/personal/:id', ctrl.removePersonal);
router.patch('/personal/:id/toggle', ctrl.togglePersonal);

// Admin endpoints
router.get('/', adminOnly, ctrl.list);
router.post('/', adminOnly, ctrl.create);
router.post('/seed', adminOnly, ctrl.seedDefaults);
router.get('/:id', adminOnly, ctrl.getById);
router.put('/:id', adminOnly, ctrl.update);
router.patch('/:id/toggle', adminOnly, ctrl.toggle);
router.delete('/:id', adminOnly, ctrl.remove);

export default router;
