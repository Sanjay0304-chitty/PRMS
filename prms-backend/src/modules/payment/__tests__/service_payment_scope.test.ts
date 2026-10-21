import * as service from '../service_payment';

const findProperties = jest.fn();
const findAgent = jest.fn();
const findAssignments = jest.fn();
const findPayments = jest.fn();
const countPayments = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    property: { findMany: (...args: any[]) => findProperties(...args) },
    agent: { findUnique: (...args: any[]) => findAgent(...args) },
    agentProperty: { findMany: (...args: any[]) => findAssignments(...args) },
    payment: {
      findMany: (...args: any[]) => findPayments(...args),
      count: (...args: any[]) => countPayments(...args),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  findPayments.mockResolvedValue([]);
  countPayments.mockResolvedValue(0);
});

test('landlord payments are restricted to owned properties', async () => {
  findProperties.mockResolvedValue([{ id: 'owned-property' }]);

  await service.getLandlordPayments('landlord-1', 1, 10);

  expect(findProperties).toHaveBeenCalledWith({
    where: { ownerId: 'landlord-1' },
    select: { id: true },
  });
  expect(findPayments).toHaveBeenCalledWith(expect.objectContaining({
    where: { booking: { propertyId: { in: ['owned-property'] } } },
  }));
});

test('agent payment rows contain only limited assigned-property fields', async () => {
  findAgent.mockResolvedValue({ id: 'agent-profile' });
  findAssignments.mockResolvedValue([{ propertyId: 'assigned-property' }]);

  await service.getAgentPayments('agent-user', 1, 10);

  expect(findPayments).toHaveBeenCalledWith(expect.objectContaining({
    where: { booking: { propertyId: { in: ['assigned-property'] } } },
    select: {
      id: true,
      amount: true,
      status: true,
      due_date: true,
      paid_at: true,
      booking: { select: { property: { select: { id: true, title: true } } } },
    },
  }));
});
