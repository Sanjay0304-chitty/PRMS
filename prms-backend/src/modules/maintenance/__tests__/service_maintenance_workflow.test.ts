import * as service from '../service_maintenance';

const ticketFindUnique = jest.fn();
const ticketUpdate = jest.fn();
const propertyFindUnique = jest.fn();
const assignmentFindMany = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    maintenanceTicket: {
      findUnique: (...args: any[]) => ticketFindUnique(...args),
      update: (...args: any[]) => ticketUpdate(...args),
    },
    property: { findUnique: (...args: any[]) => propertyFindUnique(...args) },
    agentProperty: { findMany: (...args: any[]) => assignmentFindMany(...args) },
  },
}));

const ticket = {
  id: 'ticket-1',
  userId: 'tenant-1',
  propertyId: 'property-1',
  status: 'IN_PROGRESS',
  estimatedCost: null,
  approvalStatus: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  ticketFindUnique.mockResolvedValue({ ...ticket });
  ticketUpdate.mockImplementation(async ({ data }: any) => ({ ...ticket, ...data }));
});

test('an expensive repair requires landlord approval before resolution', async () => {
  ticketFindUnique.mockResolvedValue({ ...ticket, estimatedCost: 1500, approvalStatus: 'PENDING' });

  await expect(service.updateTicket('ticket-1', { status: 'RESOLVED' }, 'agent-1', 'Agent'))
    .rejects.toThrow('require landlord approval');

  expect(ticketUpdate).not.toHaveBeenCalled();
});

test('an approved expensive repair can be marked ready for confirmation', async () => {
  ticketFindUnique.mockResolvedValue({ ...ticket, estimatedCost: 1500, approvalStatus: 'APPROVED' });

  await service.updateTicket('ticket-1', { status: 'RESOLVED', resolutionNotes: 'Repair completed' }, 'agent-1', 'Agent');

  expect(ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'RESOLVED', resolved_at: expect.any(Date) }),
  }));
});

test('an assigned agent cannot close a resolved ticket', async () => {
  ticketFindUnique.mockResolvedValue({ ...ticket, status: 'RESOLVED' });

  await expect(service.updateTicket('ticket-1', { status: 'CLOSED' }, 'agent-1', 'Agent'))
    .rejects.toThrow('tenant, property owner');
});

test('agent updates cannot forge landlord approval fields', async () => {
  await service.updateTicket('ticket-1', {
    inspectionNotes: 'Leak inspected',
    approvalStatus: 'APPROVED',
    approvedById: 'agent-1',
  } as any, 'agent-1', 'Agent');

  const data = ticketUpdate.mock.calls[0][0].data;
  expect(data.inspectionNotes).toBe('Leak inspected');
  expect(data.approvalStatus).toBeUndefined();
  expect(data.approvedById).toBeUndefined();
});

test('maintenance recipients include tenant, owner and assigned agents without duplicates', async () => {
  propertyFindUnique.mockResolvedValue({ ownerId: 'landlord-1' });
  assignmentFindMany.mockResolvedValue([
    { agent: { userId: 'agent-1' } },
    { agent: { userId: 'tenant-1' } },
  ]);

  await expect(service.getPropertyMaintenanceRecipients('property-1', 'tenant-1'))
    .resolves.toEqual(['tenant-1', 'landlord-1', 'agent-1']);
});
