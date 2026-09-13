import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as bookingService from './service_booking';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';
import { createNotification } from '../admin/service_admin';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Booking', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class BookingController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { userId, status } = req.query;
      const { bookings, total } = await bookingService.getBookings(page, limit, userId as any, status as any);
      HELPERS(req).log({ action: 'VIEW_BOOKINGS', entity: 'Booking', description: `Listed bookings (page ${page})` });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });

      const role = (req.user!.role || '').toLowerCase();
      const isOwnBooking = booking.userId === req.user!.id;
      const hasAuthority = isOwnBooking || (await hasPropertyAuthority(req.user!.id, role, (booking as any).property.ownerId, booking.propertyId));
      if (!hasAuthority) {
        HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', entityId: booking.id, status: 'Failed', level: 'warn', description: `Blocked: user ${req.user!.id} tried to view a booking they don't own or manage` });
        return res.status(403).json({ success: false, error: { message: 'You do not have access to this booking' } });
      }

      HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', entityId: booking.id, description: `Viewed booking ${booking.id}` });
      res.json(successResponse(booking));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.createBooking(req.body, req.user!.id);
      HELPERS(req).log({ action: 'CREATE_BOOKING', entity: 'Booking', entityId: booking.id, description: `Created booking for property ${booking.propertyId}` });
      if ((booking as any).property?.ownerId) {
        await createNotification({
          userId: (booking as any).property.ownerId,
          type: 'application_submitted',
          title: 'New rental application',
          message: `${(booking as any).user?.full_name || 'A tenant'} applied to rent "${(booking as any).property?.title}".`,
        }).catch(() => {});
      }
      res.status(201).json(successResponse(booking, 'Booking created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), req.body);
      HELPERS(req).log({ action: 'UPDATE_BOOKING', entity: 'Booking', entityId: booking?.id, description: `Updated booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  confirm = async (req: Request, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), { status: 'CONFIRMED' });
      HELPERS(req).log({ action: 'CONFIRM_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Confirmed booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking confirmed'));
    } catch (error: any) { HELPERS(req).log({ action: 'CONFIRM_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  reject = async (req: Request, res: Response) => {
    try {
      const booking = await bookingService.updateBooking(String(req.params.id), { status: 'CANCELLED' });
      HELPERS(req).log({ action: 'REJECT_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Rejected booking ${req.params.id}` });
      res.json(successResponse(booking, 'Booking rejected'));
    } catch (error: any) { HELPERS(req).log({ action: 'REJECT_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  cancel = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });

      const role = (req.user!.role || '').toLowerCase();
      const isOwnBooking = booking.userId === req.user!.id;
      const isOwnProperty = (booking as any).property?.ownerId === req.user!.id;
      const allowed = role === 'admin' || isOwnBooking || (role === 'landlord' && isOwnProperty);
      if (!allowed) {
        HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', entityId: req.params.id, status: 'Failed', level: 'warn', description: `Blocked: user ${req.user!.id} tried to cancel a booking they don't own` });
        return res.status(403).json({ success: false, error: { message: 'You do not have permission to cancel this booking' } });
      }

      await bookingService.cancelBooking(String(req.params.id));
      HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Cancelled booking ${req.params.id}` });
      res.json(successResponse(null, 'Booking cancelled'));
    } catch (error: any) { HELPERS(req).log({ action: 'CANCEL_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await bookingService.deleteBooking(String(req.params.id));
      HELPERS(req).log({ action: 'DELETE_BOOKING', entity: 'Booking', entityId: req.params.id, description: `Deleted booking ${req.params.id}` });
      res.json(successResponse(null, 'Booking deleted'));
    } catch (error: any) { HELPERS(req).log({ action: 'DELETE_BOOKING', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getSummary = async (req: Request, res: Response) => {
    try {
      const summary = await bookingService.getBookingSummary();
      HELPERS(req).log({ action: 'VIEW_BOOKING_SUMMARY', entity: 'Booking', description: `Viewed booking summary` });
      res.json(successResponse(summary));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_BOOKING_SUMMARY', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  myBookings = async (req: AuthRequest, res: Response) => {
    try {
      const bookings = await bookingService.getMyBookings(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_MY_BOOKINGS', entity: 'Booking', description: `Viewed own bookings` });
      res.json(successResponse(bookings));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_MY_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  landlordBookings = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { bookings, total } = await bookingService.getLandlordBookings(req.user!.id, page, limit, status);
      HELPERS(req).log({ action: 'VIEW_LANDLORD_BOOKINGS', entity: 'Booking', description: 'Viewed bookings on own properties' });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_LANDLORD_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  agentBookings = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { bookings, total } = await bookingService.getAgentBookings(req.user!.id, page, limit, status);
      HELPERS(req).log({ action: 'VIEW_ASSIGNED_BOOKINGS', entity: 'Booking', description: 'Viewed bookings for assigned properties' });
      res.json(paginatedResponse(bookings, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_ASSIGNED_BOOKINGS', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  checkOverlap = async (req: Request, res: Response) => {
    try {
      const { propertyId, startDate, endDate, excludeBookingId } = req.query;
      if (!propertyId || !startDate || !endDate || isNaN(Date.parse(String(startDate))) || isNaN(Date.parse(String(endDate)))) {
        return res.status(400).json({ success: false, error: { message: 'propertyId, startDate and endDate are required' } });
      }
      const result = await bookingService.checkOverlap(
        String(propertyId),
        String(startDate),
        String(endDate),
        excludeBookingId ? String(excludeBookingId) : undefined,
      );
      HELPERS(req).log({ action: 'CHECK_OVERLAP', entity: 'Booking', description: `Checked overlap for property ${propertyId}` });
      res.json(successResponse(result));
    } catch (error: any) { HELPERS(req).log({ action: 'CHECK_OVERLAP', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  /* ── Application review (Part 4) ── */

  review = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = await hasPropertyAuthority(req.user!.id, role, (booking as any).property.ownerId, booking.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await bookingService.setUnderReview(String(req.params.id), req.body?.reviewer_notes);
      HELPERS(req).log({ action: 'REVIEW_APPLICATION', entity: 'Booking', entityId: req.params.id, description: 'Marked application under review' });
      res.json(successResponse(updated, 'Application marked under review'));
    } catch (error: any) { HELPERS(req).log({ action: 'REVIEW_APPLICATION', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  requestInfo = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = await hasPropertyAuthority(req.user!.id, role, (booking as any).property.ownerId, booking.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await bookingService.requestInformation(String(req.params.id), req.body?.reviewer_notes);
      await createNotification({ userId: booking.userId, type: 'application_needs_info', title: 'More information needed', message: `The landlord needs more information for your application on "${(booking as any).property.title}": ${req.body?.reviewer_notes || ''}` }).catch(() => {});
      HELPERS(req).log({ action: 'REQUEST_APPLICATION_INFO', entity: 'Booking', entityId: req.params.id, description: 'Requested more information from applicant' });
      res.json(successResponse(updated, 'Requested more information'));
    } catch (error: any) { HELPERS(req).log({ action: 'REQUEST_APPLICATION_INFO', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  approve = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      // Approval authority is intentionally narrower than review authority —
      // an Agent may recommend a decision but not make it (per the workflow
      // plan: "An Agent can approve only when explicitly authorised", and
      // this codebase has no such explicit-authorisation flag yet).
      const allowed = role === 'admin' || (role === 'landlord' && (booking as any).property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can approve this application' } });
      const updated = await bookingService.approveApplication(String(req.params.id), req.body);
      await createNotification({ userId: booking.userId, type: 'application_approved', title: 'Application approved', message: `Your application for "${(booking as any).property.title}" was approved. Review the offer terms and sign the tenancy agreement.` }).catch(() => {});
      HELPERS(req).log({ action: 'APPROVE_APPLICATION', entity: 'Booking', entityId: req.params.id, description: 'Approved application and issued rental offer' });
      res.json(successResponse(updated, 'Application approved'));
    } catch (error: any) { HELPERS(req).log({ action: 'APPROVE_APPLICATION', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  decline = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (role === 'landlord' && (booking as any).property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can reject this application' } });
      const updated = await bookingService.rejectApplication(String(req.params.id), req.body?.reason);
      await createNotification({ userId: booking.userId, type: 'application_rejected', title: 'Application not approved', message: `Your application for "${(booking as any).property.title}" was not approved: ${req.body?.reason}` }).catch(() => {});
      HELPERS(req).log({ action: 'REJECT_APPLICATION', entity: 'Booking', entityId: req.params.id, description: `Rejected application: ${req.body?.reason}` });
      res.json(successResponse(updated, 'Application rejected'));
    } catch (error: any) { HELPERS(req).log({ action: 'REJECT_APPLICATION', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  withdraw = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await bookingService.withdrawApplication(String(req.params.id), req.user!.id);
      HELPERS(req).log({ action: 'WITHDRAW_APPLICATION', entity: 'Booking', entityId: req.params.id, description: 'Withdrew application' });
      res.json(successResponse(updated, 'Application withdrawn'));
    } catch (error: any) { HELPERS(req).log({ action: 'WITHDRAW_APPLICATION', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  /* ── Tenancy lifecycle (Part 8) ── */

  moveIn = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (role === 'landlord' && (booking as any).property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can confirm move-in' } });
      const updated = await bookingService.confirmMoveIn(String(req.params.id), req.body || {});
      await createNotification({ userId: booking.userId, type: 'move_in_confirmed', title: 'Move-in confirmed', message: `Move-in for "${(booking as any).property.title}" has been confirmed. Your tenancy is now active.` }).catch(() => {});
      HELPERS(req).log({ action: 'CONFIRM_MOVE_IN', entity: 'Booking', entityId: req.params.id, description: 'Confirmed move-in; tenancy is now active' });
      res.json(successResponse(updated, 'Move-in confirmed'));
    } catch (error: any) { HELPERS(req).log({ action: 'CONFIRM_MOVE_IN', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  notice = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || booking.userId === req.user!.id || (role === 'landlord' && (booking as any).property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have permission to submit notice for this tenancy' } });
      const updated = await bookingService.submitNotice(String(req.params.id), req.user!.id);
      const notifyUserId = req.user!.id === booking.userId ? (booking as any).property.ownerId : booking.userId;
      await createNotification({ userId: notifyUserId, type: 'move_out_notice', title: 'Move-out notice submitted', message: `A move-out notice was submitted for "${(booking as any).property.title}".` }).catch(() => {});
      HELPERS(req).log({ action: 'SUBMIT_NOTICE', entity: 'Booking', entityId: req.params.id, description: 'Submitted move-out notice' });
      res.json(successResponse(updated, 'Notice submitted'));
    } catch (error: any) { HELPERS(req).log({ action: 'SUBMIT_NOTICE', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  moveOut = async (req: AuthRequest, res: Response) => {
    try {
      const booking = await bookingService.getBookingById(String(req.params.id));
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (role === 'landlord' && (booking as any).property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can confirm move-out' } });
      const updated = await bookingService.confirmMoveOut(String(req.params.id), req.body || {});
      await createNotification({ userId: booking.userId, type: 'tenancy_closed', title: 'Tenancy closed', message: `Move-out for "${(booking as any).property.title}" has been confirmed and the tenancy is now closed.` }).catch(() => {});
      HELPERS(req).log({ action: 'CONFIRM_MOVE_OUT', entity: 'Booking', entityId: req.params.id, description: 'Confirmed move-out; tenancy closed' });
      res.json(successResponse(updated, 'Move-out confirmed and tenancy closed'));
    } catch (error: any) { HELPERS(req).log({ action: 'CONFIRM_MOVE_OUT', entity: 'Booking', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
