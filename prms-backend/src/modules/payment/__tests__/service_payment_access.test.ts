import * as service from '../service_payment';

const agentFindUnique = jest.fn();
const assignmentFindMany = jest.fn();
const paymentFindMany = jest.fn();
const paymentCount = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    agent: { findUnique: (...args: any[]) => agentFindUnique(...args) },
    agentProperty: { findMany: (...args: any[]) => assignmentFindMany(...args) },
    payment: {
      findMany: (...args: any[]) => paymentFindMany(...args),
      count: (...args: any[]) => paymentCount(...args),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

test('returns no payments for an Agent without assignments', async () => {
  agentFindUnique.mockResolvedValue({ id: 'agent-record' });
  assignmentFindMany.mockResolvedValue([]);
  await expect(service.getAgentPayments('agent-user')).resolves.toEqual({ payments: [], total: 0 });
  expect(paymentFindMany).not.toHaveBeenCalled();
});

test('filters Agent payments by assigned property ids', async () => {
  agentFindUnique.mockResolvedValue({ id: 'agent-record' });
  assignmentFindMany.mockResolvedValue([{ propertyId: 'property-1' }, { propertyId: 'property-2' }]);
  paymentFindMany.mockResolvedValue([{ id: 'payment-1' }]);
  paymentCount.mockResolvedValue(1);
  await service.getAgentPayments('agent-user', 1, 10);
  expect(paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { booking: { propertyId: { in: ['property-1', 'property-2'] } } },
  }));
});
