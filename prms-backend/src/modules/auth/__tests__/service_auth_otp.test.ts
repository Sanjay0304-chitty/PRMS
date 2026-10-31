jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import { generateOtpCode, verifyOtpCode, resetPassword } from '../service_auth';
import { prisma } from '../../../db';

jest.mock('../../../db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
}));

describe('Auth OTP and Secure Password Reset', () => {
  const testEmail = 'security-test@prms.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generateOtpCode creates OTP and logs notification', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email: testEmail });

    const code = await generateOtpCode(testEmail);
    expect(code).toBeDefined();
    expect(code).toHaveLength(6);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'security_alert',
        }),
      })
    );
  });

  test('verifyOtpCode rejects invalid code', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email: testEmail });
    await generateOtpCode(testEmail);

    await expect(verifyOtpCode(testEmail, '000000')).rejects.toThrow('Invalid verification code.');
  });

  test('verifyOtpCode validates correct code', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email: testEmail });
    const code = await generateOtpCode(testEmail);

    const verified = await verifyOtpCode(testEmail, code);
    expect(verified).toBe(true);
  });

  test('resetPassword rejects if OTP is not verified', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'unverified@test.com' });

    await expect(resetPassword('unverified@test.com', 'newPassword123', '999999')).rejects.toThrow(
      'No active password reset session'
    );
  });

  test('resetPassword succeeds with valid verified OTP and hashes password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email: testEmail });
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-1', passwordHash: 'hashed-password-123' });

    const code = await generateOtpCode(testEmail);
    await verifyOtpCode(testEmail, code);

    const res = await resetPassword(testEmail, 'newStrongPassword123', code);
    expect(res).toBeDefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashed-password-123' },
      })
    );
  });
});
