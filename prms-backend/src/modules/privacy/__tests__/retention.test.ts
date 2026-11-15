import { updatePolicy, executeRetentionCleanup } from '../service_privacy';
import { prisma } from '../../../db';

jest.mock('../../../db', () => ({ prisma: { retentionPolicy: { update: jest.fn() } } }));

beforeEach(() => jest.clearAllMocks());

test.each([0, -1, 1.5, NaN, Infinity, 2147483648])('rejects invalid retention days %s before writing', async days => {
  await expect(updatePolicy('notifications', days)).rejects.toThrow('positive whole number');
  expect(prisma.retentionPolicy.update).not.toHaveBeenCalled();
});

test('saves valid whole-day settings without disposing records', async () => {
  (prisma.retentionPolicy.update as jest.Mock).mockResolvedValue({ retentionDays: 90 });
  await expect(updatePolicy('notifications', 90)).resolves.toEqual({ retentionDays: 90 });
  expect(prisma.retentionPolicy.update).toHaveBeenCalledWith({ where: { category: 'notifications' }, data: { retentionDays: 90 } });
});

test('permanent cleanup remains blocked', async () => {
  await expect(executeRetentionCleanup()).rejects.toThrow('Permanent retention cleanup is disabled');
  expect(prisma.retentionPolicy.update).not.toHaveBeenCalled();
});
