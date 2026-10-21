import { PaymentController } from '../controller_payment';
import * as paymentService from '../service_payment';

jest.mock('../service_payment');
jest.mock('../../admin/service_audit', () => ({ recordAudit: jest.fn().mockResolvedValue({}) }));
jest.mock('../../../utils/propertyAuthority', () => ({ hasPropertyAuthority: jest.fn().mockResolvedValue(true) }));

function response() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const property = { id: 'property-1', title: 'Unit One', ownerId: 'landlord-owner' };

beforeEach(() => jest.clearAllMocks());

test('landlord list uses the owned-property payment query', async () => {
  (paymentService.getLandlordPayments as jest.Mock).mockResolvedValue({ payments: [], total: 0 });
  const req: any = {
    user: { id: 'landlord-owner', role: 'Landlord' }, query: {}, headers: {}, socket: {},
    originalUrl: '/payments', method: 'GET',
  };
  const res = response();

  await new PaymentController().list(req, res);

  expect(paymentService.getLandlordPayments).toHaveBeenCalledWith('landlord-owner', 1, 10);
  expect(paymentService.getPayments).not.toHaveBeenCalled();
});

test('landlord cannot mark a payment for another landlord property as paid', async () => {
  (paymentService.getPaymentById as jest.Mock).mockResolvedValue({
    id: 'payment-1', booking: { property: { ...property, ownerId: 'different-landlord' } },
  });
  const req: any = {
    user: { id: 'landlord-owner', role: 'Landlord' }, params: { id: 'payment-1' },
    headers: {}, socket: {}, originalUrl: '/payments/payment-1/mark-paid', method: 'PATCH',
  };
  const res = response();

  await new PaymentController().markPaid(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(paymentService.markAsPaid).not.toHaveBeenCalled();
});

test('agent payment detail excludes tenant and transaction information', async () => {
  (paymentService.getPaymentById as jest.Mock).mockResolvedValue({
    id: 'payment-1', userId: 'tenant-1', amount: 1500, status: 'UNPAID',
    due_date: new Date('2026-11-01'), paid_at: null, reference: 'PRIVATE-REF',
    user: { id: 'tenant-1', full_name: 'Tenant', email: 'tenant@example.com' },
    booking: { propertyId: property.id, property }, transactions: [{ id: 'private-transaction' }],
  });
  const req: any = {
    user: { id: 'agent-user', role: 'Agent' }, params: { id: 'payment-1' },
    headers: {}, socket: {}, originalUrl: '/payments/payment-1', method: 'GET',
  };
  const res = response();

  await new PaymentController().getById(req, res);

  const payload = res.json.mock.calls[0][0].data;
  expect(payload).toEqual(expect.objectContaining({ id: 'payment-1', amount: 1500, status: 'UNPAID' }));
  expect(payload.user).toBeUndefined();
  expect(payload.reference).toBeUndefined();
  expect(payload.transactions).toBeUndefined();
});
