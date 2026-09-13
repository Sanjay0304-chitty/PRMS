import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord } from '../../middleware/rbac';
import { ReportingController } from './controller_reporting';

const router = express.Router();
const ctrl = new ReportingController();

router.use(authenticate, adminOrLandlord);
router.get('/dashboard', ctrl.dashboard);
router.get('/revenue', ctrl.revenue);
router.get('/properties', ctrl.properties);
router.get('/occupancy', ctrl.occupancy);

export default router;
