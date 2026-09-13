import { prisma } from '../../db';

export async function getDashboardStats() {
  const [totalUsers, totalProperties, totalBookings, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
  ]);
  
  return {
    totalUsers,
    totalProperties,
    totalBookings,
    totalRevenue: totalRevenue._sum?.amount || 0,
  };
}

export async function getRevenueReport(month?: string, year?: string) {
  const where: any = { status: 'PAID' };
  if (month && year) {
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.paid_at = { gte: start, lte: end };
  }
  
  const payments = await prisma.payment.findMany({
    where,
    select: { amount: true, paid_at: true, type: true },
    orderBy: { paid_at: 'desc' },
  });
  
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  return { payments, total, count: payments.length };
}

export async function getPropertyReport() {
  const properties = await prisma.property.findMany({
    include: {
      _count: { select: { bookings: true } },
    },
  });
  
  return properties.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    rent: p.rent,
    bookingCount: p._count.bookings,
  }));
}

export async function getOccupancyReport() {
  const totalProperties = await prisma.property.count();
  const activeBookings = await prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } });
  
  return {
    totalProperties,
    activeBookings,
    occupancyRate: totalProperties > 0 ? Math.round((activeBookings / totalProperties) * 100) : 0,
  };
}
