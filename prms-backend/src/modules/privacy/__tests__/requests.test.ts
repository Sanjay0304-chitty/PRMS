import { assignRequest, decideRequest, completeRequest } from '../service_privacy';
import { prisma } from '../../../db';
jest.mock('../../../db', () => ({ prisma: { privacyRequest: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() }, $transaction: jest.fn() } }));
const tx: any = { privacyRequest: { findUnique: jest.fn(), update: jest.fn() }, user: { update: jest.fn() }, booking: { count: jest.fn() }, property: { count: jest.fn() } };
beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(fn => fn(tx));
  tx.privacyRequest.findUnique.mockResolvedValue({ id: 'r', userId: 'tenant', status: 'APPROVED', assignedAdminId: 'admin', type: 'DELETION', details: 'Close account' });
  tx.booking.count.mockResolvedValue(0); tx.property.count.mockResolvedValue(0);
});
test('assignment uses a conditional update to prevent taking an assigned request', async () => {
  (prisma.privacyRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  await expect(assignRequest('r', 'admin')).rejects.toThrow('no longer available');
  expect(prisma.privacyRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r', status: 'SUBMITTED', assignedAdminId: null } }));
});
test('decision rejects arbitrary statuses before writing', async () => {
  await expect(decideRequest('r', 'admin', { decision: 'COMPLETED', decisionReason: 'test' })).rejects.toThrow('Choose APPROVED or REJECTED');
  expect(prisma.privacyRequest.updateMany).not.toHaveBeenCalled();
});
test('decision requires assigned Admin and review status', async () => {
  (prisma.privacyRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  await expect(decideRequest('r', 'other', { decision: 'APPROVED', decisionReason: 'Reviewed' })).rejects.toThrow('assigned Admin');
  expect(prisma.privacyRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r', status: 'IN_REVIEW', assignedAdminId: 'other' } }));
});
test('completion requires fulfillment notes', async () => {
  await expect(completeRequest('r', 'admin', ' ')).rejects.toThrow('Describe');
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test('another Admin cannot complete an approved request', async () => {
  await expect(completeRequest('r', 'other', 'Reviewed')).rejects.toThrow('assigned Admin');
  expect(tx.user.update).not.toHaveBeenCalled();
});
test('unapproved requests cannot be completed', async () => {
  tx.privacyRequest.findUnique.mockResolvedValue({ status: 'IN_REVIEW', assignedAdminId: 'admin' });
  await expect(completeRequest('r', 'admin', 'Reviewed')).rejects.toThrow('approved');
});
test('active tenancies prevent account closure', async () => {
  tx.booking.count.mockResolvedValue(1);
  await expect(completeRequest('r', 'admin', 'Reviewed')).rejects.toThrow('Resolve active');
  expect(tx.user.update).not.toHaveBeenCalled();
  expect(tx.privacyRequest.update).not.toHaveBeenCalled();
});
test('owned active listings prevent account closure', async () => {
  tx.property.count.mockResolvedValue(1);
  await expect(completeRequest('r', 'admin', 'Reviewed')).rejects.toThrow('Resolve active');
  expect(tx.user.update).not.toHaveBeenCalled();
});
test('closure anonymizes profile and revokes refresh token within transaction', async () => {
  await completeRequest('r', 'admin', 'Reviewed retained records');
  expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ is_active: false, refreshToken: null, email: 'deleted-tenant@anonymized.prms' }) }));
  expect(tx.privacyRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', details: expect.stringContaining('related records and files retained') }) }));
});
test('manual correction completion records action without changing profile automatically', async () => {
  tx.privacyRequest.findUnique.mockResolvedValue({ type: 'CORRECTION', status: 'APPROVED', assignedAdminId: 'admin' });
  await completeRequest('r', 'admin', 'Corrected phone after verification');
  expect(tx.user.update).not.toHaveBeenCalled();
  expect(tx.privacyRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ details: expect.stringContaining('Corrected phone') }) }));
});
