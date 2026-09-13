import { prisma } from '../../db';
import { Request, Response } from 'express';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogInput {
  userId?: string;
  username?: string;
  userRole?: string;
  module: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  status?: string;
  level?: string;
  ipAddress?: string;
  userAgent?: string;
  requestUrl?: string;
  httpMethod?: string;
  errorMessage?: string;
}

export interface AuditFilters {
  action?: string;
  level?: string;
  userId?: string;
  username?: string;
  module?: string;
  entity?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: any;
}

// ─── Create / Record ─────────────────────────────────────────────────────────

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      username: input.username,
      userRole: input.userRole,
      module: input.module,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      description: input.description,
      oldValue: input.oldValue,
      newValue: input.newValue,
      status: input.status || 'Success',
      level: input.level || 'info',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestUrl: input.requestUrl,
      httpMethod: input.httpMethod,
      errorMessage: input.errorMessage,
    },
  });
}

/**
 * Async fire-and-forget helper so controllers don't block on audit writes.
 * Errors are logged silently so audit logging never fails a user request.
 */
export async function recordAudit(input: AuditLogInput) {
  try {
    await createAuditLog(input);
  } catch (err: any) {
    console.error('[AuditLog] write failed:', err.message);
  }
}

// ─── Read / Query ────────────────────────────────────────────────────────────

function buildWhere(filters: AuditFilters): any {
  const where: any = {};

  if (filters.action) where.action = filters.action;
  if (filters.level) where.level = filters.level;
  if (filters.userId) where.userId = filters.userId;
  // Note: no `mode: 'insensitive'` — the SQLite provider (this project's DB)
  // doesn't support it and throws a validation error if it's passed. SQLite's
  // `contains`/`equals` are already case-insensitive for ASCII by default.
  if (filters.username) {
    where.username = { contains: filters.username };
  }
  if (filters.module) {
    where.module = { equals: filters.module };
  }
  if (filters.entity) {
    where.entity = { contains: filters.entity };
  }
  if (filters.status) {
    where.status = { equals: filters.status };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.created_at = {};
    if (filters.dateFrom) where.created_at.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.created_at.lte = new Date(filters.dateTo);
  }
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search } },
      { description: { contains: filters.search } },
      { username: { contains: filters.search } },
      { entity: { contains: filters.search } },
    ];
  }

  return where;
}

export async function getAuditLogs(page: number, limit: number, filters: AuditFilters) {
  const where = buildWhere(filters);
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: filters.orderBy || { created_at: 'desc' },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total };
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, full_name: true, email: true } } },
  });
}

// ─── Dashboard Statistics ────────────────────────────────────────────────────

interface AuditStats {
  totalActivities: number;
  todaysActivities: number;
  failedLogins: number;
  mostActiveUsers: Array<{ userId: string; username: string; count: number }>;
  mostModifiedModules: Array<{ module: string; count: number }>;
  successRate: number;
  recentActivities: Array<any>;
}

export async function getAuditStats(): Promise<AuditStats> {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [
    totalActivities,
    todaysActivities,
    failedLogins,
    mostActiveUsers,
    mostModifiedModules,
    totalSuccess,
    recentActivities,
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { created_at: { gte: startToday } } }),
    prisma.auditLog.count({
      where: {
        action: { contains: 'login', mode: 'insensitive' },
        status: { equals: 'Failed', mode: 'insensitive' },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['userId', 'username'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by: ['module'],
      _count: { module: true },
      orderBy: { _count: { module: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.count({
      where: { status: { equals: 'Success', mode: 'insensitive' } },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
    }),
  ]);

  return {
    totalActivities,
    todaysActivities,
    failedLogins,
    mostActiveUsers: (mostActiveUsers as any[]).map((u) => ({
      userId: u.userId || 'system',
      username: u.username || 'System',
      count: u._count.userId,
    })),
    mostModifiedModules: (mostModifiedModules as any[]).map((m) => ({
      module: m.module,
      count: m._count.module,
    })),
    successRate: totalActivities > 0 ? Math.round((totalSuccess / totalActivities) * 100) : 0,
    recentActivities,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportAuditLogsCSV(filters: AuditFilters) {
  const where = buildWhere(filters);
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 10000,
    include: {
      user: { select: { full_name: true, email: true } },
    },
  });

  const headers = [
    'Timestamp',
    'User ID',
    'Username',
    'User Role',
    'Module',
    'Action',
    'Entity',
    'Entity ID',
    'Description',
    'Status',
    'Level',
    'IP Address',
    'Request URL',
    'HTTP Method',
    'Error Message',
  ];

  const csvRows = [
    headers.join(','),
    ...logs.map((log) => [
      new Date(log.created_at).toISOString(),
      `"${log.userId || ''}"`,
      `"${log.username || ''}"`,
      `"${log.userRole || ''}"`,
      `"${log.module || ''}"`,
      `"${log.action}"`,
      `"${log.entity}"`,
      `"${log.entityId || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      `"${log.status}"`,
      `"${log.level}"`,
      `"${log.ipAddress || ''}"`,
      `"${log.requestUrl || ''}"`,
      `"${log.httpMethod || ''}"`,
      `"${(log.errorMessage || '').replace(/"/g, '""')}"`,
    ].join(',')),
  ];

  return csvRows.join('\n');
}
