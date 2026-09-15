import { prisma } from '../../db';

export async function getNotifications(userId: string | undefined, isRead?: boolean, archived?: boolean) {
  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead;
  // Archived field is not on the schema yet — filter locally to avoid runtime errors
  let results = await prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  if (archived !== undefined) {
    results = results.filter((n) => (n as any).archived === archived);
  }
  return results;
}

export async function markRead(userId: string, id: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function deleteNotification(id: string) {
  return prisma.notification.delete({ where: { id } });
}

export async function createNotification(userId: string, data: { title: string; message: string; type: string; }) {
  return prisma.notification.create({
    data: {
      userId,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: false,
    },
  });
}