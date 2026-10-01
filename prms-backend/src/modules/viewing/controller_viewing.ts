import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as viewingService from './service_viewing';
import { successResponse } from '../../utils/response';
import { createNotification } from '../admin/service_admin';
import { recordAudit } from '../admin/service_audit';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';

const log = async (req: AuthRequest, action: string, entityId?: string, description?: string, status = 'Success', level = 'info', errorMessage?: string) => {
  await recordAudit({
    action, entity: 'ViewingAppointment', entityId, description, status, level, errorMessage,
    userId: req.user?.id, username: req.user?.email || undefined, userRole: req.user?.role,
    ipAddress: (req as any).ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl, httpMethod: req.method, module: 'Viewing',
  });
};

async function notifyUsers(userIds: string[], data: { type: string; title: string; message: string }) {
  await Promise.all(userIds.map((userId) => createNotification({ userId, ...data }).catch(() => null)));
}

async function notifyPropertyManagers(viewing: any, data: { type: string; title: string; message: string }) {
  const userIds = await viewingService.getPropertyManagerUserIds(viewing.propertyId, viewing.property.ownerId);
  await notifyUsers(userIds, data);
}

export class ViewingController {
  request = async (req: AuthRequest, res: Response) => {
    try {
      const viewing = await viewingService.requestViewing(req.body, req.user!.id);
      await notifyPropertyManagers(viewing, { type: 'viewing_requested', title: 'New viewing request', message: `${viewing.tenant.full_name || 'A tenant'} requested a viewing of "${viewing.property.title}".` });
      await log(req, 'REQUEST_VIEWING', viewing.id, `Requested viewing for property ${viewing.propertyId}`);
      res.status(201).json(successResponse(viewing, 'Viewing requested'));
    } catch (error: any) { await log(req, 'REQUEST_VIEWING', undefined, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  mine = async (req: AuthRequest, res: Response) => {
    try {
      const viewings = await viewingService.getMyViewings(req.user!.id);
      res.json(successResponse(viewings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  landlordViewings = async (req: AuthRequest, res: Response) => {
    try {
      const viewings = await viewingService.getLandlordViewings(req.user!.id);
      res.json(successResponse(viewings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  allViewings = async (req: AuthRequest, res: Response) => {
    try {
      const viewings = await viewingService.getAllViewings();
      res.json(successResponse(viewings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  agentViewings = async (req: AuthRequest, res: Response) => {
    try {
      const viewings = await viewingService.getAgentViewings(req.user!.id);
      res.json(successResponse(viewings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  reschedule = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await viewingService.reschedule(String(req.params.id), req.user!.id, req.body);
      await notifyPropertyManagers(updated, { type: 'viewing_rescheduled', title: 'Viewing rescheduled', message: `${updated.tenant.full_name || 'The tenant'} rescheduled the viewing of "${updated.property.title}".` });
      await log(req, 'RESCHEDULE_VIEWING', String(req.params.id), 'Rescheduled viewing');
      res.json(successResponse(updated, 'Viewing rescheduled'));
    } catch (error: any) { await log(req, 'RESCHEDULE_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  cancel = async (req: AuthRequest, res: Response) => {
    try {
      const role = (req.user!.role || '').toLowerCase();
      const viewing = await viewingService.getById(String(req.params.id));
      if (!viewing) return res.status(404).json({ success: false, error: { message: 'Viewing appointment not found' } });
      const authority = await hasPropertyAuthority(req.user!.id, role, viewing.property.ownerId, viewing.propertyId);
      if (viewing.tenantId !== req.user!.id && !authority) return res.status(403).json({ success: false, error: { message: 'You do not have access to this viewing' } });
      const updated = await viewingService.cancel(String(req.params.id), req.user!.id, authority);
      if (viewing.tenantId === req.user!.id) {
        await notifyPropertyManagers(updated, { type: 'viewing_cancelled', title: 'Viewing cancelled', message: `${updated.tenant.full_name || 'The tenant'} cancelled the viewing of "${updated.property.title}".` });
      } else {
        await notifyUsers([viewing.tenantId], { type: 'viewing_cancelled', title: 'Viewing cancelled', message: `Your viewing of "${viewing.property.title}" was cancelled.` });
      }
      await log(req, 'CANCEL_VIEWING', String(req.params.id), 'Cancelled viewing');
      res.json(successResponse(updated, 'Viewing cancelled'));
    } catch (error: any) { await log(req, 'CANCEL_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  accept = async (req: AuthRequest, res: Response) => {
    try {
      const role = (req.user!.role || '').toLowerCase();
      const viewing = await viewingService.getById(String(req.params.id));
      if (!viewing) return res.status(404).json({ success: false, error: { message: 'Viewing appointment not found' } });
      const allowed = await hasPropertyAuthority(req.user!.id, role, viewing.property.ownerId, viewing.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await viewingService.accept(String(req.params.id), req.user!.id);
      await createNotification({ userId: viewing.tenantId, type: 'viewing_accepted', title: 'Viewing accepted', message: `Your requested viewing time for "${viewing.property.title}" was accepted.` }).catch(() => {});
      await log(req, 'ACCEPT_VIEWING', String(req.params.id), 'Accepted viewing request');
      res.json(successResponse(updated, 'Viewing accepted'));
    } catch (error: any) { await log(req, 'ACCEPT_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  proposeAlternate = async (req: AuthRequest, res: Response) => {
    try {
      const role = (req.user!.role || '').toLowerCase();
      const viewing = await viewingService.getById(String(req.params.id));
      if (!viewing) return res.status(404).json({ success: false, error: { message: 'Viewing appointment not found' } });
      const allowed = await hasPropertyAuthority(req.user!.id, role, viewing.property.ownerId, viewing.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await viewingService.proposeAlternate(String(req.params.id), req.user!.id, req.body?.proposedTime);
      await createNotification({ userId: viewing.tenantId, type: 'viewing_alternate_proposed', title: 'Alternate viewing time proposed', message: `A different time was proposed for your viewing of "${viewing.property.title}".` }).catch(() => {});
      await log(req, 'PROPOSE_ALTERNATE_VIEWING', String(req.params.id), 'Proposed alternate viewing time');
      res.json(successResponse(updated, 'Alternate time proposed'));
    } catch (error: any) { await log(req, 'PROPOSE_ALTERNATE_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  confirmAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await viewingService.confirmAttendance(String(req.params.id), req.user!.id);
      await notifyPropertyManagers(updated, { type: 'viewing_confirmed', title: 'Viewing confirmed', message: `${updated.tenant.full_name || 'The tenant'} confirmed the viewing of "${updated.property.title}".` });
      await log(req, 'CONFIRM_VIEWING_ATTENDANCE', String(req.params.id), 'Confirmed viewing attendance');
      res.json(successResponse(updated, 'Attendance confirmed'));
    } catch (error: any) { await log(req, 'CONFIRM_VIEWING_ATTENDANCE', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  markCompleted = async (req: AuthRequest, res: Response) => {
    try {
      const role = (req.user!.role || '').toLowerCase();
      const viewing = await viewingService.getById(String(req.params.id));
      if (!viewing) return res.status(404).json({ success: false, error: { message: 'Viewing appointment not found' } });
      const allowed = await hasPropertyAuthority(req.user!.id, role, viewing.property.ownerId, viewing.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await viewingService.markCompleted(String(req.params.id), req.user!.id);
      await notifyUsers([viewing.tenantId], { type: 'viewing_completed', title: 'Viewing completed', message: `Your viewing of "${viewing.property.title}" was marked completed.` });
      await log(req, 'COMPLETE_VIEWING', String(req.params.id), 'Marked viewing completed');
      res.json(successResponse(updated, 'Viewing marked completed'));
    } catch (error: any) { await log(req, 'COMPLETE_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  markNoShow = async (req: AuthRequest, res: Response) => {
    try {
      const role = (req.user!.role || '').toLowerCase();
      const viewing = await viewingService.getById(String(req.params.id));
      if (!viewing) return res.status(404).json({ success: false, error: { message: 'Viewing appointment not found' } });
      const allowed = await hasPropertyAuthority(req.user!.id, role, viewing.property.ownerId, viewing.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have authority over this property' } });
      const updated = await viewingService.markNoShow(String(req.params.id), req.user!.id);
      await notifyUsers([viewing.tenantId], { type: 'viewing_no_show', title: 'Viewing marked as no-show', message: `Your viewing of "${viewing.property.title}" was marked as a no-show.` });
      await log(req, 'NO_SHOW_VIEWING', String(req.params.id), 'Marked viewing as no-show');
      res.json(successResponse(updated, 'Viewing marked as no-show'));
    } catch (error: any) { await log(req, 'NO_SHOW_VIEWING', String(req.params.id), undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
