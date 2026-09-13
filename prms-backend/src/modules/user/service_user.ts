import { prisma } from '../../db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// passwordHash and refreshToken must never leave the API — every read/write
// below returns this shape instead of the raw Prisma row.
const safeUserSelect = {
  id: true,
  firebase_uid: true,
  email: true,
  full_name: true,
  phone: true,
  profile_img_url: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  UserRole: { include: { role: true } },
} as const;

export async function getAllUsers(page = 1, limit = 10, search?: string, role?: string, isActive?: string) {
  const where: any = {};
  if (search) where.OR = [{ email: { contains: search } }, { full_name: { contains: search } }];
  if (role) where.UserRole = { some: { role: { name: role } } };
  if (isActive !== undefined) where.is_active = isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, select: safeUserSelect }),
    prisma.user.count({ where }),
  ]);
  return { users, total };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
}

export async function createUser(email: string, password: string, full_name?: string, phone?: string, role = 'Tenant') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  // firebase_uid is a unique column; see AUTH registerUser for why this can't be ''.
  const firebase_uid = `local-${uuidv4()}`;
  return prisma.user.create({
    data: { email, passwordHash, full_name, phone, firebase_uid, UserRole: { create: { role: { connect: { name: role } } } } },
    select: safeUserSelect,
  });
}

export async function updateUser(id: string, data: { full_name?: string; phone?: string; is_active?: boolean }) {
  return prisma.user.update({ where: { id }, data, select: safeUserSelect });
}

export async function softDeleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { is_active: false }, select: safeUserSelect });
}

export async function activateUser(id: string) {
  return prisma.user.update({ where: { id }, data: { is_active: true }, select: safeUserSelect });
}

export async function suspendUser(id: string) {
  return prisma.user.update({ where: { id }, data: { is_active: false }, select: safeUserSelect });
}

export async function changeUserRole(id: string, roleName: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: { UserRole: true } });
  if (!user) throw new Error('User not found');
  for (const ur of user.UserRole) {
    await prisma.userRole.delete({ where: { userId_roleId: { userId: ur.userId, roleId: ur.roleId } } });
  }
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error('Role not found');
  const result = await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
  if (roleName === 'Agent') {
    // Agent-role users are looked up through a separate Agent record, not
    // the User row directly — without this, assigning the Agent role here
    // leaves their assigned-properties/bookings/tickets queries empty forever.
    await prisma.agent.upsert({ where: { userId: id }, update: {}, create: { userId: id } });
  }
  return result;
}
