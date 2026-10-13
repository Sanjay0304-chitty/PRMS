import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as maintenanceService from './service_maintenance';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';
import { prisma } from '../../db';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';
import { createNotification } from '../admin/service_admin';

async function notifyMaintenance(userIds: string[], title: string, message: string) {
  await Promise.all(userIds.map((userId) => createNotification({ userId, type: 'maintenance', title, message }).catch(() => null)));
}

async function canAccessTicket(req: AuthRequest, ticket: { userId: string; propertyId: string | null }) {
  const role = req.user!.role.toLowerCase();
  if (role === 'admin' || ticket.userId === req.user!.id) return true;
  if (!ticket.propertyId) return false;
  const property = await prisma.property.findUnique({ where: { id: ticket.propertyId }, select: { ownerId: true } });
  return !!property && hasPropertyAuthority(req.user!.id, role, property.ownerId, ticket.propertyId);
}

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Maintenance', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class MaintenanceController {
  // Landlord (adminOrLandlord-gated, alongside Admin) must only see tickets
  // on properties they actually own - getTickets() has no such filter, so
  // a Landlord hitting this unfiltered was seeing every tenant's tickets
  // system-wide. Admin still gets the unfiltered view; status/scope query
  // params (previously accepted but silently ignored) now actually apply.
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;
      const { tickets, total } = req.user?.role === 'Landlord'
        ? await maintenanceService.getLandlordTickets(req.user.id, page, limit, status)
        : await maintenanceService.getTickets(page, limit, undefined, status);
      HELPERS(req).log({ action: 'VIEW_TICKETS', entity: 'MaintenanceTicket', description: `Listed tickets (page ${page})` });
      res.json(paginatedResponse(tickets, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_TICKETS', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  // Non-admin: a tenant's own tickets only. GET /maintenance is
  // adminOrLandlord-gated and has no per-user filtering wired up, so a
  // Tenant had no way at all to list their own maintenance requests
  // before this - confirmed live, would have 403'd.
  myTickets = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { tickets, total } = await maintenanceService.getTickets(page, limit, req.user!.id, status);
      HELPERS(req).log({ action: 'VIEW_MY_TICKETS', entity: 'MaintenanceTicket', description: 'Viewed own maintenance tickets' });
      res.json(paginatedResponse(tickets, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_MY_TICKETS', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  assignedTickets = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const { tickets, total } = await maintenanceService.getAgentTickets(req.user!.id, page, limit, status);
      HELPERS(req).log({ action: 'VIEW_ASSIGNED_TICKETS', entity: 'MaintenanceTicket', description: 'Viewed tickets for assigned properties' });
      res.json(paginatedResponse(tickets, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_ASSIGNED_TICKETS', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const propertyId = String(req.body?.propertyId || '');
      const property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true, title: true } }) : null;
      if (!property) return res.status(400).json({ success: false, error: { message: 'A valid property is required' } });
      const role = req.user!.role.toLowerCase();
      if (role === 'tenant') {
        const relatedBooking = await prisma.booking.findFirst({ where: { userId: req.user!.id, propertyId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, select: { id: true } });
        if (!relatedBooking) return res.status(403).json({ success: false, error: { message: 'You can only report maintenance for a property connected to your tenancy' } });
      } else if (!(await hasPropertyAuthority(req.user!.id, role, property.ownerId, propertyId))) {
        return res.status(403).json({ success: false, error: { message: 'You do not manage this property' } });
      }
      const ticket = await maintenanceService.createTicket(req.body, req.user!.id);
      const recipients = await maintenanceService.getPropertyMaintenanceRecipients(propertyId, req.user!.id);
      await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), 'New maintenance request', `A maintenance request "${ticket.title}" was submitted for ${property.title}.`);
      HELPERS(req).log({ action: 'CREATE_TICKET', entity: 'MaintenanceTicket', entityId: ticket.id, description: `Created maintenance ticket for ${ticket.title}` });
      res.status(201).json(successResponse(ticket, 'Ticket created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const existing = await maintenanceService.getTicketById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      if (!(await canAccessTicket(req, existing))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this maintenance ticket' } });
      const ticket = await maintenanceService.updateTicket(String(req.params.id), req.body, req.user!.id, req.user!.role);
      if (ticket.propertyId) {
        const recipients = await maintenanceService.getPropertyMaintenanceRecipients(ticket.propertyId, ticket.userId);
        const statusText = req.body?.status ? ` Status: ${req.body.status.replace('_', ' ')}.` : '';
        await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), 'Maintenance request updated', `"${ticket.title}" was updated.${statusText}`);
      }
      HELPERS(req).log({ action: 'UPDATE_TICKET', entity: 'MaintenanceTicket', entityId: String(req.params.id), description: `Updated ticket ${req.params.id}` });
      res.json(successResponse(ticket, 'Ticket updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  resolve = async (req: AuthRequest, res: Response) => {
    try {
      const existing = await maintenanceService.getTicketById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      if (!(await canAccessTicket(req, existing))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this maintenance ticket' } });
      const ticket = await maintenanceService.updateTicket(String(req.params.id), { status: 'RESOLVED', resolutionNotes: req.body?.resolutionNotes }, req.user!.id, req.user!.role);
      if (ticket.propertyId) {
        const recipients = await maintenanceService.getPropertyMaintenanceRecipients(ticket.propertyId, ticket.userId);
        await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), 'Maintenance ready for confirmation', `Work on "${ticket.title}" was marked resolved and is ready for landlord or tenant confirmation.`);
      }
      HELPERS(req).log({ action: 'RESOLVE_TICKET', entity: 'MaintenanceTicket', entityId: String(req.params.id), description: `Resolved ticket ${req.params.id}` });
      res.json(successResponse(null, 'Ticket resolved'));
    } catch (error: any) { HELPERS(req).log({ action: 'RESOLVE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  approveCost = async (req: AuthRequest, res: Response) => {
    try {
      const existing = await maintenanceService.getTicketById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      const role = req.user!.role.toLowerCase();
      if (!existing.propertyId) return res.status(400).json({ success: false, error: { message: 'Ticket is not connected to a property' } });
      const property = await prisma.property.findUnique({ where: { id: existing.propertyId }, select: { ownerId: true, title: true } });
      const allowed = role === 'admin' || (role === 'landlord' && property?.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can approve an expensive repair' } });
      const approved = req.body?.approved === true;
      const ticket = await maintenanceService.approveCost(existing.id, req.user!.id, approved, req.body?.note);
      const recipients = await maintenanceService.getPropertyMaintenanceRecipients(existing.propertyId, existing.userId);
      await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), approved ? 'Repair cost approved' : 'Repair cost rejected', `The estimated repair cost for "${existing.title}" was ${approved ? 'approved' : 'rejected'}.`);
      HELPERS(req).log({ action: approved ? 'APPROVE_REPAIR_COST' : 'REJECT_REPAIR_COST', entity: 'MaintenanceTicket', entityId: existing.id, description: `Repair cost ${approved ? 'approved' : 'rejected'}` });
      res.json(successResponse(ticket, approved ? 'Repair cost approved' : 'Repair cost rejected'));
    } catch (error: any) { HELPERS(req).log({ action: 'REVIEW_REPAIR_COST', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  addPhotos = async (req: AuthRequest, res: Response) => {
    try {
      const existing = await maintenanceService.getTicketById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      if (!(await canAccessTicket(req, existing))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this maintenance ticket' } });
      const files = ((req as any).files || []) as Array<{ filename: string; originalname: string }>;
      const ticket = await maintenanceService.addAttachments(existing.id, req.user!.id, files);
      if (existing.propertyId) {
        const recipients = await maintenanceService.getPropertyMaintenanceRecipients(existing.propertyId, existing.userId);
        await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), 'Maintenance photographs added', `${files.length} photograph(s) were added to "${existing.title}".`);
      }
      HELPERS(req).log({ action: 'ADD_MAINTENANCE_PHOTOS', entity: 'MaintenanceTicket', entityId: existing.id, description: `Added ${files.length} maintenance photographs` });
      res.json(successResponse(ticket, 'Maintenance photographs uploaded'));
    } catch (error: any) { HELPERS(req).log({ action: 'ADD_MAINTENANCE_PHOTOS', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  confirmResolution = async (req: AuthRequest, res: Response) => {
    try {
      const existing = await maintenanceService.getTicketById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      if (existing.userId !== req.user!.id) return res.status(403).json({ success: false, error: { message: 'Only the tenant who submitted this request can confirm its resolution' } });
      if (existing.status !== 'RESOLVED') return res.status(400).json({ success: false, error: { message: 'Only a resolved ticket can be confirmed or returned for revision' } });
      const accepted = req.body?.accepted === true;
      const ticket = await maintenanceService.updateTicket(existing.id, { status: accepted ? 'CLOSED' : 'IN_PROGRESS', resolutionNotes: req.body?.note }, req.user!.id, req.user!.role);
      if (existing.propertyId) {
        const recipients = await maintenanceService.getPropertyMaintenanceRecipients(existing.propertyId, existing.userId);
        await notifyMaintenance(recipients.filter((id) => id !== req.user!.id), accepted ? 'Maintenance resolution confirmed' : 'Maintenance revision requested', `The tenant ${accepted ? 'confirmed' : 'requested further work on'} "${existing.title}".`);
      }
      HELPERS(req).log({ action: accepted ? 'CONFIRM_MAINTENANCE_RESOLUTION' : 'REQUEST_MAINTENANCE_REVISION', entity: 'MaintenanceTicket', entityId: existing.id });
      res.json(successResponse(ticket, accepted ? 'Resolution confirmed' : 'Revision requested'));
    } catch (error: any) { HELPERS(req).log({ action: 'REVIEW_MAINTENANCE_RESOLUTION', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const ticket = await maintenanceService.getTicketById(String(req.params.id));
      if (!ticket) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      if (!(await canAccessTicket(req, ticket))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this maintenance ticket' } });
      HELPERS(req).log({ action: 'VIEW_TICKET', entity: 'MaintenanceTicket', entityId: ticket.id, description: `Viewed ticket ${ticket.id}` });
      res.json(successResponse(ticket));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
