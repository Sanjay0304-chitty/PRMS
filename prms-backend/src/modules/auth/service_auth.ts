import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../db';
import { env } from '../../config';

// Agent-role users are looked up through a separate Agent record (see
// modules/agent), not the User row directly, so anywhere a user ends up
// with the Agent role must also ensure that record exists — otherwise
// their assigned-properties/bookings/tickets queries stay empty forever.
async function ensureAgentRecord(userId: string) {
  await prisma.agent.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function registerUser(
  email: string,
  password: string,
  full_name?: string,
  phone?: string,
  role?: string,
  consents?: { type: string; wording: string; version: string; consented: boolean }[],
  ipAddress?: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');
  // PDPA: the Privacy Notice acknowledgement is mandatory to hold an
  // account here — everything else (e.g. marketing) is optional and must
  // never be required.
  const privacyAck = consents?.find((c) => c.type === 'PRIVACY_NOTICE');
  if (!privacyAck || !privacyAck.consented) {
    throw new Error('You must acknowledge the Privacy Notice to create an account');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // firebase_uid is a unique column; password-based accounts have no real
  // Firebase identity, so a per-user placeholder avoids collisions between
  // otherwise-unrelated accounts (was hardcoded to "" which only allowed a
  // single password-based registration to ever succeed).
  const firebase_uid = `local-${uuidv4()}`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firebase_uid,
      full_name,
      phone,
      UserRole: {
        create: {
          role: { connect: { name: role || 'Tenant' } }
        }
      }
    },
    include: { UserRole: { include: { role: true } } },
  });

  if ((role || 'Tenant') === 'Agent') {
    await ensureAgentRecord(user.id);
  }

  if (consents?.length) {
    await prisma.consentRecord.createMany({
      data: consents.map((c) => ({
        userId: user.id,
        type: c.type,
        wording: c.wording,
        version: c.version,
        consented: c.consented,
        ipAddress,
      })),
    });
  }

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { UserRole: { include: { role: true } } },
  });

  if (!user) throw new Error('Email not registered');
  if (!user.passwordHash) throw new Error('Please use Firebase login for this account');
  if (!user.is_active) throw new Error('Account is suspended');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Wrong password. Please try again.');

  return user;
}

export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export async function saveRefreshToken(userId: string, refreshToken: string) {
  const hash = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: hash } });
}

export async function verifyRefreshToken(userId: string, refreshToken: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.refreshToken) throw new Error('No refresh token found');
  const valid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!valid) throw new Error('Invalid refresh token');
  return user;
}

export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, full_name: true, phone: true,
      profile_img_url: true, firebase_uid: true, is_active: true, created_at: true,
      passwordHash: true,
      UserRole: { include: { role: true } },
    },
  });
}

// Roles a user may assign to themselves (e.g. during first-time onboarding).
// 'Admin' is deliberately excluded — granting Admin must never be something
// a user can trigger on their own account through a self-service endpoint.
const SELF_SERVICE_ROLES = ['Tenant', 'Landlord', 'Agent'];

export async function updateUserProfile(
  userId: string,
  data: { full_name?: string; phone?: string; profile_img_url?: string; role?: string }
) {
  // If role is provided, replace any existing self-service role with it —
  // a user has exactly one of Tenant/Landlord/Agent at a time. Upserting
  // the new role without removing the old one left both rows in place
  // (e.g. the Tenant row every Google sign-up starts with), and every
  // reader of UserRole[0] elsewhere in the app has no guaranteed order to
  // rely on to know which one is "current".
  if (data.role) {
    if (!SELF_SERVICE_ROLES.includes(data.role)) {
      throw new Error(`Role ${data.role} cannot be self-assigned`);
    }
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw new Error(`Role ${data.role} not found`);
    await prisma.userRole.deleteMany({
      where: { userId, role: { name: { in: SELF_SERVICE_ROLES } }, roleId: { not: role.id } },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
    if (data.role === 'Agent') {
      await ensureAgentRecord(userId);
    }
  }

  const { role, ...userFields } = data;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: userFields,
    select: {
      id: true, email: true, full_name: true, phone: true,
      profile_img_url: true, firebase_uid: true, is_active: true, created_at: true,
      passwordHash: true,
      UserRole: { include: { role: true } },
    },
  });
  // passwordHash must never leave the API as a raw value — only the derived
  // hasPassword boolean the response layer needs.
  const { passwordHash, ...safe } = updated;
  return { ...safe, hasPassword: !!passwordHash };
}

export async function logoutUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new Error('Password-based account required');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

/* For Google-only accounts that don't have a password yet - lets them add
   one so they can also log in with email/password. Refuses if the account
   already has a password (use changePassword for that instead). */
export async function setPassword(userId: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.passwordHash) throw new Error('Account already has a password - use change password instead');

  const newHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

// In-memory OTP store (5 min expiry) - no real email/SMS service behind
// this project, so the OTP is generated here and handed back in the API
// response for the frontend to display directly, rather than actually
// delivered out-of-band. Known, deliberate limitation (flagged in the
// deployment report), not a real password-reset security model - don't
// extend this pattern to anything that needs to be actually secure.
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function generateOtpCode(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Email not found');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  return code;
}

export async function verifyOtpCode(email: string, code: string) {
  const entry = otpStore.get(email);
  if (!entry) throw new Error('OTP not found. Request a new one first.');
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    throw new Error('OTP expired. Request a new one.');
  }
  if (entry.code !== code) throw new Error('Invalid OTP code.');
  otpStore.delete(email);
}

export async function resetPassword(email: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
}
