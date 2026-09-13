import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent } from '../../middleware/rbac';
import uploadAgreement from '../../middleware/uploadAgreement';
import { AgreementController } from './controller_agreement';

const router = express.Router();
const ctrl = new AgreementController();

router.use(authenticate);

router.post('/', adminOrLandlord, ctrl.generate);
router.get('/booking/:bookingId', ctrl.getByBooking);
router.get('/:id', ctrl.getById);
router.put('/:id', adminOrLandlordOrAgent, ctrl.update);

// Electronic signing
router.post('/:id/consent', ctrl.tenantConsent);
router.post('/:id/verify-otp', ctrl.verifyOtp);
router.post('/:id/landlord-sign', ctrl.landlordSign);

// Physical signing
router.post('/:id/physical-copy', uploadAgreement.single('file'), ctrl.uploadPhysical);
router.post('/:id/verify-physical', adminOrLandlord, ctrl.verifyPhysical);

router.patch('/:id/cancel', adminOrLandlord, ctrl.cancel);
router.post('/:id/remind', adminOrLandlordOrAgent, ctrl.remind);

export default router;
