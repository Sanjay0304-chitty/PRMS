import { prisma } from '../../db';
import type { Prisma } from '@prisma/client';

// Platform-wide finance summary. Consumed by both Admin Reports (which reads
// total/pending/collected/overdue as *counts*) and FinanceDashboard (which
// reads totalRevenue/pendingAmount/collectedAmount/totalBookings/byProperty
// as *amounts*) — both fields are provided so neither caller's semantics
// change.
async function calculateFinanceSummary(propertyIds?: string[]) {
  const now = new Date();
  const paymentWhere: any = propertyIds ? { booking: { propertyId: { in: propertyIds } } } : {};
  const bookingWhere: any = propertyIds ? { propertyId: { in: propertyIds } } : {};
  const [collectedAgg, pendingAgg, pendingCount, collectedCount, overdueCount, totalBookings, paidPayments] = await Promise.all([
    prisma.payment.aggregate({ where: { ...paymentWhere, status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...paymentWhere, status: { in: ['PENDING', 'UNPAID'] } }, _sum: { amount: true } }),
    prisma.payment.count({ where: { ...paymentWhere, status: { in: ['PENDING', 'UNPAID'] } } }),
    prisma.payment.count({ where: { ...paymentWhere, status: 'PAID' } }),
    prisma.payment.count({ where: { ...paymentWhere, status: { in: ['PENDING', 'UNPAID'] }, due_date: { lt: now } } }),
    prisma.booking.count({ where: bookingWhere }),
    prisma.payment.findMany({
      where: { ...paymentWhere, status: 'PAID' },
      include: { booking: { include: { property: { select: { title: true } } } } },
    }),
  ]);

  const byPropertyMap = new Map<string, number>();
  for (const p of paidPayments) {
    const title = p.booking?.property?.title || 'Unknown';
    byPropertyMap.set(title, (byPropertyMap.get(title) || 0) + p.amount);
  }
  const byProperty = [...byPropertyMap.entries()].map(([property, amount]) => ({ property, amount }));

  const total = collectedAgg._sum.amount || 0;
  return {
    total,
    totalRevenue: total,
    pending: pendingCount,
    pendingAmount: pendingAgg._sum.amount || 0,
    collected: collectedCount,
    collectedAmount: total,
    overdue: overdueCount,
    totalBookings,
    byProperty,
  };
}

export async function getFinanceSummary(_userId: string) {
  return calculateFinanceSummary();
}

export async function getPayments(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ skip, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, booking: { include: { property: true } } } }),
    prisma.payment.count(),
  ]);
  return { payments, total };
}

async function getAssignedPropertyIds(userId: string) {
  const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
  if (!agent) return [];
  const assignments = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  return assignments.map((assignment) => assignment.propertyId);
}

async function getOwnedPropertyIds(userId: string) {
  const properties = await prisma.property.findMany({ where: { ownerId: userId }, select: { id: true } });
  return properties.map((property) => property.id);
}

export async function getLandlordPayments(userId: string, page = 1, limit = 10) {
  const propertyIds = await getOwnedPropertyIds(userId);
  if (!propertyIds.length) return { payments: [], total: 0 };
  const where = { booking: { propertyId: { in: propertyIds } } };
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, booking: { include: { property: true } } } }),
    prisma.payment.count({ where }),
  ]);
  return { payments, total };
}

export async function getAgentPayments(userId: string, page = 1, limit = 10) {
  const propertyIds = await getAssignedPropertyIds(userId);
  if (!propertyIds.length) return { payments: [], total: 0 };
  const where = { booking: { propertyId: { in: propertyIds } } };
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        due_date: true,
        paid_at: true,
        booking: { select: { property: { select: { id: true, title: true } } } },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  return { payments, total };
}

export async function getAgentFinanceSummary(userId: string) {
  const propertyIds = await getAssignedPropertyIds(userId);
  if (!propertyIds.length) return { total: 0, totalRevenue: 0, pending: 0, pendingAmount: 0, collected: 0, collectedAmount: 0, overdue: 0, totalBookings: 0, byProperty: [] };
  return calculateFinanceSummary(propertyIds);
}

export async function getLandlordFinanceSummary(userId: string) {
  const propertyIds = await getOwnedPropertyIds(userId);
  if (!propertyIds.length) return { total: 0, totalRevenue: 0, pending: 0, pendingAmount: 0, collected: 0, collectedAmount: 0, overdue: 0, totalBookings: 0, byProperty: [] };
  return calculateFinanceSummary(propertyIds);
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id }, include: { user: { select: { id: true, full_name: true, email: true } }, booking: { include: { property: true } } } });
}

export async function createPayment(data: { bookingId: string; userId: string; amount: number; status: string; type?: string; method?: string; due_date?: string }) {
  const statusMap: any = { pending: 'PENDING', paid: 'PAID', unpaid: 'UNPAID', failed: 'FAILED', refunded: 'REFUNDED' };
  return prisma.payment.create({
    data: {
      bookingId: data.bookingId,
      userId: data.userId,
      amount: data.amount,
      status: statusMap[data.status] || data.status.toUpperCase() || 'PENDING',
      type: data.type || 'rent',
      method: data.method || 'cash',
      due_date: data.due_date ? new Date(data.due_date) : new Date(),
    },
  });
}

export async function markAsPaid(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new Error('Payment not found');
  // Enforce status transition: only UNPAID or PENDING can be marked paid
  if (!['UNPAID', 'PENDING'].includes(payment.status)) {
    throw new Error(`Payment cannot be marked as paid while in ${payment.status} status`);
  }
  const now = new Date();
  await prisma.$transaction([
    // Update the payment row
    prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paid_at: now },
    }),
    // Update the booking payment status
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: 'PAID' },
    }),
    // Update related invoices
    prisma.invoice.updateMany({
      where: { bookingId: payment.bookingId, status: { in: ['PENDING', 'UNPAID'] } },
      data: { status: 'PAID' },
    }),
  ]);
  return getPaymentById(id);
}

