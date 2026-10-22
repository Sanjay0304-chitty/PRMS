import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent, agentOnly } from '../../middleware/rbac';
import { MaintenanceController } from './controller_maintenance';
import uploadMaintenance from '../../middleware/uploadMaintenance';
import { recordArchiveRoutes } from '../recordArchive/routes_recordArchive';

const router = express.Router();
const ctrl = new MaintenanceController();

router.use(authenticate);
router.use(recordArchiveRoutes('maintenance'));
router.get('/', adminOrLandlord, ctrl.list);
router.get('/my-tickets', ctrl.myTickets);
router.get('/assigned', agentOnly, ctrl.assignedTickets);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', adminOrLandlordOrAgent, ctrl.update);
router.patch('/:id/resolve', adminOrLandlordOrAgent, ctrl.resolve);
router.post('/:id/photos', uploadMaintenance.array('photos', 6), ctrl.addPhotos);

export default router;
