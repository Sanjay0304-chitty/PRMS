import { prisma } from '../../db';

// Platform-wide finance summary. Consumed by both Admin Reports (which reads
// total/pending/collected/overdue as *counts*) and FinanceDashboard (which
// reads totalRevenue/pendingAmount/collectedAmount/totalBookings/byProperty
// as *amounts*) — both fields are provided so neither caller's semantics
// change.
export async function getFinanceSummary(userId: string) {
  const now = new Date();
  const [collectedAgg, pendingAgg, pendingCount, collectedCount, overdueCount, totalBookings, paidPayments] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.payment.count({ where: { status: { in: ['PENDING', 'UNPAID'] }, due_date: { lt: now } } }),
    prisma.booking.count(),
    prisma.payment.findMany({
      where: { status: 'PAID' },
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

export async function getPayments(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ skip, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, booking: { include: { property: true } } } }),
    prisma.payment.count(),
  ]);
  return { payments, total };
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
  return prisma.payment.update({ where: { id }, data: { status: 'PAID' } });
}