import { prisma } from '../../db';

export async function assignRole(userId: string, roleName: string) {
  const existingRoles = await prisma.userRole.findMany({ where: { userId } });
  for (const ur of existingRoles) {
    await prisma.userRole.delete({ where: { userId_roleId: { userId: ur.userId, roleId: ur.roleId } } });
  }
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`Role "${roleName}" not found`);
  return prisma.userRole.create({ data: { userId, roleId: role.id } });
}

export async function getUserRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { UserRole: { include: { role: true } } },
  });
}
