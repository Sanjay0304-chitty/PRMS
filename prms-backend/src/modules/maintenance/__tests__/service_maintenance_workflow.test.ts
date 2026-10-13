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
};

beforeEach(() => {
  jest.clearAllMocks();
  ticketFindUnique.mockResolvedValue({ ...ticket });
  ticketUpdate.mockImplementation(async ({ data }: any) => ({ ...ticket, ...data }));
});

test('an assigned agent can add a note and mark work resolved', async () => {
  await service.updateTicket('ticket-1', { status: 'RESOLVED', inspectionNotes: 'Repair completed' }, 'Agent');

  expect(ticketUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'RESOLVED', inspectionNotes: 'Repair completed', resolved_at: expect.any(Date) }),
  }));
});

test('an assigned agent cannot close a resolved ticket', async () => {
  ticketFindUnique.mockResolvedValue({ ...ticket, status: 'RESOLVED' });

  await expect(service.updateTicket('ticket-1', { status: 'CLOSED' }, 'Agent'))
    .rejects.toThrow('property owner');
});

test('agent updates ignore unknown private fields', async () => {
  await service.updateTicket('ticket-1', {
    inspectionNotes: 'Leak inspected',
    privateWorkflowField: 'forged value',
  } as any, 'Agent');

  const data = ticketUpdate.mock.calls[0][0].data;
  expect(data.inspectionNotes).toBe('Leak inspected');
  expect(data.privateWorkflowField).toBeUndefined();
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
