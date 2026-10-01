import * as service from '../service_booking';

const bookingFindUnique = jest.fn();
const bookingUpdate = jest.fn();
const bookingCount = jest.fn();
const agreementFindFirst = jest.fn();
const propertyFindUnique = jest.fn();
const propertyUpdate = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    booking: {
      findUnique: (...args: any[]) => bookingFindUnique(...args),
      update: (...args: any[]) => bookingUpdate(...args),
      count: (...args: any[]) => bookingCount(...args),
    },
    agreement: {
      findFirst: (...args: any[]) => agreementFindFirst(...args),
    },
    property: {
      findUnique: (...args: any[]) => propertyFindUnique(...args),
      update: (...args: any[]) => propertyUpdate(...args),
    },
  },
}));

const pendingApplication = {
  id: 'booking-1',
  userId: 'tenant-1',
  propertyId: 'property-1',
  status: 'PENDING',
};

beforeEach(() => {
  jest.clearAllMocks();
  bookingFindUnique.mockResolvedValue({ ...pendingApplication });
  bookingUpdate.mockImplementation(async ({ data }: any) => ({ ...pendingApplication, ...data }));
  bookingCount.mockResolvedValue(0);
  propertyFindUnique.mockResolvedValue({ id: 'property-1', status: 'RENTED' });
  propertyUpdate.mockResolvedValue({ id: 'property-1' });
});

test('landlord approval persists the offer and advances the application', async () => {
  const result = await service.approveApplication('booking-1', {
    monthlyRent: 1800,
    security_deposit: 3600,
    utility_deposit: 500,
    offer_expiry: '2099-12-31T00:00:00.000Z',
  });

  expect(bookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'booking-1' },
    data: expect.objectContaining({
      status: 'CONFIRMED',
      application_stage: 'APPROVED',
      totalAmount: 1800,
      security_deposit: 3600,
      utility_deposit: 500,
    }),
  }));
  expect(result.status).toBe('CONFIRMED');
});

test('an application cannot be approved with an expired offer', async () => {
  await expect(service.approveApplication('booking-1', {
    security_deposit: 3600,
    utility_deposit: 500,
    offer_expiry: '2020-01-01T00:00:00.000Z',
  })).rejects.toThrow('future date');

  expect(bookingFindUnique).not.toHaveBeenCalled();
  expect(bookingUpdate).not.toHaveBeenCalled();
});

test('a tenant cannot withdraw another tenant application', async () => {
  await expect(service.withdrawApplication('booking-1', 'tenant-2'))
    .rejects.toThrow('only withdraw your own application');

  expect(bookingUpdate).not.toHaveBeenCalled();
});

test('move-in requires a signed agreement before activating the tenancy', async () => {
  bookingFindUnique.mockResolvedValue({ ...pendingApplication, status: 'CONFIRMED', property: { id: 'property-1' } });
  agreementFindFirst.mockResolvedValue(null);

  await expect(service.confirmMoveIn('booking-1', { keyHandover: true }))
    .rejects.toThrow('fully signed tenancy agreement');

  expect(bookingUpdate).not.toHaveBeenCalled();
  expect(propertyUpdate).not.toHaveBeenCalled();
});

test('signed agreement move-in activates the tenancy and marks the property rented', async () => {
  bookingFindUnique.mockResolvedValue({ ...pendingApplication, status: 'CONFIRMED', property: { id: 'property-1' } });
  agreementFindFirst.mockResolvedValue({ id: 'agreement-1', status: 'FULLY_SIGNED' });

  const result = await service.confirmMoveIn('booking-1', {
    conditionReport: 'No existing damage',
    keyHandover: true,
  });

  expect(bookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      status: 'CHECKED_IN',
      moveInConditionReport: 'No existing damage',
      keyHandoverConfirmedAt: expect.any(Date),
    }),
  }));
  expect(propertyUpdate).toHaveBeenCalledWith({
    where: { id: 'property-1' },
    data: { status: 'RENTED' },
  });
  expect(result.status).toBe('CHECKED_IN');
});

test('move-out closes the tenancy and releases an unrestricted property', async () => {
  bookingFindUnique.mockResolvedValue({ ...pendingApplication, status: 'CHECKED_IN' });

  const result = await service.confirmMoveOut('booking-1', { conditionReport: 'Inspection complete' });

  expect(bookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      status: 'CHECKED_OUT',
      moveOutConditionReport: 'Inspection complete',
      closedAt: expect.any(Date),
    }),
  }));
  expect(bookingCount).toHaveBeenCalledWith({
    where: { propertyId: 'property-1', status: 'CHECKED_IN' },
  });
  expect(propertyUpdate).toHaveBeenCalledWith({
    where: { id: 'property-1' },
    data: { status: 'AVAILABLE' },
  });
  expect(result.status).toBe('CHECKED_OUT');
});

