import { MaintenanceController } from '../controller_maintenance';
import * as maintenanceService from '../service_maintenance';
import { createNotification } from '../../admin/service_admin';

jest.mock('../service_maintenance');
jest.mock('../../admin/service_admin', () => ({ createNotification: jest.fn() }));
jest.mock('../../admin/service_audit', () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../utils/propertyAuthority', () => ({ hasPropertyAuthority: jest.fn().mockResolvedValue(true) }));
jest.mock('../../../db', () => ({
  prisma: {
    property: { findUnique: jest.fn().mockResolvedValue({ id: 'property-1', ownerId: 'landlord-1', title: 'Maple Residence' }) },
    booking: { findFirst: jest.fn() },
  },
}));

function response() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

test('creating a maintenance request notifies the landlord and assigned agent', async () => {
  (maintenanceService.createTicket as jest.Mock).mockResolvedValue({
    id: 'ticket-1', propertyId: 'property-1', userId: 'tenant-1', title: 'Leaking sink',
  });
  (maintenanceService.getPropertyMaintenanceRecipients as jest.Mock).mockResolvedValue(['tenant-1', 'landlord-1', 'agent-1']);
  (createNotification as jest.Mock).mockResolvedValue({});

  const req: any = {
    body: { propertyId: 'property-1', title: 'Leaking sink', description: 'Water below sink' },
    user: { id: 'tenant-1', email: 'tenant@prms.com', role: 'Landlord' },
    headers: {}, socket: {}, method: 'POST', originalUrl: '/maintenance',
  };
  const res = response();

  await new MaintenanceController().create(req, res);

  expect(createNotification).toHaveBeenCalledTimes(2);
  expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'landlord-1', type: 'maintenance' }));
  expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'agent-1', type: 'maintenance' }));
  expect(res.status).toHaveBeenCalledWith(201);
});
