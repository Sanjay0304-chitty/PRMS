import * as service from '../service_booking';

const propertyFindUnique = jest.fn();
const bookingCreate = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    property: { findUnique: (...args: any[]) => propertyFindUnique(...args) },
    booking: { create: (...args: any[]) => bookingCreate(...args) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  propertyFindUnique.mockResolvedValue({ rent: 1500 });
  bookingCreate.mockResolvedValue({ id: 'booking-1', status: 'PENDING' });
});

test('rejects an invalid booking start date before database access', async () => {
  await expect(service.createBooking({ propertyId: 'property-1', start_date: 'invalid', end_date: '2026-11-01' }, 'tenant-1'))
    .rejects.toThrow('valid start_date');
  expect(propertyFindUnique).not.toHaveBeenCalled();
});

test('rejects an end date that is not after the start date', async () => {
  await expect(service.createBooking({ propertyId: 'property-1', start_date: '2026-11-02', end_date: '2026-11-01' }, 'tenant-1'))
    .rejects.toThrow('after start_date');
  expect(bookingCreate).not.toHaveBeenCalled();
});

test('rejects invalid occupants and lease duration', async () => {
  await expect(service.createBooking({ propertyId: 'property-1', start_date: '2026-11-01', lease_duration_months: 0 }, 'tenant-1'))
    .rejects.toThrow('positive whole number');
  await expect(service.createBooking({ propertyId: 'property-1', start_date: '2026-11-01', lease_duration_months: 12, occupants: 0 }, 'tenant-1'))
    .rejects.toThrow('occupants must be a positive whole number');
});

test('creates a valid rental application with pending status supplied by the schema default', async () => {
  await service.createBooking({
    propertyId: 'property-1',
    start_date: '2026-11-01',
    lease_duration_months: 12,
    occupants: 2,
    pdpa_consent: true,
    acknowledgement: true,
  }, 'tenant-1');

  expect(bookingCreate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      property: { connect: { id: 'property-1' } },
      user: { connect: { id: 'tenant-1' } },
      totalAmount: 1500,
      application_stage: 'SUBMITTED',
    }),
  }));
});
