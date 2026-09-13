import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent } from '../../middleware/rbac';
import { MaintenanceController } from './controller_maintenance';

const router = express.Router();
const ctrl = new MaintenanceController();

router.use(authenticate);
router.get('/', adminOrLandlord, ctrl.list);
router.get('/my-tickets', ctrl.myTickets);
router.get('/assigned', ctrl.assignedTickets);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', adminOrLandlordOrAgent, ctrl.update);
router.patch('/:id/resolve', adminOrLandlordOrAgent, ctrl.resolve);

export default router;
