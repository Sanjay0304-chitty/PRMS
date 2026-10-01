import * as service from '../service_viewing';

const viewingFindUnique = jest.fn();
const viewingFindMany = jest.fn();
const viewingUpdate = jest.fn();
const assignmentFindMany = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    viewingAppointment: {
      findUnique: (...args: any[]) => viewingFindUnique(...args),
      findMany: (...args: any[]) => viewingFindMany(...args),
      update: (...args: any[]) => viewingUpdate(...args),
    },
    agentProperty: { findMany: (...args: any[]) => assignmentFindMany(...args) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  viewingUpdate.mockResolvedValue({ id: 'viewing-1' });
});

test('does not accept a viewing whose requested time has passed', async () => {
  viewingFindUnique.mockResolvedValue({ id: 'viewing-1', status: 'REQUESTED', preferredTime: new Date(Date.now() - 1000) });
  await expect(service.accept('viewing-1', 'agent-user')).rejects.toThrow('past viewing time');
  expect(viewingUpdate).not.toHaveBeenCalled();
});

test('rejects an invalid proposed alternate time', async () => {
  await expect(service.proposeAlternate('viewing-1', 'agent-user', 'not-a-date')).rejects.toThrow('valid time in the future');
  expect(viewingFindUnique).not.toHaveBeenCalled();
});

test('does not complete a viewing before its scheduled time', async () => {
  viewingFindUnique.mockResolvedValue({ id: 'viewing-1', status: 'CONFIRMED', preferredTime: new Date(Date.now() + 60_000) });
  await expect(service.markCompleted('viewing-1', 'agent-user')).rejects.toThrow('before its scheduled time');
  expect(viewingUpdate).not.toHaveBeenCalled();
});

test('enforces a 15-minute grace period before marking no-show', async () => {
  viewingFindUnique.mockResolvedValue({ id: 'viewing-1', status: 'CONFIRMED', preferredTime: new Date(Date.now() - 5 * 60_000) });
  await expect(service.markNoShow('viewing-1', 'agent-user')).rejects.toThrow('Wait at least 15 minutes');
  expect(viewingUpdate).not.toHaveBeenCalled();
});

test('returns the owner and assigned Agent users as viewing managers without duplicates', async () => {
  assignmentFindMany.mockResolvedValue([
    { agent: { userId: 'agent-1' } },
    { agent: { userId: 'owner-1' } },
  ]);
  await expect(service.getPropertyManagerUserIds('property-1', 'owner-1')).resolves.toEqual(['owner-1', 'agent-1']);
});
