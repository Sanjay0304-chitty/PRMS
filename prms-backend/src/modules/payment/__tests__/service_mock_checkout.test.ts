import * as service from '../service_payment';

// Mock Prisma clients
const paymentFindUnique = jest.fn();
const paymentUpdate = jest.fn();
const txnCreate = jest.fn();
const txnFindUnique = jest.fn();
const txnUpdate = jest.fn();
const txnFindFirst = jest.fn();
const bookingFindUnique = jest.fn();
const bookingUpdate = jest.fn();
const contractFindUnique = jest.fn();
const invoiceUpdateMany = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    payment: {
      findUnique: (...args: any[]) => paymentFindUnique(...args),
      update: (...args: any[]) => paymentUpdate(...args),
    },
    mockPaymentTransaction: {
      create: (...args: any[]) => txnCreate(...args),
      findUnique: (...args: any[]) => txnFindUnique(...args),
      findFirst: (...args: any[]) => txnFindFirst(...args),
      update: (...args: any[]) => txnUpdate(...args),
    },
    booking: {
      findUnique: (...args: any[]) => bookingFindUnique(...args),
      update: (...args: any[]) => bookingUpdate(...args),
    },
    contract: {
      findUnique: (...args: any[]) => contractFindUnique(...args),
    },
    invoice: {
      updateMany: (...args: any[]) => invoiceUpdateMany(...args),
    },
    $transaction: async (ops: any[]) => Promise.all(ops.map((op) => op)),
  },
}));

beforeEach(() => jest.clearAllMocks());

// ── Helper: a valid unpaid payment ──
const unpaidPayment = {
  id: 'pay-1',
  userId: 'user-1',
  bookingId: 'book-1',
  type: 'RENT' as const,
  amount: 1500,
  currency: 'MYR',
  status: 'UNPAID' as const,
  due_date: new Date('2026-11-01'),
  paid_at: null,
  reference: null,
  method: null,
};

const mockTxn = {
  id: 'txn-1',
  paymentId: 'pay-1',
  userId: 'user-1',
  method: 'CARD',
  status: 'PENDING' as const,
  reference: 'MOCK-1234',
  failureMessage: null,
  created_at: new Date(),
  completed_at: null,
};

// Helper: transaction returned with payment included (as getMockTransaction does)
const txWithPayment = {
  ...mockTxn,
  payment: unpaidPayment,
};

// ── startMockCheckout ──
describe('startMockCheckout', () => {
  test('creates transaction and sets payment status to PENDING', async () => {
    txnFindFirst.mockResolvedValue(null);
    paymentFindUnique.mockResolvedValue(unpaidPayment);
    txnCreate.mockResolvedValue(mockTxn);

    const result = await service.startMockCheckout('pay-1', 'user-1', 'CARD');

    expect(txnCreate).toHaveBeenCalledWith({
      data: {
        paymentId: 'pay-1',
        method: 'CARD',
        status: 'PENDING',
        reference: expect.any(String),
      },
    });
    expect(result).toEqual(mockTxn);
  });

  test('rejects payment not found', async () => {
    paymentFindUnique.mockResolvedValue(null);
    await expect(service.startMockCheckout('pay-x', 'user-1', 'CARD')).rejects.toThrow('not found');
  });

  test('rejects non-UNPAID payment', async () => {
    paymentFindUnique.mockResolvedValue({ ...unpaidPayment, status: 'PAID' });
    await expect(service.startMockCheckout('pay-1', 'user-1', 'CARD')).rejects.toThrow('already been paid');
  });

  test('rejects active PENDING transaction', async () => {
    txnFindFirst.mockResolvedValue({ status: 'PENDING' });
    paymentFindUnique.mockResolvedValue({ ...unpaidPayment, status: 'PENDING' });
    await expect(service.startMockCheckout('pay-1', 'user-1', 'CARD')).rejects.toThrow('active checkout');
  });

  // Method validation is compile-time only (TypeScript union type) — no runtime check in the service
});

