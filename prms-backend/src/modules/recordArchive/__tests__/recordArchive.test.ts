import { recordArchiveRoutes } from '../routes_recordArchive';
import { prisma } from '../../../db';
import { hasPropertyAuthority } from '../../../utils/propertyAuthority';

jest.mock('../../../db', () => ({ prisma: {
  viewingAppointment: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  maintenanceTicket: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  property: { findUnique: jest.fn(), findMany: jest.fn() },
  recordArchive: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
} }));
jest.mock('../../../utils/propertyAuthority', () => ({ hasPropertyAuthority: jest.fn() }));
jest.mock('../../admin/service_audit', () => ({ recordAudit: jest.fn() }));

function endpoint(kind: 'viewing' | 'maintenance', method: 'get' | 'patch') {
  const router = recordArchiveRoutes(kind);
  const layer = (router as any).stack.find((item: any) => item.route?.methods[method]);
  return layer.route.stack[0].handle;
}
function response() {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
const request = (role = 'Tenant', archived = true) => ({ user: { id: 'actor', role }, params: { id: 'record' }, body: { archived }, query: {} });

beforeEach(() => {
  jest.resetAllMocks();
  (prisma.property.findUnique as jest.Mock).mockResolvedValue({ ownerId: 'landlord' });
  (prisma.property.findMany as jest.Mock).mockResolvedValue([{ id: 'property', title: 'House' }]);
  (hasPropertyAuthority as jest.Mock).mockResolvedValue(false);
  (prisma.recordArchive.findMany as jest.Mock).mockResolvedValue([]);
  for (const model of [prisma.viewingAppointment, prisma.maintenanceTicket]) {
    (model.findMany as jest.Mock).mockResolvedValue([]);
    (model.count as jest.Mock).mockResolvedValue(0);
  }
});

test.each(['COMPLETED', 'CANCELLED', 'NO_SHOW'])('tenant can personally archive a %s viewing', async status => {
  (prisma.viewingAppointment.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'actor', propertyId: 'property', status });
  const res = response();
  await endpoint('viewing', 'patch')(request(), res);
  expect(prisma.recordArchive.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'actor', kind: 'viewing', recordId: 'record' } }));
  expect(res.status).not.toHaveBeenCalled();
});

test.each(['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'PROPOSED_ALTERNATE'])('cannot archive an active %s viewing', async status => {
  (prisma.viewingAppointment.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'actor', propertyId: 'property', status });
  const res = response();
  await endpoint('viewing', 'patch')(request(), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.recordArchive.upsert).not.toHaveBeenCalled();
});

test.each(['OPEN', 'IN_PROGRESS', 'RESOLVED'])('cannot archive a %s maintenance ticket', async status => {
  (prisma.maintenanceTicket.findUnique as jest.Mock).mockResolvedValue({ userId: 'actor', propertyId: 'property', status });
  const res = response();
  await endpoint('maintenance', 'patch')(request(), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('rejects guessing an unrelated ticket ID', async () => {
  (prisma.maintenanceTicket.findUnique as jest.Mock).mockResolvedValue({ userId: 'someone-else', propertyId: 'property', status: 'CLOSED' });
  const res = response();
  await endpoint('maintenance', 'patch')(request(), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(prisma.recordArchive.upsert).not.toHaveBeenCalled();
});

test.each(['Landlord', 'Agent'])('%s must have property authority', async role => {
  (prisma.maintenanceTicket.findUnique as jest.Mock).mockResolvedValue({ userId: 'tenant', propertyId: 'property', status: 'CLOSED' });
  const denied = response();
  await endpoint('maintenance', 'patch')(request(role), denied);
  expect(denied.status).toHaveBeenCalledWith(403);
  (hasPropertyAuthority as jest.Mock).mockResolvedValue(true);
  await endpoint('maintenance', 'patch')(request(role), response());
  expect(prisma.recordArchive.upsert).toHaveBeenCalled();
});

test('restore only deletes the actors archive marker and also works after reopening', async () => {
  (prisma.maintenanceTicket.findUnique as jest.Mock).mockResolvedValue({ userId: 'actor', status: 'OPEN' });
  await endpoint('maintenance', 'patch')(request('Tenant', false), response());
  expect(prisma.recordArchive.deleteMany).toHaveBeenCalledWith({ where: { userId: 'actor', kind: 'maintenance', recordId: 'record' } });
  expect(prisma.recordArchive.upsert).not.toHaveBeenCalled();
});

test.each(['Tenant', 'Landlord', 'Agent', 'Admin'])('%s lists enforce scopes and pagination', async role => {
  const req = { ...request(role), query: { page: '2', limit: '10' } };
  await endpoint('viewing', 'get')(req, response());
  const args = (prisma.viewingAppointment.findMany as jest.Mock).mock.calls[0][0];
  expect(args.skip).toBe(10);
  expect(args.take).toBe(10);
  if (role === 'Tenant') expect(args.where.AND[0]).toEqual({ tenantId: 'actor' });
  if (role === 'Landlord') expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'actor' } }));
  if (role === 'Agent') expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { agentProperties: { some: { agent: { userId: 'actor' } } } } }));
  if (role === 'Admin') expect(args.where.AND[0]).toEqual({});
});

test('archived lists intersect personal archive markers with closed state', async () => {
  (prisma.recordArchive.findMany as jest.Mock).mockResolvedValue([{ recordId: 'record', archivedAt: new Date() }]);
  await endpoint('maintenance', 'get')({ ...request(), query: { tab: 'archived' } }, response());
  const args = (prisma.maintenanceTicket.findMany as jest.Mock).mock.calls[0][0];
  expect(args.where.AND).toEqual([{ userId: 'actor' }, { id: { in: ['record'] } }, { status: 'CLOSED' }]);
  expect(prisma.recordArchive.findMany).toHaveBeenCalledWith({ where: { userId: 'actor', kind: 'maintenance' } });
});
