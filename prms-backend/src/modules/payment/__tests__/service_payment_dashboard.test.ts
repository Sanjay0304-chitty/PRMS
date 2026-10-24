import { getTenantDashboardPayments, setDashboardPaymentDismissed } from '../service_payment';
import { prisma } from '../../../db';

jest.mock('../../../db', () => ({ prisma: {
  payment: { findMany: jest.fn(), findFirst: jest.fn() },
  recordArchive: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
} }));
beforeEach(() => { jest.resetAllMocks(); (prisma.recordArchive.findMany as jest.Mock).mockResolvedValue([]); });

test('dashboard scopes both queries to the authenticated tenant and finds outstanding dues independently of the preview', async () => {
  const recent = [{ id: 'recent-payment', status: 'PAID' }];
  const nextDue = { id: 'older-overdue-payment', status: 'UNPAID' };
  (prisma.payment.findMany as jest.Mock).mockResolvedValue(recent);
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue(nextDue);
  await expect(getTenantDashboardPayments('tenant-1')).resolves.toEqual({ recent, nextDue });
  expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: 'tenant-1' }, take: 4, orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
  }));
  expect(prisma.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: 'tenant-1', status: { in: ['UNPAID', 'PENDING', 'FAILED'] } },
    orderBy: [{ due_date: 'asc' }, { id: 'asc' }],
  }));
  const select = (prisma.payment.findMany as jest.Mock).mock.calls[0][0].select;
  expect(select.transactions).toBeUndefined();
  expect(select.user).toBeUndefined();
});

test('dashboard returns an empty preview and no next payment when no payments are outstanding', async () => {
  (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
  await expect(getTenantDashboardPayments('tenant-2')).resolves.toEqual({ recent: [], nextDue: null });
});

test.each(['PAID', 'REFUNDED', 'FAILED'])('tenant can dismiss %s activity without changing the payment', async status => {
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: 'payment-1', status });
  await setDashboardPaymentDismissed('tenant-1', 'payment-1', true);
  expect(prisma.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'payment-1', userId: 'tenant-1' } }));
  expect(prisma.recordArchive.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'tenant-1', kind: 'payment_activity', recordId: 'payment-1' } }));
});

test.each(['UNPAID', 'PENDING'])('cannot dismiss %s dues', async status => {
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: 'payment-1', status });
  await expect(setDashboardPaymentDismissed('tenant-1', 'payment-1', true)).rejects.toThrow('must remain visible');
  expect(prisma.recordArchive.upsert).not.toHaveBeenCalled();
});

test('cannot dismiss another tenants payment by guessing its ID', async () => {
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
  await expect(setDashboardPaymentDismissed('tenant-1', 'unrelated', true)).rejects.toThrow('Payment not found');
  expect(prisma.recordArchive.upsert).not.toHaveBeenCalled();
});

test('undo removes only the current tenants activity marker', async () => {
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: 'payment-1', status: 'PAID' });
  await setDashboardPaymentDismissed('tenant-1', 'payment-1', false);
  expect(prisma.recordArchive.deleteMany).toHaveBeenCalledWith({ where: { userId: 'tenant-1', kind: 'payment_activity', recordId: 'payment-1' } });
});

test('dismissals only hide unchanged finished activity and do not filter the next due payment', async () => {
  const archivedAt = new Date();
  (prisma.recordArchive.findMany as jest.Mock).mockResolvedValue([{ recordId: 'payment-1', archivedAt }]);
  (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
  await getTenantDashboardPayments('tenant-1');
  expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'tenant-1', NOT: { OR: [{ id: 'payment-1', updated_at: { lte: archivedAt }, status: { in: ['PAID', 'REFUNDED', 'FAILED'] } }] } } }));
  expect((prisma.payment.findFirst as jest.Mock).mock.calls[0][0].where.NOT).toBeUndefined();
});
