import { prisma } from '../../db';

export class NotificationNotFoundError extends Error {
  constructor() {
    super('Notification not found');
    this.name = 'NotificationNotFoundError';
  }
}

export async function getNotifications(userId: string | undefined, isRead?: boolean, _archived?: boolean) {
  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead;
  // Archiving is not represented in the current schema, so the legacy query
  // parameter is intentionally ignored instead of returning an empty list.
  return prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
}

export async function markRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
  if (result.count === 0) throw new NotificationNotFoundError();
  return prisma.notification.findUnique({ where: { id } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function deleteNotification(userId: string, id: string) {
  const result = await prisma.notification.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new NotificationNotFoundError();
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
