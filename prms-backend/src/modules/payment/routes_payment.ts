import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent, tenantOnly } from '../../middleware/rbac';
import { PaymentController } from './controller_payment';

const router = express.Router();
const ctrl = new PaymentController();

router.use(authenticate);

// ── Static paths (must come before dynamic :id routes) ──
router.get('/summary', adminOrLandlordOrAgent, ctrl.summary);
router.get('/my-payments', tenantOnly, ctrl.myPayments);
router.get('/my-dashboard', tenantOnly, ctrl.tenantDashboard);
router.patch('/:id/dashboard-visibility', tenantOnly, ctrl.dashboardVisibility);
router.get('/mock-transactions/:transactionId', tenantOnly, ctrl.mockTransactionStatus);
router.post('/mock-transactions/:transactionId/complete', tenantOnly, ctrl.completeMockTransaction);

// ── Payment-level routes ──
router.get('/', adminOrLandlordOrAgent, ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id/mark-paid', adminOrLandlord, ctrl.markPaid);
router.post('/:paymentId/checkout', tenantOnly, ctrl.mockCheckout);

export default router;
