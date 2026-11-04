import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import tls from 'node:tls';
import { prisma } from '../db';
import { isStrongPassword } from '../utils/validators';

const entries = new Map<string, { codeHash: string; salt: string; expiresAt: number; attempts: number; grantHash?: string }>();
const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (email: string) => email.trim().toLowerCase();
const equal = (a: string, b: string) => crypto.timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));

export async function generateOtpCode(email: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || (process.env.SMTP_USER && !process.env.SMTP_PASSWORD)) {
    throw new Error('Password recovery email is not configured. Please contact the administrator.');
  }
  const key = normalize(email);
  const user = await prisma.user.findUnique({ where: { email: key } });
  // Do not reveal whether an address belongs to an account.
  if (!user || !user.is_active) return;
  for (const [address, entry] of entries) if (entry.expiresAt <= Date.now()) entries.delete(address);
  if (entries.size >= 10000 && !entries.has(key)) throw new Error('Please try password recovery again later.');
  const code = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const entry = { codeHash: digest(`${salt}:${code}`), salt, expiresAt: Date.now() + 5 * 60000, attempts: 0 };
  entries.set(key, entry);
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      requireTLS: process.env.NODE_ENV === 'production',
      // Honour OS-trusted certificate authorities without disabling TLS checks.
      tls: typeof tls.getCACertificates === 'function' ? {
        ca: [...tls.getCACertificates('default'), ...tls.getCACertificates('system')],
      } : undefined,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: key,
      subject: 'Your PRMS password reset code',
      text: `Your PRMS password reset code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`,
    });
  } catch {
    if (entries.get(key) === entry) entries.delete(key);
    throw new Error('Unable to deliver the recovery email. Please try again later or contact the administrator.');
  }
}

export async function verifyOtpCode(email: string, code: string) {
  const key = normalize(email);
  const entry = entries.get(key);
  if (!entry || entry.expiresAt <= Date.now() || entry.grantHash) {
    if (entry && entry.expiresAt <= Date.now()) entries.delete(key);
    throw new Error('Verification code is invalid or expired. Request a new code.');
  }
  entry.attempts++;
  if (!equal(entry.codeHash, digest(`${entry.salt}:${String(code).trim()}`))) {
    if (entry.attempts >= 5) entries.delete(key);
    throw new Error('Invalid verification code.');
  }
  const resetToken = crypto.randomBytes(32).toString('base64url');
  entry.grantHash = digest(resetToken);
  entry.codeHash = '';
  return { resetToken };
}

export async function resetPassword(email: string, newPassword: string, resetToken?: string) {
  const key = normalize(email);
  const entry = entries.get(key);
  if (!entry || entry.expiresAt <= Date.now() || !entry.grantHash || !resetToken || !equal(entry.grantHash, digest(resetToken))) {
    if (entry && entry.expiresAt <= Date.now()) entries.delete(key);
    throw new Error('Password reset permission is invalid or expired. Verify a new code.');
  }
  const strength = isStrongPassword(newPassword);
  if (!strength.isValid) throw new Error(strength.errors[0]);
  // Consume synchronously before awaiting, preventing concurrent reuse.
  entries.delete(key);
  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user || !user.is_active) throw new Error('Password reset is unavailable for this account.');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, refreshToken: null } });
}
