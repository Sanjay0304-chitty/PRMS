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

async function getAssignedPropertyIds(userId: string) {
  const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
  if (!agent) return [];
  const assignments = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  return assignments.map((assignment) => assignment.propertyId);
}

export async function getAgentPayments(userId: string, page = 1, limit = 10) {
  const propertyIds = await getAssignedPropertyIds(userId);
  if (!propertyIds.length) return { payments: [], total: 0 };
  const where = { booking: { propertyId: { in: propertyIds } } };
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, booking: { include: { property: true } } } }),
    prisma.payment.count({ where }),
  ]);
  return { payments, total };
}

export async function getAgentFinanceSummary(userId: string) {
  const propertyIds = await getAssignedPropertyIds(userId);
  if (!propertyIds.length) return { total: 0, totalRevenue: 0, pending: 0, pendingAmount: 0, collected: 0, collectedAmount: 0, overdue: 0, totalBookings: 0, byProperty: [] };
  const paymentWhere = { booking: { propertyId: { in: propertyIds } } };
  const now = new Date();
  const [collectedAgg, pendingAgg, pendingCount, collectedCount, overdueCount, totalBookings, paidPayments] = await Promise.all([
    prisma.payment.aggregate({ where: { ...paymentWhere, status: 'PAID' }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...paymentWhere, status: 'PENDING' }, _sum: { amount: true } }),
    prisma.payment.count({ where: { ...paymentWhere, status: 'PENDING' } }),
    prisma.payment.count({ where: { ...paymentWhere, status: 'PAID' } }),
    prisma.payment.count({ where: { ...paymentWhere, status: { in: ['PENDING', 'UNPAID'] }, due_date: { lt: now } } }),
    prisma.booking.count({ where: { propertyId: { in: propertyIds } } }),
    prisma.payment.findMany({ where: { ...paymentWhere, status: 'PAID' }, include: { booking: { include: { property: { select: { title: true } } } } } }),
  ]);
  const byPropertyMap = new Map<string, number>();
  for (const payment of paidPayments) {
    const title = payment.booking.property.title;
    byPropertyMap.set(title, (byPropertyMap.get(title) || 0) + payment.amount);
  }
  const total = collectedAgg._sum.amount || 0;
  return { total, totalRevenue: total, pending: pendingCount, pendingAmount: pendingAgg._sum.amount || 0, collected: collectedCount, collectedAmount: total, overdue: overdueCount, totalBookings, byProperty: [...byPropertyMap.entries()].map(([property, amount]) => ({ property, amount })) };
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
