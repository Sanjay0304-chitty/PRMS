jest.mock('../../db', () => ({ prisma: {
  user: { findUnique: jest.fn() }, maintenanceAttachment: { findFirst: jest.fn() },
  property: { findUnique: jest.fn() }, agent: { findUnique: jest.fn() }, agentProperty: { findUnique: jest.fn() },
} }));
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';
import { env } from '../../config';
import { protectMaintenance, authenticateFileUser } from '../fileAuth';
import { isAllowedOrigin } from '../corsPolicy';
async function request(role: string, id: string, token = true) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id, is_active: true, UserRole: [{ role: { name: role } }] });
  const req: any = { path: '/photo.jpg', headers: token ? { authorization: `Bearer ${jwt.sign({ userId: id }, env.JWT_SECRET)}` } : {} };
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  const next = jest.fn(); await protectMaintenance(req, res, next); return { res, next };
}
beforeEach(() => {
  jest.clearAllMocks();
  (prisma.maintenanceAttachment.findFirst as jest.Mock).mockResolvedValue({ ticket: { userId: 'tenant-1', propertyId: 'property-1' } });
  (prisma.property.findUnique as jest.Mock).mockResolvedValue({ id: 'property-1', ownerId: 'landlord-1' });
  (prisma.agent.findUnique as jest.Mock).mockResolvedValue({ id: 'agent-record' });
  (prisma.agentProperty.findUnique as jest.Mock).mockResolvedValue(null);
});
test.each([['Tenant', 'tenant-1'], ['Landlord', 'landlord-1'], ['Admin', 'admin-1']])('%s can open an authorised attachment', async (role, id) => {
  expect((await request(role, id)).next).toHaveBeenCalled();
});
test('assigned agent can open the attachment', async () => {
  (prisma.agentProperty.findUnique as jest.Mock).mockResolvedValue({ propertyId: 'property-1' });
  expect((await request('Agent', 'agent-1')).next).toHaveBeenCalled();
});
test.each([['Tenant', 'other-tenant'], ['Landlord', 'other-owner'], ['Agent', 'unassigned-agent']])('%s cannot open an unrelated attachment', async (role, id) => {
  const { res, next } = await request(role, id);
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
test('anonymous access is denied', async () => {
  expect((await request('Tenant', 'tenant-1', false)).res.status).toHaveBeenCalledWith(401);
});
test('URL tokens are not accepted as file credentials', async () => {
  const req: any = { headers: {}, query: { token: jwt.sign({ userId: 'tenant-1' }, env.JWT_SECRET) } };
  expect(await authenticateFileUser(req)).toBeNull();
});
test('CORS accepts configured origins and rejects unrelated websites', () => {
  const allowed = ['http://localhost:5173'];
  expect(isAllowedOrigin(undefined, allowed)).toBe(true);
  expect(isAllowedOrigin(allowed[0], allowed)).toBe(true);
  expect(isAllowedOrigin('https://unrelated.example', allowed)).toBe(false);
  expect(isAllowedOrigin('http://localhost:5173.unrelated.example', allowed)).toBe(false);
});
