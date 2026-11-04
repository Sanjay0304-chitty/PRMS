import { prisma } from '../../db';

/* ────────────────────────────────────────────────────────────
   Consent records (General principle)
   ──────────────────────────────────────────────────────────── */

export async function recordConsent(userId: string, data: { type: string; wording: string; version: string; consented: boolean; ipAddress?: string }) {
  return prisma.consentRecord.create({
    data: {
      userId,
      type: data.type,
      wording: data.wording,
      version: data.version,
      consented: data.consented,
      ipAddress: data.ipAddress,
    },
  });
}

export async function getMyConsents(userId: string) {
  return prisma.consentRecord.findMany({ where: { userId }, orderBy: { consentedAt: 'desc' } });
}

export async function withdrawConsent(id: string, userId: string) {
  const record = await prisma.consentRecord.findUnique({ where: { id } });
  if (!record) throw new Error('Consent record not found');
  if (record.userId !== userId) throw new Error('You can only withdraw your own consent');
  if (record.type === 'PRIVACY_NOTICE') throw new Error('The Privacy Notice acknowledgement cannot be withdrawn while keeping your account active — submit an account deletion request instead');
  if (!record.consented || record.withdrawnAt) throw new Error('This consent is not currently active');
  return prisma.consentRecord.update({ where: { id }, data: { withdrawnAt: new Date() } });
}

/* ────────────────────────────────────────────────────────────
   "My stored data" (Access principle) - a plain-language export
   of selected account information. Full access requests are reviewed separately.
   ──────────────────────────────────────────────────────────── */

export async function getMyStoredData(userId: string) {
  const [profile, bookings, agreements, viewings, maintenanceTickets, messages, favorites, consents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, full_name: true, phone: true, profile_img_url: true, created_at: true, updated_at: true },
    }),
    prisma.booking.findMany({ where: { userId }, select: { id: true, status: true, application_stage: true, propertyId: true, start_date: true, end_date: true, occupants: true, applicant_message: true, created_at: true } }),
    prisma.agreement.findMany({ where: { booking: { userId } }, select: { id: true, reference: true, status: true, tenantLegalName: true, tenantSignedAt: true } }),
    prisma.viewingAppointment.findMany({ where: { tenantId: userId }, select: { id: true, propertyId: true, status: true, preferredTime: true } }),
    prisma.maintenanceTicket.findMany({ where: { userId }, select: { id: true, title: true, status: true, created_at: true } }),
    prisma.message.findMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] }, select: { id: true, content: true, created_at: true } }),
    prisma.favorite.findMany({ where: { userId }, select: { propertyId: true, created_at: true } }),
    prisma.consentRecord.findMany({ where: { userId }, select: { id: true, type: true, consented: true, consentedAt: true, withdrawnAt: true, version: true } }),
  ]);

  return { profile, bookings, agreements, viewings, maintenanceTickets, messages, messageCount: messages.length, favorites, consents };
}

/* ────────────────────────────────────────────────────────────
   Privacy requests (Access principle)
   ──────────────────────────────────────────────────────────── */

const VALID_TYPES = ['ACCESS', 'CORRECTION', 'DELETION', 'CONSENT_WITHDRAWAL'];

export async function submitRequest(userId: string, data: { type: string; details?: string }) {
  if (!VALID_TYPES.includes(data.type)) throw new Error('Invalid request type');
  if (data.type === 'CORRECTION' && (typeof data.details !== 'string' || !data.details.trim())) throw new Error('Describe the information that needs correcting');
  return prisma.privacyRequest.create({
    data: { userId, type: data.type, details: data.details, status: 'SUBMITTED' },
  });
}

export async function getMyRequests(userId: string) {
  return prisma.privacyRequest.findMany({ where: { userId }, orderBy: { submitted_at: 'desc' } });
}

export async function getAllRequests(status?: string) {
  return prisma.privacyRequest.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, full_name: true, email: true } } },
    orderBy: { submitted_at: 'desc' },
  });
}

