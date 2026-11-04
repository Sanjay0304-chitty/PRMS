import { getAuditLogs, reviewListingReport } from '../service_audit';
import { prisma } from '../../../db';
jest.mock('../../../db', () => ({ prisma: { auditLog: { findMany: jest.fn(), count: jest.fn() }, $transaction: jest.fn() } }));
const tx: any = { auditLog: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() } };
beforeEach(() => {
  jest.clearAllMocks();
  (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
  (prisma.$transaction as jest.Mock).mockImplementation(fn => fn(tx));
  tx.auditLog.findUnique.mockResolvedValue({ id: 'report', action: 'REPORT_PROPERTY_LISTING', status: 'Success' });
  tx.auditLog.findFirst.mockResolvedValue(null);
});
test.each(['warn', 'warning'])('%s matches both warning spellings', async level => {
  await getAuditLogs(1, 25, { level });
  expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { level: { in: ['warn', 'warning'] } } }));
});
test('report view keeps exact action and search filters together', async () => {
  await getAuditLogs(1, 25, { action: 'REPORT_PROPERTY_LISTING', level: 'warning', search: 'Scam' });
  expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ action: 'REPORT_PROPERTY_LISTING', OR: expect.any(Array), level: { in: ['warn', 'warning'] } }) }));
});
test('review appends an event referencing the report, without updating the original', async () => {
  await reviewListingReport('report', { id: 'admin', email: 'admin@test' }, { status: 'UNDER_REVIEW', note: 'Checking listing' });
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityId: 'report', action: 'REVIEW_LISTING_REPORT', status: 'UNDER_REVIEW', description: 'Checking listing', userId: 'admin' }) });
});
test.each(['', '   '])('review needs a note', async note => {
  await expect(reviewListingReport('report', { id: 'admin' }, { status: 'RESOLVED', note })).rejects.toThrow('review note');
  expect(tx.auditLog.create).not.toHaveBeenCalled();
});
test('cannot review an unrelated audit event', async () => {
  tx.auditLog.findUnique.mockResolvedValue({ action: 'USER_LOGIN', status: 'Success' });
  await expect(reviewListingReport('report', { id: 'admin' }, { status: 'RESOLVED', note: 'Checked' })).rejects.toThrow('not found');
});
test('stale decisions are blocked', async () => {
  tx.auditLog.findFirst.mockResolvedValue({ id: 'newer', status: 'UNDER_REVIEW' });
  await expect(reviewListingReport('report', { id: 'admin' }, { status: 'RESOLVED', note: 'Checked', previousReviewId: 'older' })).rejects.toThrow('changed');
});
test('resolved decisions cannot be overwritten', async () => {
  tx.auditLog.findFirst.mockResolvedValue({ id: 'last', status: 'RESOLVED' });
  await expect(reviewListingReport('report', { id: 'admin' }, { status: 'DISMISSED', note: 'Checked', previousReviewId: 'last' })).rejects.toThrow('closed');
});
test('under-review report can be resolved', async () => {
  tx.auditLog.findFirst.mockResolvedValue({ id: 'last', status: 'UNDER_REVIEW' });
  await reviewListingReport('report', { id: 'admin' }, { status: 'RESOLVED', note: 'Listing corrected', previousReviewId: 'last' });
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'RESOLVED' }) });
});
