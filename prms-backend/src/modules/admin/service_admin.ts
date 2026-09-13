import { prisma } from '../../db';

export async function getSystemSettings() {
  return prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
}

export async function updateSystemSetting(key: string, value: string) {
  if (!key || key === 'undefined') {
    throw new Error('Setting key is required');
  }
  if (value === undefined || value === null) {
    value = '';
  }
  const category = String(key).split('_')[0] ?? 'general';
  return prisma.systemSetting.upsert({
    where: { key: String(key) },
    update: { value: String(value) },
    create: { key: String(key), value: String(value), category },
  });
}

export async function uploadSystemSetting(key: string, filePath: string) {
  if (!key || key === 'undefined') {
    throw new Error('Setting key is required');
  }
  const category = String(key).split('_')[0] ?? 'general';
  return prisma.systemSetting.upsert({
    where: { key: String(key) },
    update: { value: filePath, category },
    create: { key: String(key), value: filePath, category },
  });
}

export async function addSystemSetting(key: string, value: string, category = 'general', description?: string) {
  return prisma.systemSetting.create({ data: { key, value, category, description } });
}

export async function getSystemSettingsByCategory(category: string) {
  return prisma.systemSetting.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  });
}

// Categories safe for public consumption (no sensitive internal config)
const publicCategories = ['theme', 'branding', 'header', 'footer', 'homepage', 'features', 'privacy'];

export async function getPublicSystemSettings() {
  return prisma.systemSetting.findMany({
    where: { category: { in: publicCategories } },
    orderBy: { key: 'asc' },
  });
}

export async function bulkUpdateSystemSettings(settingsList: Array<Record<string, unknown>>) {
  if (!Array.isArray(settingsList)) {
    throw new Error('Settings must be an array');
  }

  const results = await Promise.all(
    settingsList.map(async ({ key, value }) => {
      if (!key || value === undefined) return null;
      const strKey = String(key);
      const strValue = String(value);
      return prisma.systemSetting.upsert({
        where: { key: strKey },
        update: { value: strValue },
        create: { key: strKey, value: strValue, category: 'general' },
      });
    }),
  );

  return results.filter(Boolean);
}

export async function getAuditLogs(page = 1, limit = 50, entity?: string) {
  const where: any = {};
  if (entity) where.entity = entity;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { created_at: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total };
}

export async function createAuditLog(data: { userId?: string; action: string; entity: string; entityId?: string; description?: string; ipAddress?: string; userAgent?: string; module?: string; status?: string; level?: string }) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      description: data.description,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      module: data.module || 'Admin',
      status: data.status || 'Success',
      level: data.level || 'info',
    },
  });
}

export async function getNotifications(userId: string, page = 1, limit = 20) {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, skip: (page - 1) * limit, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { notifications, total };
}

export async function createNotification(data: { userId: string; type: string; title: string; message: string }) {
  return prisma.notification.create({ data });
}

export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function dismissNotification(notificationId: string) {
  return prisma.notification.delete({ where: { id: notificationId } });
}
