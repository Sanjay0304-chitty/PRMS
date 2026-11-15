import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config';
import { prisma } from '../../db';

type Identity = { uid: string; email: string; name?: string };
const grantSecret = () => crypto.createHmac('sha256', env.JWT_SECRET).update('prms-google-registration').digest('hex');

/** This grant cannot authenticate API requests or refresh an existing session. */
export function createGoogleRegistrationGrant(identity: Identity) {
  return jwt.sign(identity, grantSecret(), { algorithm: 'HS256', expiresIn: '10m', audience: 'google-registration', issuer: 'PRMS' });
}

export async function completeGoogleRegistration(token: string, role: string, consents: { type: string; wording: string; version: string; consented: boolean }[], ipAddress?: string) {
  if (!['Tenant', 'Landlord', 'Agent'].includes(role)) throw new Error('Choose Tenant, Landlord or Agent');
  if (typeof token !== 'string') throw new Error('Sign in with Google again to continue');
  let identity: Identity;
  try {
    identity = jwt.verify(token, grantSecret(), { algorithms: ['HS256'], audience: 'google-registration', issuer: 'PRMS' }) as Identity;
  } catch { throw new Error('Google registration has expired or is invalid. Sign in with Google again.'); }
  if (!identity.uid || !identity.email) throw new Error('Google registration identity is invalid');
  const privacy = Array.isArray(consents) && consents.find(c => c.type === 'PRIVACY_NOTICE' && c.consented === true);
  if (!privacy || typeof privacy.wording !== 'string' || !privacy.wording.trim() || typeof privacy.version !== 'string' || !privacy.version.trim()) {
    throw new Error('Acknowledge the Privacy Notice to create your account');
  }
  return prisma.$transaction(async tx => {
    const existing = await tx.user.findFirst({ where: { OR: [{ email: identity.email }, { firebase_uid: identity.uid }] } });
    if (existing) throw new Error('This account already exists. Sign in with Google again.');
    const user = await tx.user.create({
      data: {
        email: identity.email, firebase_uid: identity.uid, full_name: identity.name || identity.email.split('@')[0],
        UserRole: { create: { role: { connect: { name: role } } } },
      },
      include: { UserRole: { include: { role: true } } },
    });
    if (role === 'Agent') await tx.agent.create({ data: { userId: user.id } });
    await tx.consentRecord.create({ data: { userId: user.id, type: 'PRIVACY_NOTICE', consented: true, wording: privacy.wording, version: privacy.version, ipAddress } });
    return user;
  });
}
