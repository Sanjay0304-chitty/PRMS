import { prisma } from '../../db';

export async function getNotifications(userId: string | undefined, isRead?: boolean, archived?: boolean) {
  const where: any = { userId };
  if (isRead !== undefined) where.is_read = isRead;
  if (archived !== undefined) where.archived = archived;
  return prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
}

export async function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { is_read: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, is_read: false }, data: { is_read: true } });
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
      is_read: false,
      archived: false,
    },
  });
}