// ── Tenant-only payments ──────────────────────────────────────────────

export async function getTenantDashboardPayments(userId: string) {
  const dismissed = await prisma.recordArchive.findMany({ where: { userId, kind: 'payment_activity' } });
  const hidden: Prisma.PaymentWhereInput[] = dismissed.map(item => ({ id: item.recordId, updated_at: { lte: item.archivedAt }, status: { in: ['PAID', 'REFUNDED', 'FAILED'] } }));
  const select = {
    id: true, amount: true, type: true, status: true, due_date: true,
    paid_at: true, updated_at: true,
    booking: { select: { property: { select: { id: true, title: true } } } },
  };
  const [recent, nextDue] = await Promise.all([
    prisma.payment.findMany({ where: { userId, ...(hidden.length ? { NOT: { OR: hidden } } : {}) }, select, orderBy: [{ updated_at: 'desc' }, { id: 'desc' }], take: 4 }),
    prisma.payment.findFirst({ where: { userId, status: { in: ['UNPAID', 'PENDING', 'FAILED'] } }, select, orderBy: [{ due_date: 'asc' }, { id: 'asc' }] }),
  ]);
  return { recent, nextDue };
}

export async function setDashboardPaymentDismissed(userId: string, paymentId: string, dismissed: boolean) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId }, select: { id: true, status: true } });
  if (!payment) throw new Error('Payment not found');
  if (dismissed && !['PAID', 'REFUNDED', 'FAILED'].includes(payment.status)) throw new Error('Unpaid and pending payments must remain visible');
  const key = { userId, kind: 'payment_activity', recordId: paymentId };
  if (dismissed) await prisma.recordArchive.upsert({ where: { userId_kind_recordId: key }, create: key, update: { archivedAt: new Date() } });
  else await prisma.recordArchive.deleteMany({ where: key });
}

export async function getMyPayments(userId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { due_date: 'asc' },
      include: {
        booking: { include: { property: { select: { id: true, title: true } } } },
        transactions: { orderBy: { created_at: 'desc' } },
      },
    }),
    prisma.payment.count({ where: { userId } }),
  ]);
  return { payments, total };
}

// ── Mock Payment Gateway (transaction management) ─────────────────────

function generateMockReference(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MOCK-${ts}-${rand}`;
}

export async function startMockCheckout(
  paymentId: string,
  userId: string,
  method: 'FPX' | 'QR' | 'CARD',
) {
  // 1. Fetch payment with locking semantics
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { property: { select: { id: true, title: true } } } } },
  });

  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'PAID') throw new Error('Payment has already been paid');
  if (payment.userId !== userId) throw new Error('This payment does not belong to you');

  // 2. Check for an active (PENDING/SUCCESS) transaction
  const activeTx = await prisma.mockPaymentTransaction.findFirst({
    where: { paymentId, status: { in: ['PENDING', 'SUCCESS'] } },
    orderBy: { created_at: 'desc' },
  });
  if (activeTx) throw new Error('An active checkout session already exists for this payment');

  // 3. Create the transaction (already paid payments blocked above)
  const transaction = await prisma.mockPaymentTransaction.create({
    data: {
      paymentId,
      method,
      status: 'PENDING',
      reference: generateMockReference(),
    },
  });

  return transaction;
}

export async function getMockTransaction(transactionId: string, userId: string) {
  const tx = await prisma.mockPaymentTransaction.findUnique({
    where: { id: transactionId },
    include: {
      payment: {
        include: { booking: { include: { property: { select: { id: true, title: true } } } } },
      },
    },
  });

  if (!tx) throw new Error('Transaction not found');
  if (tx.payment.userId !== userId) throw new Error('This transaction does not belong to you');
  return tx;
}

export async function completeMockTransaction(
  transactionId: string,
  userId: string,
  outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED',
  failureMessage?: string,
) {
  // 1. Fetch current transaction
  const tx = await prisma.mockPaymentTransaction.findUnique({
    where: { id: transactionId },
    include: { payment: { include: { booking: true } } },
  });

  if (!tx) throw new Error('Transaction not found');
  if (tx.payment.userId !== userId) throw new Error('This transaction does not belong to you');
  if (tx.status !== 'PENDING') throw new Error('Transaction is no longer pending — cannot be completed');

  const now = new Date();

  // 2. Atomic reconciliation — use a transaction
  if (outcome === 'SUCCESS') {
    await prisma.$transaction([
      // Update the mock transaction
      prisma.mockPaymentTransaction.update({
        where: { id: transactionId },
        data: { status: 'SUCCESS', updated_at: now },
      }),
      // Update payment
      prisma.payment.update({
        where: { id: tx.paymentId },
        data: { status: 'PAID', paid_at: now, method: tx.method, reference: tx.reference },
      }),
      // Update booking payment status
      prisma.booking.update({
        where: { id: tx.payment.bookingId },
        data: { paymentStatus: 'PAID' },
      }),
      // Update any related invoices for this booking
      prisma.invoice.updateMany({
        where: { bookingId: tx.payment.bookingId, status: { in: ['PENDING', 'UNPAID'] } },
        data: { status: 'PAID' },
      }),
    ]);
  } else {
    // FAILED or CANCELLED — keep payment as-is so tenant can retry
    await prisma.mockPaymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: outcome,
        failureMessage: outcome === 'FAILED' ? failureMessage || 'Payment failed — try again' : 'Checkout cancelled by user',
        updated_at: now,
      },
    });
  }

  // 3. Return updated transaction with payment details
  return getMockTransaction(transactionId, userId);
}