export async function assignRequest(id: string, adminId: string) {
  const changed = await prisma.privacyRequest.updateMany({
    where: { id, status: 'SUBMITTED', assignedAdminId: null },
    data: { assignedAdminId: adminId, status: 'IN_REVIEW' },
  });
  if (changed.count !== 1) throw new Error('Request is no longer available for assignment');
  return prisma.privacyRequest.findUniqueOrThrow({ where: { id } });
}

export async function decideRequest(id: string, adminId: string, data: { decision: string; decisionReason: string }) {
  if (!['APPROVED', 'REJECTED'].includes(data.decision)) throw new Error('Choose APPROVED or REJECTED');
  if (typeof data.decisionReason !== 'string' || !data.decisionReason.trim()) throw new Error('A decision reason is required');
  const changed = await prisma.privacyRequest.updateMany({
    where: { id, status: 'IN_REVIEW', assignedAdminId: adminId },
    data: { status: data.decision, decision: data.decision, decisionReason: data.decisionReason.trim() },
  });
  if (changed.count !== 1) throw new Error('Only the assigned Admin can decide a request in review');
  return prisma.privacyRequest.findUniqueOrThrow({ where: { id } });
}

export async function completeRequest(id: string, adminId: string, fulfillmentNotes?: string) {
  if (typeof fulfillmentNotes !== 'string' || !fulfillmentNotes.trim()) throw new Error('Describe the action performed and any data retained before completing the request');
  return prisma.$transaction(async tx => {
    const request = await tx.privacyRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Request not found');
    if (request.status !== 'APPROVED' || request.assignedAdminId !== adminId) throw new Error('Only the assigned Admin can complete an approved request');
    if (request.type === 'DELETION') {
      if (request.userId === adminId) throw new Error('Another Admin must handle your account closure');
      const activeBookings = await tx.booking.count({ where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        OR: [{ userId: request.userId }, { property: { ownerId: request.userId } }],
      } });
      const properties = await tx.property.count({ where: { ownerId: request.userId, status: { not: 'INACTIVE' } } });
      if (activeBookings || properties) throw new Error('Resolve active applications, tenancies and owned listings before closing this account');
      await tx.user.update({ where: { id: request.userId }, data: {
        full_name: 'Anonymized User', email: `deleted-${request.userId}@anonymized.prms`,
        phone: null, profile_img_url: null, is_active: false, refreshToken: null,
      } });
    }
    const scope = request.type === 'DELETION'
      ? 'Basic profile anonymized and account deactivated; related records and files retained. '
      : 'Admin-reported manual fulfillment: ';
    return tx.privacyRequest.update({ where: { id }, data: {
      status: 'COMPLETED', completed_at: new Date(),
      details: `${request.details || ''} [Fulfillment Note: ${scope}${fulfillmentNotes.trim()}]`,
    } });
  });
}

/* ────────────────────────────────────────────────────────────
   Retention policies + dry-run cleanup simulation + execution
   ──────────────────────────────────────────────────────────── */

const DEFAULT_POLICIES: { category: string; label: string; retentionDays: number; description: string }[] = [
  { category: 'rejected_cancelled_applications', label: 'Rejected / cancelled rental applications', retentionDays: 180, description: 'Applications that never became a tenancy' },
  { category: 'viewing_records', label: 'Completed / cancelled viewing appointments', retentionDays: 180, description: 'Viewing history once the appointment is closed' },
  { category: 'superseded_agreements', label: 'Superseded / cancelled agreement drafts', retentionDays: 365, description: 'Draft versions replaced by a later version' },
  { category: 'notifications', label: 'In-app notifications', retentionDays: 90, description: 'Read and unread notification records' },
  { category: 'resolved_maintenance_tickets', label: 'Resolved maintenance tickets', retentionDays: 365, description: 'Tickets marked resolved or closed' },
  { category: 'audit_logs', label: 'Audit logs', retentionDays: 730, description: 'Sensitive-action history - kept longer for accountability' },
];

