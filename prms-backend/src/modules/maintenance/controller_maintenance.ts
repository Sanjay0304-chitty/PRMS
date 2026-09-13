import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as maintenanceService from './service_maintenance';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

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
      const ticket = await maintenanceService.createTicket(req.body, req.user!.id);
      HELPERS(req).log({ action: 'CREATE_TICKET', entity: 'MaintenanceTicket', entityId: ticket.id, description: `Created maintenance ticket for ${ticket.title}` });
      res.status(201).json(successResponse(ticket, 'Ticket created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const ticket = await maintenanceService.updateTicket(String(req.params.id), req.body);
      HELPERS(req).log({ action: 'UPDATE_TICKET', entity: 'MaintenanceTicket', entityId: req.params.id, description: `Updated ticket ${req.params.id}` });
      res.json(successResponse(ticket, 'Ticket updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  resolve = async (req: AuthRequest, res: Response) => {
    try {
      await maintenanceService.resolveTicket(String(req.params.id));
      HELPERS(req).log({ action: 'RESOLVE_TICKET', entity: 'MaintenanceTicket', entityId: req.params.id, description: `Resolved ticket ${req.params.id}` });
      res.json(successResponse(null, 'Ticket resolved'));
    } catch (error: any) { HELPERS(req).log({ action: 'RESOLVE_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const ticket = await maintenanceService.getTicketById(String(req.params.id));
      if (!ticket) return res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
      HELPERS(req).log({ action: 'VIEW_TICKET', entity: 'MaintenanceTicket', entityId: ticket.id, description: `Viewed ticket ${ticket.id}` });
      res.json(successResponse(ticket));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_TICKET', entity: 'MaintenanceTicket', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