// ── getMockTransaction ──
describe('getMockTransaction', () => {
  test('returns transaction with payment for the given userId', async () => {
    txnFindUnique.mockResolvedValue(txWithPayment);
    const result = await service.getMockTransaction('txn-1', 'user-1');
    expect(txnFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-1' },
      }),
    );
    expect(result).toEqual(txWithPayment);
  });

  test('rejects not found', async () => {
    txnFindUnique.mockResolvedValue(null);
    await expect(service.getMockTransaction('txn-x', 'user-1')).rejects.toThrow('not found');
  });

  test('rejects when user does not own the transaction', async () => {
    txnFindUnique.mockResolvedValue({
      ...mockTxn,
      payment: { ...unpaidPayment, userId: 'other-user' },
    });
    await expect(service.getMockTransaction('txn-1', 'user-1')).rejects.toThrow('does not belong');
  });
});

// ── completeMockTransaction ──
describe('completeMockTransaction', () => {
  test('marks payment PAID on SUCCESS', async () => {
    const txWithPayment = { ...mockTxn, payment: unpaidPayment };
    txnFindUnique.mockResolvedValue(txWithPayment);
    txnUpdate.mockResolvedValue({ ...mockTxn, status: 'SUCCESS' });
    paymentUpdate.mockResolvedValue({
      ...unpaidPayment,
      status: 'PAID',
      reference: 'MOCK-1234',
      method: 'CARD',
      paid_at: new Date(),
    });
    bookingUpdate.mockResolvedValue({ id: 'book-1', paymentStatus: 'PAID' });
    invoiceUpdateMany.mockResolvedValue({ count: 0 });

    const result = await service.completeMockTransaction('txn-1', 'user-1', 'SUCCESS');

    expect(txnUpdate).toHaveBeenCalledWith({
      where: { id: 'txn-1' },
      data: expect.objectContaining({ status: 'SUCCESS' }),
    });
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: {
        status: 'PAID',
        paid_at: expect.any(Date),
        method: 'CARD',
        reference: 'MOCK-1234',
      },
    });
    expect(bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'book-1' },
      data: { paymentStatus: 'PAID' },
    });
  });

  test('marks transaction FAILED and stores failureMessage', async () => {
    const txWithPayment = { ...mockTxn, payment: unpaidPayment };
    txnFindUnique.mockResolvedValue(txWithPayment);
    txnUpdate.mockResolvedValue({ ...mockTxn, status: 'FAILED', failureMessage: 'Insufficient funds' });

    const result = await service.completeMockTransaction('txn-1', 'user-1', 'FAILED', 'Insufficient funds');

    expect(txnUpdate).toHaveBeenCalledWith({
      where: { id: 'txn-1' },
      data: expect.objectContaining({ status: 'FAILED', failureMessage: 'Insufficient funds' }),
    });
  });

  test('keeps payment unchanged on CANCELLED', async () => {
    const txWithPayment = { ...mockTxn, payment: unpaidPayment };
    txnFindUnique.mockResolvedValue(txWithPayment);
    txnUpdate.mockResolvedValue({ ...mockTxn, status: 'CANCELLED' });

    await service.completeMockTransaction('txn-1', 'user-1', 'CANCELLED');

    expect(txnUpdate).toHaveBeenCalledWith({
      where: { id: 'txn-1' },
      data: expect.objectContaining({ status: 'CANCELLED', failureMessage: expect.stringContaining('cancelled') }),
    });
    // payment is NOT updated on CANCELLED — tenant can retry
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  test('rejects when transaction is no longer PENDING', async () => {
    const txWithPayment = { ...mockTxn, status: 'SUCCESS', payment: unpaidPayment };
    txnFindUnique.mockResolvedValue(txWithPayment);
    await expect(service.completeMockTransaction('txn-1', 'user-1', 'SUCCESS')).rejects.toThrow('no longer pending');
  });

  test('rejects when user does not own the transaction', async () => {
    const txWithPayment = {
      ...mockTxn,
      payment: { ...unpaidPayment, userId: 'other-user' },
    };
    txnFindUnique.mockResolvedValue(txWithPayment);
    await expect(service.completeMockTransaction('txn-1', 'user-1', 'SUCCESS')).rejects.toThrow('does not belong');
  });
});
