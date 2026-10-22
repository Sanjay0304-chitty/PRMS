import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';
import { paginatedResponse, successResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

type Kind = 'viewing' | 'maintenance';
const finishedViewings = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

// Mounted behind authentication in both record routers. Archive state belongs
// to the actor; it never changes the shared record's status or participants.
export function recordArchiveRoutes(kind: Kind) {
  const router = Router();
  const isViewing = kind === 'viewing';
  router.get('/records', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role.toLowerCase();
      const page = Math.max(1, parseInt(String(req.query.page)) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 10));
      const tab = String(req.query.tab || 'all');
      const where: any = {};
      if (role === 'tenant') where[isViewing ? 'tenantId' : 'userId'] = userId;
      else if (role === 'landlord' || role === 'agent') {
        const properties = await prisma.property.findMany({
          where: role === 'landlord' ? { ownerId: userId } : { agentProperties: { some: { agent: { userId } } } },
          select: { id: true },
        });
        where.propertyId = { in: properties.map(p => p.id) };
      } else if (role !== 'admin') return res.status(403).json({ error: { message: 'Access denied' } });

      const archives = await prisma.recordArchive.findMany({ where: { userId, kind } });
      const archiveIds = archives.map(a => a.recordId);
      // A closed ticket may subsequently be reopened by another participant.
      // Such tickets return to active lists automatically, retaining history.
      const terminal = isViewing ? { status: { in: finishedViewings } } : { status: 'CLOSED' };
      const archivedWhere = { AND: [where, { id: { in: archiveIds } }, terminal] };
      const visibleWhere: any = { AND: [where, { NOT: { AND: [{ id: { in: archiveIds } }, terminal] } }] };
      const filtered: any = tab === 'archived' ? archivedWhere : visibleWhere;
      if (tab !== 'all' && tab !== 'archived') {
        if (isViewing && ['active', 'history'].includes(tab)) filtered.AND.push(tab === 'history' ? terminal : { NOT: terminal });
        else if (!isViewing && ['open', 'in_progress', 'resolved', 'closed'].includes(tab)) filtered.AND.push({ status: tab.toUpperCase() });
        else return res.status(400).json({ error: { message: 'Invalid status filter' } });
      }
      const include = isViewing
        ? { property: { select: { id: true, title: true } }, tenant: { select: { id: true, full_name: true, email: true } } }
        : { user: { select: { id: true, full_name: true, email: true } }, attachments: true };
      const model: any = isViewing ? prisma.viewingAppointment : prisma.maintenanceTicket;
      const [rows, total, archivedCount] = await Promise.all([
        model.findMany({ where: filtered, include, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
        model.count({ where: filtered }), model.count({ where: archivedWhere }),
      ]);
      const properties = !isViewing ? await prisma.property.findMany({ where: { id: { in: rows.map((r: any) => r.propertyId).filter(Boolean) } }, select: { id: true, title: true } }) : [];
      const data = rows.map((row: any) => ({ ...row,
        ...(!isViewing ? { property: properties.find(p => p.id === row.propertyId) || null } : {}),
        archivedAt: tab === 'archived' ? archives.find(a => a.recordId === row.id)?.archivedAt : null,
      }));
      res.json({ ...paginatedResponse(data, page, limit, total), archivedCount });
    } catch (error: any) { res.status(500).json({ error: { message: error.message } }); }
  });

  router.patch('/:id/archive', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const recordId = String(req.params.id);
      if (typeof req.body?.archived !== 'boolean') return res.status(400).json({ error: { message: 'Archived must be true or false' } });
      const model: any = isViewing ? prisma.viewingAppointment : prisma.maintenanceTicket;
      const record = await model.findUnique({ where: { id: recordId } });
      if (!record) return res.status(404).json({ error: { message: 'Record not found' } });
      const property = record.propertyId ? await prisma.property.findUnique({ where: { id: record.propertyId }, select: { ownerId: true } }) : null;
      const owner = record[isViewing ? 'tenantId' : 'userId'] === userId;
      const role = req.user!.role.toLowerCase();
      const allowed = owner || role === 'admin' || (property && await hasPropertyAuthority(userId, role, property.ownerId, record.propertyId));
      if (!allowed) return res.status(403).json({ error: { message: 'You do not have access to this record' } });
      const archived = req.body.archived;
      if (archived && !(isViewing ? finishedViewings.includes(record.status) : record.status === 'CLOSED')) {
        return res.status(400).json({ error: { message: isViewing ? 'Only cancelled, completed or no-show viewings can be archived' : 'Only closed maintenance tickets can be archived' } });
      }
      const key = { userId, kind, recordId };
      if (archived) await prisma.recordArchive.upsert({ where: { userId_kind_recordId: key }, create: key, update: {} });
      else await prisma.recordArchive.deleteMany({ where: key });
      await recordAudit({ userId, userRole: req.user!.role, module: isViewing ? 'Viewing' : 'Maintenance', action: archived ? 'ARCHIVE_RECORD' : 'RESTORE_RECORD', entity: isViewing ? 'ViewingAppointment' : 'MaintenanceTicket', entityId: recordId, description: 'Updated personal archive visibility' });
      res.json(successResponse(null, archived ? 'Archived from your list' : 'Restored to your list'));
    } catch (error: any) { res.status(400).json({ error: { message: error.message } }); }
  });
  return router;
}
