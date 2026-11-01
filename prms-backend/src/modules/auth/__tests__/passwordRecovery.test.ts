jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('../../../db', () => ({ prisma: { user: { findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
import nodemailer from 'nodemailer';
import { prisma } from '../../../db';
import { generateOtpCode, verifyOtpCode, resetPassword } from '../service_auth';
const sendMail = jest.fn();
let sequence = 0;
let email: string;
let code: string;
beforeEach(() => {
  jest.restoreAllMocks(); jest.clearAllMocks();
  email = `recovery-${++sequence}@example.test`;
  process.env.SMTP_HOST = 'mail.example.test'; process.env.SMTP_FROM = 'PRMS <no-reply@example.test>';
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email, is_active: true });
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  sendMail.mockImplementation(async (mail: { text: string }) => { code = mail.text.match(/\b\d{6}\b/)![0]; });
});
test('emails the code without returning or logging it', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await generateOtpCode(email)).toBeUndefined();
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: email }));
  expect(code).toMatch(/^\d{6}$/); expect(log).not.toHaveBeenCalled();
});
test('reset without a recovery grant is rejected', async () => {
  await expect(resetPassword(email, 'StrongPassword123!', '000000')).rejects.toThrow();
  expect(prisma.user.update).not.toHaveBeenCalled();
});
test('incorrect codes are rejected', async () => {
  await generateOtpCode(email);
  await expect(verifyOtpCode(email, '000000')).rejects.toThrow('Invalid verification code');
});
test('verifying a code does not authorise other callers using a wrong code', async () => {
  await generateOtpCode(email); await verifyOtpCode(email, code);
  await expect(resetPassword(email, 'StrongPassword123!', '000000')).rejects.toThrow();
  expect(prisma.user.update).not.toHaveBeenCalled();
});
test('a grant permits one reset and revokes the stored refresh token', async () => {
  await generateOtpCode(email);
  const { resetToken } = await verifyOtpCode(email, code);
  expect(resetToken).toHaveLength(43);
  await resetPassword(email, 'StrongPassword123!', resetToken);
  expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { passwordHash: 'hashed-password', refreshToken: null } });
  await expect(resetPassword(email, 'OtherPassword123!', resetToken)).rejects.toThrow();
});
test('a grant cannot reset another email account', async () => {
  await generateOtpCode(email); const { resetToken } = await verifyOtpCode(email, code);
  await expect(resetPassword('other@example.test', 'StrongPassword123!', resetToken)).rejects.toThrow();
});
test('a verified code cannot issue another grant', async () => {
  await generateOtpCode(email); await verifyOtpCode(email, code);
  await expect(verifyOtpCode(email, code)).rejects.toThrow();
});
test('five incorrect guesses invalidate the code', async () => {
  await generateOtpCode(email); const original = code;
  for (let i = 0; i < 5; i++) await expect(verifyOtpCode(email, '000000')).rejects.toThrow();
  await expect(verifyOtpCode(email, original)).rejects.toThrow();
});
test('expired grants cannot reset passwords', async () => {
  await generateOtpCode(email); const { resetToken } = await verifyOtpCode(email, code);
  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60000);
  await expect(resetPassword(email, 'StrongPassword123!', resetToken)).rejects.toThrow();
});
test('resending invalidates a previous grant', async () => {
  await generateOtpCode(email); const { resetToken } = await verifyOtpCode(email, code);
  await generateOtpCode(email);
  await expect(resetPassword(email, 'StrongPassword123!', resetToken)).rejects.toThrow();
});
test('unknown and suspended accounts receive no mail', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  await expect(generateOtpCode(email)).resolves.toBeUndefined();
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', email, is_active: false });
  await expect(generateOtpCode(email)).resolves.toBeUndefined(); expect(sendMail).not.toHaveBeenCalled();
});
test('missing SMTP settings fail without claiming delivery', async () => {
  delete process.env.SMTP_HOST;
  await expect(generateOtpCode(email)).rejects.toThrow('not configured'); expect(sendMail).not.toHaveBeenCalled();
});
test('failed delivery invalidates the pending code', async () => {
  sendMail.mockRejectedValueOnce(new Error('SMTP offline'));
  await expect(generateOtpCode(email)).rejects.toThrow('Unable to deliver');
  await expect(verifyOtpCode(email, '000000')).rejects.toThrow('invalid or expired');
});
