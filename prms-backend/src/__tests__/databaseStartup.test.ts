const mockClient = { $connect: jest.fn(), $queryRaw: jest.fn(), role: { findFirst: jest.fn() } };
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockClient) }));
jest.mock('@prisma/adapter-mariadb', () => ({ PrismaMariaDb: jest.fn() }));
jest.mock('../databaseConnection', () => ({ databaseOptions: () => ({}) }));
import { bootstrap } from '../db';

beforeEach(() => jest.clearAllMocks());

test('startup checks connectivity and schema without creating or resetting accounts', async () => {
  await bootstrap();
  expect(mockClient.$connect).toHaveBeenCalledTimes(1);
  expect(mockClient.$queryRaw).toHaveBeenCalledTimes(1);
  expect(mockClient.role.findFirst).toHaveBeenCalledWith({ select: { id: true } });
});

test('database connectivity failure prevents startup', async () => {
  mockClient.$connect.mockRejectedValueOnce(new Error('offline'));
  await expect(bootstrap()).rejects.toThrow('offline');
  expect(mockClient.role.findFirst).not.toHaveBeenCalled();
});

test('missing database schema prevents startup', async () => {
  mockClient.role.findFirst.mockRejectedValueOnce(new Error('roles missing'));
  await expect(bootstrap()).rejects.toThrow('roles missing');
});
