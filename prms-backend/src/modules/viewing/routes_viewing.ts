import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlordOrAgent, adminOnly, agentOnly, landlordOnly, tenantOnly } from '../../middleware/rbac';
import { ViewingController } from './controller_viewing';

const router = express.Router();
const ctrl = new ViewingController();

router.use(authenticate);

router.post('/', tenantOnly, ctrl.request);
router.get('/mine', tenantOnly, ctrl.mine);
router.get('/landlord', landlordOnly, ctrl.landlordViewings);
router.get('/assigned', agentOnly, ctrl.agentViewings);
router.get('/all', adminOnly, ctrl.allViewings);

router.patch('/:id/reschedule', tenantOnly, ctrl.reschedule);
router.patch('/:id/cancel', ctrl.cancel);
router.patch('/:id/accept', adminOrLandlordOrAgent, ctrl.accept);
router.patch('/:id/propose', adminOrLandlordOrAgent, ctrl.proposeAlternate);
router.patch('/:id/confirm', tenantOnly, ctrl.confirmAttendance);
router.patch('/:id/complete', adminOrLandlordOrAgent, ctrl.markCompleted);
router.patch('/:id/no-show', adminOrLandlordOrAgent, ctrl.markNoShow);

export default router;
