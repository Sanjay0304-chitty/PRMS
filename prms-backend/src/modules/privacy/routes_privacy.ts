import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { PrivacyController } from './controller_privacy';

const router = express.Router();
const ctrl = new PrivacyController();

router.use(authenticate);

// Consent
router.post('/consent', ctrl.recordConsent);
router.get('/consent/mine', ctrl.myConsents);
router.patch('/consent/:id/withdraw', ctrl.withdrawConsent);

// My stored data
router.get('/me', ctrl.myStoredData);

// Privacy requests - self-service
router.post('/requests', ctrl.submitRequest);
router.get('/requests/mine', ctrl.myRequests);

// Privacy requests - admin management
router.get('/requests', adminOnly, ctrl.allRequests);
router.patch('/requests/:id/assign', adminOnly, ctrl.assignRequest);
router.patch('/requests/:id/decide', adminOnly, ctrl.decideRequest);
router.patch('/requests/:id/complete', adminOnly, ctrl.completeRequest);

// Retention (admin only)
router.get('/retention', adminOnly, ctrl.getPolicies);
router.put('/retention/:category', adminOnly, ctrl.updatePolicy);
router.post('/retention/simulate', adminOnly, ctrl.simulateCleanup);

// Breach register (admin only)
router.get('/breaches', adminOnly, ctrl.getIncidents);
router.post('/breaches', adminOnly, ctrl.createIncident);
router.patch('/breaches/:id', adminOnly, ctrl.updateIncident);

export default router;
