import * as service from '../service_auth';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const findPreference = jest.fn();
const upsertPreference = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    userPreference: {
      findUnique: (...args: any[]) => findPreference(...args),
      upsert: (...args: any[]) => upsertPreference(...args),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

test('returns enabled defaults when an account has not saved preferences', async () => {
  findPreference.mockResolvedValue(null);
  await expect(service.getUserPreferences('agent-1')).resolves.toEqual(expect.objectContaining({
    userId: 'agent-1',
    notificationsEnabled: true,
    viewingNotifications: true,
    applicationNotifications: true,
    maintenanceNotifications: true,
    messageNotifications: true,
  }));
});

test('updates only recognized preference fields for the authenticated user', async () => {
  upsertPreference.mockResolvedValue({ userId: 'agent-1', messageNotifications: false });
  await service.updateUserPreferences('agent-1', {
    messageNotifications: false,
    unrelatedSetting: true,
  });
  expect(upsertPreference).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: 'agent-1' },
    update: { messageNotifications: false },
  }));
});

test('rejects invalid preference values', async () => {
  await expect(service.updateUserPreferences('agent-1', { maintenanceNotifications: 'yes' }))
    .rejects.toThrow('must be true or false');
  expect(upsertPreference).not.toHaveBeenCalled();
});
