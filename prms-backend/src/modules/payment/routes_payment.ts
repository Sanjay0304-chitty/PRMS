import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent } from '../../middleware/rbac';
import { PaymentController } from './controller_payment';

const router = express.Router();
const ctrl = new PaymentController();

router.use(authenticate);
router.get('/', adminOrLandlordOrAgent, ctrl.list);
router.get('/summary', ctrl.summary);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id/mark-paid', adminOrLandlord, ctrl.markPaid);

export default router;
