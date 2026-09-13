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
   of everything personally identifiable this account holds.
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

  return { profile, bookings, agreements, viewings, maintenanceTickets, messageCount: messages.length, favorites, consents };
}

/* ────────────────────────────────────────────────────────────
   Privacy requests (Access principle)
   ──────────────────────────────────────────────────────────── */

const VALID_TYPES = ['ACCESS', 'CORRECTION', 'DELETION', 'CONSENT_WITHDRAWAL'];

export async function submitRequest(userId: string, data: { type: string; details?: string }) {
  if (!VALID_TYPES.includes(data.type)) throw new Error('Invalid request type');
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
  return prisma.privacyRequest.update({ where: { id }, data: { assignedAdminId: adminId, status: 'IN_REVIEW' } });
}

export async function decideRequest(id: string, data: { decision: 'APPROVED' | 'REJECTED'; decisionReason: string }) {
  if (!data.decisionReason || !data.decisionReason.trim()) throw new Error('A decision reason is required');
  return prisma.privacyRequest.update({
    where: { id },
    data: { status: data.decision, decision: data.decision, decisionReason: data.decisionReason },
  });
}

export async function completeRequest(id: string) {
  const request = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!request) throw new Error('Request not found');
  if (request.status !== 'APPROVED') throw new Error('Only an approved request can be marked completed');
  return prisma.privacyRequest.update({ where: { id }, data: { status: 'COMPLETED', completed_at: new Date() } });
}

/* ────────────────────────────────────────────────────────────
   Retention policies + dry-run cleanup simulation
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

// Dry-run only: reports what WOULD be eligible for deletion under the
// current policies, without deleting anything. Real deletion is a
// deliberate, separate, explicitly-authorised action outside this scope.
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
