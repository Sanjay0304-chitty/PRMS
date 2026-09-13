import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, adminOrLandlordOrAgent, adminOnly } from '../../middleware/rbac';
import { BookingController } from './controller_booking';

const router = express.Router();
const ctrl = new BookingController();

router.get('/', authenticate, adminOrLandlord, ctrl.list);
router.get('/my-bookings', authenticate, ctrl.myBookings);
// These MUST come before '/:id' — otherwise Express matches
// '/summary', '/check-overlap', and '/assigned' as an :id value and they
// become unreachable.
router.get('/assigned', authenticate, ctrl.agentBookings);
router.get('/landlord', authenticate, ctrl.landlordBookings);
router.get('/summary', authenticate, ctrl.getSummary);
router.get('/check-overlap', authenticate, ctrl.checkOverlap);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, adminOrLandlord, ctrl.update);
router.patch('/:id/confirm', authenticate, adminOrLandlordOrAgent, ctrl.confirm);
router.patch('/:id/reject', authenticate, adminOrLandlordOrAgent, ctrl.reject);
router.patch('/:id/cancel', authenticate, ctrl.cancel);
router.delete('/:id', authenticate, adminOnly, ctrl.remove);

// Application review (Part 4)
router.patch('/:id/review', authenticate, adminOrLandlordOrAgent, ctrl.review);
router.patch('/:id/request-info', authenticate, adminOrLandlordOrAgent, ctrl.requestInfo);
router.patch('/:id/approve', authenticate, adminOrLandlord, ctrl.approve);
router.patch('/:id/decline', authenticate, adminOrLandlord, ctrl.decline);
router.patch('/:id/withdraw', authenticate, ctrl.withdraw);

// Tenancy lifecycle (Part 8)
router.patch('/:id/move-in', authenticate, adminOrLandlord, ctrl.moveIn);
router.patch('/:id/notice', authenticate, ctrl.notice);
router.patch('/:id/move-out', authenticate, adminOrLandlord, ctrl.moveOut);

export default router;