export async function ensureDefaultPolicies() {
  for (const p of DEFAULT_POLICIES) {
    await prisma.retentionPolicy.upsert({
      where: { category: p.category },
      create: p,
      update: {},
    });
  }
}

export async function getPolicies() {
  await ensureDefaultPolicies();
  return prisma.retentionPolicy.findMany({ orderBy: { category: 'asc' } });
}

export async function updatePolicy(category: string, retentionDays: number) {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) throw new Error('retentionDays must be a positive number');
  return prisma.retentionPolicy.update({ where: { category }, data: { retentionDays } });
}

async function countEligible(category: string, cutoff: Date): Promise<number> {
  switch (category) {
    case 'rejected_cancelled_applications':
      return prisma.booking.count({ where: { status: 'CANCELLED', updated_at: { lt: cutoff } } });
    case 'viewing_records':
      return prisma.viewingAppointment.count({ where: { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }, updated_at: { lt: cutoff } } });
    case 'superseded_agreements':
      return prisma.agreement.count({ where: { status: { in: ['SUPERSEDED', 'CANCELLED'] }, updated_at: { lt: cutoff } } });
    case 'notifications':
      return prisma.notification.count({ where: { created_at: { lt: cutoff } } });
    case 'resolved_maintenance_tickets':
      return prisma.maintenanceTicket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] }, updated_at: { lt: cutoff } } });
    case 'audit_logs':
      return prisma.auditLog.count({ where: { created_at: { lt: cutoff } } });
    default:
      return 0;
  }
}

// Dry-run only: reports what WOULD be eligible for deletion under current policies
export async function simulateCleanup() {
  const policies = await getPolicies();
  const results = [];
  for (const policy of policies) {
    const cutoff = new Date(Date.now() - policy.retentionDays * 86400000);
    const eligibleCount = await countEligible(policy.category, cutoff);
    results.push({ category: policy.category, label: policy.label, retentionDays: policy.retentionDays, eligibleCount, cutoffDate: cutoff });
  }
  return results;
}

// Operational retention execution: permanently cleans expired personal data
export async function executeRetentionCleanup(): Promise<{ totalDeleted: number; breakdown: Record<string, number>; executedAt: Date }> {
  // Keep the preview available while disposal rules and dependency handling are reviewed.
  throw new Error('Permanent retention cleanup is disabled pending a verified disposal policy. Use the preview only.');
}

/* ────────────────────────────────────────────────────────────
   Data breach register (admin-only)
   ──────────────────────────────────────────────────────────── */

export async function createIncident(createdById: string, data: {
  title: string; detectedAt: string; nature: string; cause?: string;
  dataTypesAffected: string; affectedUserCount?: number; containmentAction?: string;
  riskAssessment?: string; notificationStatus?: string;
}) {
  if (!data.title || !data.detectedAt || !data.nature || !data.dataTypesAffected) {
    throw new Error('title, detectedAt, nature and dataTypesAffected are required');
  }
  return prisma.dataBreachIncident.create({
    data: {
      title: data.title,
      detectedAt: new Date(data.detectedAt),
      nature: data.nature,
      cause: data.cause,
      dataTypesAffected: data.dataTypesAffected,
      affectedUserCount: data.affectedUserCount ?? 0,
      containmentAction: data.containmentAction,
      riskAssessment: data.riskAssessment,
      notificationStatus: data.notificationStatus ?? 'PENDING',
      createdById,
    },
  });
}

export async function getIncidents() {
  return prisma.dataBreachIncident.findMany({ orderBy: { detectedAt: 'desc' } });
}

export async function updateIncident(id: string, data: Partial<{
  containmentAction: string; riskAssessment: string; notificationStatus: string; resolution: string; status: string;
}>) {
  return prisma.dataBreachIncident.update({ where: { id }, data });
}
