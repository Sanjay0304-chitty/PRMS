import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as auditService from './service_audit';
import { paginatedResponse } from '../../utils/response';

export class AuditController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { action, level, userId, username, module, entity, status, search, sort, dateFrom, dateTo } = req.query as any;
      const orderByCol = sort === 'user' ? 'username' : sort === 'module' ? 'module' : sort === 'action' ? 'action' : 'created_at';
      const orderByDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
      const { logs, total } = await auditService.getAuditLogs(page, limit, {
        action, level, userId, username, module, entity, status, search, dateFrom, dateTo,
        orderBy: { [orderByCol]: orderByDir },
      });
      res.json(paginatedResponse(logs, page, limit, total));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const log = await auditService.getAuditLogById(String(req.params.id));
      if (!log) return res.status(404).json({ success: false, error: { message: 'Log not found' } });
      res.json({ success: true, data: log });
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const { action, details, level, resourceId, module, entity, entityId, description } = req.body;
      const data = await auditService.createAuditLog({
        userId: req.user!.id,
        username: req.user!.email,
        userRole: req.user!.role,
        module: module || 'Admin',
        action: action || 'MANUAL',
        entity: entity || 'System',
        entityId: entityId || resourceId,
        description: details,
        level: level || 'info',
      });
      res.status(201).json({ success: true, data });
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}

export const auditController = new AuditController();