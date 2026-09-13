import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlordOrAgent, adminOnly } from '../../middleware/rbac';
import { ViewingController } from './controller_viewing';

const router = express.Router();
const ctrl = new ViewingController();

router.use(authenticate);

router.post('/', ctrl.request);
router.get('/mine', ctrl.mine);
router.get('/landlord', ctrl.landlordViewings);
router.get('/assigned', ctrl.agentViewings);
router.get('/all', adminOnly, ctrl.allViewings);

router.patch('/:id/reschedule', ctrl.reschedule);
router.patch('/:id/cancel', ctrl.cancel);
router.patch('/:id/accept', adminOrLandlordOrAgent, ctrl.accept);
router.patch('/:id/propose', adminOrLandlordOrAgent, ctrl.proposeAlternate);
router.patch('/:id/confirm', ctrl.confirmAttendance);
router.patch('/:id/complete', adminOrLandlordOrAgent, ctrl.markCompleted);
router.patch('/:id/no-show', adminOrLandlordOrAgent, ctrl.markNoShow);

export default router;
