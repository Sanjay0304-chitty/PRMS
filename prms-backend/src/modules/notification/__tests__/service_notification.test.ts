import * as service from '../service_notification';

const findMany = jest.fn();
const updateMany = jest.fn();
const findUnique = jest.fn();
const deleteMany = jest.fn();
const create = jest.fn();
const findPreference = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    notification: {
      findMany: (...args: any[]) => findMany(...args),
      updateMany: (...args: any[]) => updateMany(...args),
      findUnique: (...args: any[]) => findUnique(...args),
      deleteMany: (...args: any[]) => deleteMany(...args),
      create: (...args: any[]) => create(...args),
    },
    userPreference: {
      findUnique: (...args: any[]) => findPreference(...args),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  findPreference.mockResolvedValue(null);
});

test('lists only the authenticated user notifications with an optional read filter', async () => {
  findMany.mockResolvedValue([]);
  await service.getNotifications('user-1', false);
  expect(findMany).toHaveBeenCalledWith({
    where: { userId: 'user-1', isRead: false },
    orderBy: { created_at: 'desc' },
  });
});

test('marks a notification read only when it belongs to the user', async () => {
  updateMany.mockResolvedValue({ count: 1 });
  findUnique.mockResolvedValue({ id: 'notification-1', userId: 'user-1', isRead: true });
  await service.markRead('user-1', 'notification-1');
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: 'notification-1', userId: 'user-1' },
    data: { isRead: true },
  });
});

test('does not reveal another user notification when marking it read', async () => {
  updateMany.mockResolvedValue({ count: 0 });
  await expect(service.markRead('user-2', 'notification-1')).rejects.toBeInstanceOf(service.NotificationNotFoundError);
  expect(findUnique).not.toHaveBeenCalled();
});

test('deletes a notification only when it belongs to the user', async () => {
  deleteMany.mockResolvedValue({ count: 1 });
  await service.deleteNotification('user-1', 'notification-1');
  expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'notification-1', userId: 'user-1' } });
});

test('rejects incomplete notifications', async () => {
  await expect(service.createNotification('user-1', { title: '', message: 'Message', type: 'system' }))
    .rejects.toThrow('title is required');
  await expect(service.createNotification('user-1', { title: 'Title', message: '', type: 'system' }))
    .rejects.toThrow('message is required');
  expect(create).not.toHaveBeenCalled();
});

test('trims and creates a valid unread notification', async () => {
  create.mockResolvedValue({ id: 'notification-1' });
  await service.createNotification('user-1', { title: ' Title ', message: ' Message ', type: ' system ' });
  expect(create).toHaveBeenCalledWith({
    data: { userId: 'user-1', title: 'Title', message: 'Message', type: 'system', isRead: false },
  });
});

test('does not create a maintenance notification when that preference is disabled', async () => {
  findPreference.mockResolvedValue({
    notificationsEnabled: true,
    maintenanceNotifications: false,
  });

  await expect(service.createNotification('agent-1', {
    title: 'Maintenance updated', message: 'Ticket updated', type: 'maintenance',
  })).resolves.toBeNull();
  expect(create).not.toHaveBeenCalled();
});

test('master notification preference blocks every notification type', async () => {
  findPreference.mockResolvedValue({ notificationsEnabled: false });

  await expect(service.createNotification('agent-1', {
    title: 'New message', message: 'You have a message', type: 'message',
  })).resolves.toBeNull();
  expect(create).not.toHaveBeenCalled();
});
