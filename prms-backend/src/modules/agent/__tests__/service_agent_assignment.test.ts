import * as service from '../service_agent';

const agentFindUnique = jest.fn();
const propertyFindUnique = jest.fn();
const assignmentFindUnique = jest.fn();
const assignmentCreate = jest.fn();
const assignmentDelete = jest.fn();
const assignmentFindMany = jest.fn();
const propertyCount = jest.fn();
const bookingCount = jest.fn();
const viewingCount = jest.fn();
const maintenanceCount = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    agent: { findUnique: (...args: any[]) => agentFindUnique(...args) },
    property: {
      findUnique: (...args: any[]) => propertyFindUnique(...args),
      count: (...args: any[]) => propertyCount(...args),
    },
    booking: { count: (...args: any[]) => bookingCount(...args) },
    viewingAppointment: { count: (...args: any[]) => viewingCount(...args) },
    maintenanceTicket: { count: (...args: any[]) => maintenanceCount(...args) },
    agentProperty: {
      findUnique: (...args: any[]) => assignmentFindUnique(...args),
      findMany: (...args: any[]) => assignmentFindMany(...args),
      create: (...args: any[]) => assignmentCreate(...args),
      delete: (...args: any[]) => assignmentDelete(...args),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  agentFindUnique.mockResolvedValue({ id: 'agent-record' });
  propertyFindUnique.mockResolvedValue({ id: 'property-1', ownerId: 'landlord-1' });
  assignmentFindUnique.mockResolvedValue(null);
  assignmentCreate.mockResolvedValue({ agentId: 'agent-record', propertyId: 'property-1' });
});

test('prevents an Agent from assigning a property', async () => {
  await expect(service.assignProperty('agent-record', 'property-1', 'agent-user', 'Agent'))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(assignmentCreate).not.toHaveBeenCalled();
});

test('prevents a Landlord from assigning another Landlord property', async () => {
  await expect(service.assignProperty('agent-record', 'property-1', 'landlord-2', 'Landlord'))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(assignmentCreate).not.toHaveBeenCalled();
});

test('allows the owning Landlord to assign an Agent', async () => {
  await expect(service.assignProperty('agent-record', 'property-1', 'landlord-1', 'Landlord'))
    .resolves.toEqual({ agentId: 'agent-record', propertyId: 'property-1' });
  expect(assignmentCreate).toHaveBeenCalled();
});

test('allows an Admin to assign an Agent', async () => {
  await service.assignProperty('agent-record', 'property-1', 'admin-user', 'Admin');
  expect(assignmentCreate).toHaveBeenCalled();
});

test('checks ownership before removing an assignment', async () => {
  assignmentFindUnique.mockResolvedValue({ agentId: 'agent-record', propertyId: 'property-1' });
  await expect(service.unassignProperty('agent-record', 'property-1', 'landlord-2', 'Landlord'))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(assignmentDelete).not.toHaveBeenCalled();
});

test('dashboard counts are scoped to assigned property ids', async () => {
  assignmentFindMany.mockResolvedValue([{ propertyId: 'property-1' }, { propertyId: 'property-2' }]);
  propertyCount.mockResolvedValue(1);
  bookingCount.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
  viewingCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
  maintenanceCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

  const result = await service.getAgentDashboard('agent-user');

  expect(result).toMatchObject({ assignedProperties: 2, rentedProperties: 1, activeTenancies: 1, applicationsToReview: 2, upcomingViewings: 3, openMaintenance: 2 });
  expect(propertyCount).toHaveBeenCalledWith({ where: { id: { in: ['property-1', 'property-2'] }, status: 'RENTED' } });
  expect(bookingCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ propertyId: { in: ['property-1', 'property-2'] } }) }));
});
