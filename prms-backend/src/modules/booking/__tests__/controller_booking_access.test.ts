import { BookingController } from '../controller_booking';

const getBookingById = jest.fn();
const updateBooking = jest.fn();
const createNotification = jest.fn();
const recordAudit = jest.fn();

jest.mock('../service_booking', () => ({
  getBookingById: (...args: any[]) => getBookingById(...args),
  updateBooking: (...args: any[]) => updateBooking(...args),
}));
jest.mock('../../admin/service_admin', () => ({
  createNotification: (...args: any[]) => createNotification(...args),
}));
jest.mock('../../admin/service_audit', () => ({
  recordAudit: (...args: any[]) => recordAudit(...args),
}));
jest.mock('../../../utils/propertyAuthority', () => ({ hasPropertyAuthority: jest.fn() }));

function response() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function request(role = 'Landlord', userId = 'landlord-1') {
  return {
    body: {},
    params: { id: 'booking-1' },
    user: { id: userId, email: `${userId}@prms.com`, role },
    headers: {},
    socket: {},
    originalUrl: '/bookings/booking-1/confirm',
    method: 'PATCH',
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  getBookingById.mockResolvedValue({
    id: 'booking-1',
    userId: 'tenant-1',
    propertyId: 'property-1',
    property: { id: 'property-1', ownerId: 'landlord-1', title: 'City Apartment' },
  });
  updateBooking.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
  createNotification.mockResolvedValue({ id: 'notification-1' });
});

test('property owner can confirm a booking and the tenant is notified', async () => {
  const res = response();
  await new BookingController().confirm(request(), res);

  expect(updateBooking).toHaveBeenCalledWith('booking-1', { status: 'CONFIRMED' });
  expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'tenant-1',
    type: 'booking_confirmed',
  }));
  expect(res.json).toHaveBeenCalled();
});

test('landlord cannot confirm another landlord booking', async () => {
  const res = response();
  await new BookingController().confirm(request('Landlord', 'landlord-2'), res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateBooking).not.toHaveBeenCalled();
  expect(createNotification).not.toHaveBeenCalled();
});

test('landlord cannot reject another landlord booking', async () => {
  const res = response();
  await new BookingController().reject(request('Landlord', 'landlord-2'), res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateBooking).not.toHaveBeenCalled();
});

test('administrator can reject a booking and the tenant is notified', async () => {
  updateBooking.mockResolvedValue({ id: 'booking-1', status: 'CANCELLED' });
  const res = response();
  await new BookingController().reject(request('Admin', 'admin-1'), res);

  expect(updateBooking).toHaveBeenCalledWith('booking-1', { status: 'CANCELLED' });
  expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'tenant-1',
    type: 'booking_rejected',
  }));
});

test('landlord cannot use the generic update endpoint on another property', async () => {
  const res = response();
  await new BookingController().update(request('Landlord', 'landlord-2'), res);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(updateBooking).not.toHaveBeenCalled();
});
