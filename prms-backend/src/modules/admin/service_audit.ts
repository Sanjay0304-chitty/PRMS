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
  if (filters.level) where.level = ['warn', 'warning'].includes(filters.level.toLowerCase()) ? { in: ['warn', 'warning'] } : filters.level;
  if (filters.userId) where.userId = filters.userId;
  if (filters.username) {
    where.username = { contains: filters.username, mode: 'insensitive' as const };
  }
  if (filters.module) {
    where.module = { equals: filters.module, mode: 'insensitive' as const };
  }
  if (filters.entity) {
    where.entity = { contains: filters.entity, mode: 'insensitive' as const };
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
  const reportIds = logs.filter(log => log.action === 'REPORT_PROPERTY_LISTING').map(log => log.id);
  const reviews = reportIds.length ? await prisma.auditLog.findMany({
    where: { action: 'REVIEW_LISTING_REPORT', entityId: { in: reportIds } },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  }) : [];
  return { logs: logs.map(log => ({ ...log, reportReview: log.action === 'REPORT_PROPERTY_LISTING' ? reviews.find(r => r.entityId === log.id) || null : undefined })), total };
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, full_name: true, email: true } } },
  });
}

// Listing report decisions are append-only events; originals are never edited.
export async function getListingReport(id: string) {
  const report = await getAuditLogById(id);
  if (!report || report.action !== 'REPORT_PROPERTY_LISTING' || report.status !== 'Success') throw new Error('Listing report not found');
  const property = report.entityId ? await prisma.property.findUnique({ where: { id: report.entityId }, select: { id: true, title: true, status: true } }) : null;
  const history = await prisma.auditLog.findMany({ where: { action: 'REVIEW_LISTING_REPORT', entityId: id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
  return { report, property, history };
}

export async function reviewListingReport(id: string, admin: { id: string; email?: string }, data: { status: string; note: string; previousReviewId?: string | null }) {
  if (!['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].includes(data.status)) throw new Error('Invalid report review status');
  if (typeof data.note !== 'string' || !data.note.trim() || data.note.length > 4000) throw new Error('Enter a review note of 1 to 4000 characters');
  return prisma.$transaction(async tx => {
    const original = await tx.auditLog.findUnique({ where: { id } });
    if (!original || original.action !== 'REPORT_PROPERTY_LISTING' || original.status !== 'Success') throw new Error('Listing report not found');
    const previous = await tx.auditLog.findFirst({ where: { action: 'REVIEW_LISTING_REPORT', entityId: id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    if ((previous?.id || null) !== (data.previousReviewId || null)) throw new Error('Report changed. Reload its details before reviewing.');
    const current = previous?.status || 'PENDING';
    if (['RESOLVED', 'DISMISSED'].includes(current)) throw new Error('This report has already been closed');
    if (current === data.status) throw new Error('Choose a different review status');
    return tx.auditLog.create({ data: {
      userId: admin.id, username: admin.email, userRole: 'Admin', module: 'Property',
      action: 'REVIEW_LISTING_REPORT', entity: 'ListingReport', entityId: id,
      status: data.status, level: 'info', description: data.note.trim(),
    } });
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
