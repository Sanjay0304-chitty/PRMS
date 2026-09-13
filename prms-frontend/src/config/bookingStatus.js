/**
 * Display label for a Booking.status value (and other UPPER_SNAKE status/type
 * strings used across bookings, maintenance and notifications). The
 * underlying BookingStatus enum still uses CHECKED_IN/CHECKED_OUT (kept as-is
 * to avoid a schema migration), but the tenancy has been "Move-In" /
 * "Move-Out" terminology everywhere else since the rental-application
 * rewrite, so those two values get a friendly override; everything else
 * falls back to a generic Title Case of the raw value.
 */
const OVERRIDES = {
  CHECKED_IN: 'Moved In',
  CHECKED_OUT: 'Moved Out',
};

export function bookingStatusLabel(value) {
  if (!value) return 'Unknown';
  const upper = String(value).toUpperCase();
  if (OVERRIDES[upper]) return OVERRIDES[upper];
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
