import { prisma } from '../../db';

export async function getBookings(page = 1, limit = 10, userId?: string, status?: string) {
  const where: any = {};
  if (userId) where.userId = userId;
  // BookingStatus enum values are uppercase; accept either case from callers.
  if (status) where.status = status.toUpperCase();
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } }),
    prisma.booking.count({ where }),
  ]);
  return { bookings, total };
}

export async function getLandlordBookings(userId: string, page = 1, limit = 10, status?: string) {
  const where: any = { property: { ownerId: userId } };
  if (status) where.status = status.toUpperCase();

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' },
      include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
    }),
    prisma.booking.count({ where }),
  ]);
  return { bookings, total };
}

export async function getAgentBookings(userId: string, page = 1, limit = 10, status?: string) {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) return { bookings: [], total: 0 };

  const assigned = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  const propertyIds = assigned.map((a) => a.propertyId);
  if (!propertyIds.length) return { bookings: [], total: 0 };

  const where: any = { propertyId: { in: propertyIds } };
  if (status) where.status = status.toUpperCase();

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' },
      include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
    }),
    prisma.booking.count({ where }),
  ]);
  return { bookings, total };
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } });
}

export async function createBooking(data: {
  propertyId: string;
  start_date: string;
  end_date?: string;
  totalAmount?: number;
  alternative_start_date?: string;
  lease_duration_months?: number;
  occupants?: number;
  applicant_message?: string;
  pdpa_consent?: boolean;
  acknowledgement?: boolean;
}, userId: string) {
  // totalAmount is computed server-side (nights × the property's nightly
  // rent) rather than trusted from the client — the booking UI never sends
  // it at all (every booking was silently landing at 0), and even where a
  // client does send one, price must not be client-controlled.
  const property = await prisma.property.findUnique({ where: { id: data.propertyId }, select: { rent: true } });
  if (!property) throw new Error('Property not found');
  const start = new Date(data.start_date);

  // Rental applications express duration in months and expect the end
  // date to be calculated automatically; the legacy short-stay flow still
  // sends an explicit end_date directly.
  let end: Date;
  if (data.end_date) {
    end = new Date(data.end_date);
  } else if (data.lease_duration_months) {
    end = new Date(start);
    end.setMonth(end.getMonth() + data.lease_duration_months);
  } else {
    throw new Error('end_date or lease_duration_months is required');
  }
  // A rental application's "amount" is the monthly rent basis (confirmed
  // properly during landlord review) — not nights × rate, which is a
  // leftover from the old short-stay model and produces an absurd total
  // for a months-long lease. The legacy flow (explicit end_date, no lease
  // duration) keeps the nights-based calculation for compatibility.
  const totalAmount = data.lease_duration_months
    ? property.rent
    : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) * property.rent;

  return prisma.booking.create({
    data: {
      property: { connect: { id: data.propertyId } },
      start_date: start,
      end_date: end,
      totalAmount,
      user: { connect: { id: userId } },
      alternative_start_date: data.alternative_start_date ? new Date(data.alternative_start_date) : undefined,
      lease_duration_months: data.lease_duration_months,
      occupants: data.occupants,
      applicant_message: data.applicant_message,
      pdpa_consent: !!data.pdpa_consent,
      acknowledgement: !!data.acknowledgement,
      application_stage: 'SUBMITTED',
    },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

/* ────────────────────────────────────────────────────────────
   Application review, offer and tenancy lifecycle
   ──────────────────────────────────────────────────────────── */

export async function setUnderReview(id: string, reviewerNotes?: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Application not found');
  if (booking.status === 'CANCELLED') throw new Error('This application is closed and cannot be reviewed');
  return prisma.booking.update({
    where: { id },
    data: { application_stage: 'UNDER_REVIEW', reviewer_notes: reviewerNotes },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

export async function requestInformation(id: string, reviewerNotes: string) {
  if (!reviewerNotes || !reviewerNotes.trim()) throw new Error('A note explaining what information is needed is required');
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Application not found');
  if (booking.status === 'CANCELLED') throw new Error('This application is closed');
  return prisma.booking.update({
    where: { id },
    data: { application_stage: 'NEEDS_INFORMATION', reviewer_notes: reviewerNotes },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

export async function approveApplication(id: string, data: {
  monthlyRent?: number;
  security_deposit: number;
  utility_deposit: number;
  offer_expiry: string;
}) {
  if (data.security_deposit == null || data.utility_deposit == null || !data.offer_expiry) {
    throw new Error('security_deposit, utility_deposit and offer_expiry are required to approve an application');
  }
  if (new Date(data.offer_expiry).getTime() <= Date.now()) {
    throw new Error('offer_expiry must be a future date');
  }
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Application not found');
  if (booking.status === 'CANCELLED') throw new Error('This application is closed and cannot be approved');
  const updateData: any = {
    status: 'CONFIRMED',
    application_stage: 'APPROVED',
    security_deposit: data.security_deposit,
    utility_deposit: data.utility_deposit,
    offer_expiry: new Date(data.offer_expiry),
    rejection_reason: null,
  };
  if (data.monthlyRent) updateData.totalAmount = data.monthlyRent;
  return prisma.booking.update({ where: { id }, data: updateData, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } });
}

export async function rejectApplication(id: string, reason: string) {
  if (!reason || !reason.trim()) throw new Error('A rejection reason is required');
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Application not found');
  if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') throw new Error('An active or completed tenancy cannot be rejected');
  return prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED', application_stage: 'REJECTED', rejection_reason: reason },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

export async function withdrawApplication(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Application not found');
  if (booking.userId !== userId) throw new Error('You can only withdraw your own application');
  if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') throw new Error('An active or completed tenancy cannot be withdrawn');
  return prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED', application_stage: 'WITHDRAWN' },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

export async function confirmMoveIn(id: string, data: { conditionReport?: string; keyHandover?: boolean }) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { property: true } });
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'CONFIRMED') throw new Error('Move-in can only be confirmed for an approved application');
  // Required prerequisite per the workflow plan: both parties must have
  // signed the tenancy agreement before a tenancy can go active. (Required
  // payments are the other prerequisite in the plan, but payment gating is
  // intentionally out of scope here.)
  const signedAgreement = await prisma.agreement.findFirst({
    where: { bookingId: id, status: { in: ['FULLY_SIGNED', 'PHYSICALLY_SIGNED'] } },
  });
  if (!signedAgreement) throw new Error('Move-in requires a fully signed tenancy agreement first');
  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: 'CHECKED_IN',
      moveInConfirmedAt: now,
      moveInConditionReport: data.conditionReport,
      keyHandoverConfirmedAt: data.keyHandover ? now : undefined,
    },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
  await prisma.property.update({ where: { id: booking.propertyId }, data: { status: 'RENTED' } });
  return updated;
}

export async function submitNotice(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'CHECKED_IN') throw new Error('A move-out notice can only be submitted for an active tenancy');
  return prisma.booking.update({
    where: { id },
    data: { noticeSubmittedAt: new Date(), noticeSubmittedById: userId },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
}

export async function confirmMoveOut(id: string, data: { conditionReport?: string }) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'CHECKED_IN') throw new Error('Move-out can only be confirmed for an active tenancy');
  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'CHECKED_OUT', moveOutInspectionAt: now, moveOutConditionReport: data.conditionReport, closedAt: now },
    include: { user: { select: { id: true, full_name: true, email: true } }, property: true },
  });
  // The property only returns to AVAILABLE when nothing else keeps it
  // occupied or restricted — a maintenance hold takes precedence, and
  // another still-active tenancy on the same property must not be
  // silently released.
  const property = await prisma.property.findUnique({ where: { id: booking.propertyId } });
  if (property && property.status !== 'MAINTENANCE') {
    const stillActive = await prisma.booking.count({ where: { propertyId: booking.propertyId, status: 'CHECKED_IN' } });
    if (stillActive === 0) {
      await prisma.property.update({ where: { id: booking.propertyId }, data: { status: 'AVAILABLE' } });
    }
  }
  return updated;
}

export async function updateBooking(id: string, data: { status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'; totalAmount?: number; }) {
  return prisma.booking.update({ where: { id }, data, include: { user: { select: { id: true, full_name: true, email: true } }, property: true } });
}

export async function cancelBooking(id: string) {
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function deleteBooking(id: string) {
  const [paymentCount, invoiceCount, agreementCount] = await Promise.all([
    prisma.payment.count({ where: { bookingId: id } }),
    prisma.invoice.count({ where: { bookingId: id } }),
    prisma.agreement.count({ where: { bookingId: id } }),
  ]);
  if (paymentCount > 0 || invoiceCount > 0) {
    throw new Error('Cannot delete a booking with payment or invoice records. Cancel it instead to preserve the financial history.');
  }
  if (agreementCount > 0) {
    throw new Error('Cannot delete an application that has a tenancy agreement. Cancel it instead to preserve the agreement history.');
  }
  return prisma.booking.delete({ where: { id } });
}

export async function getMyBookings(userId: string) {
  // Nested include so property.images actually comes through - a bare
  // `property: true` leaves that nested relation empty, so MyBookings.jsx
  // would always fall back to the placeholder image even when the
  // property has real photos.
  return prisma.booking.findMany({ where: { userId }, include: { property: { include: { images: true } } } });
}

export async function checkOverlap(
  propertyId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string,
): Promise<{ hasOverlap: boolean; overlapping: any[] }> {
  const overlaps = await prisma.booking.findMany({
    where: {
      propertyId,
      status: { notIn: ['CANCELLED'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      OR: [
        {
          start_date: { lte: new Date(endDate) },
          end_date: { gte: new Date(startDate) },
        },
      ],
    },
    include: { user: { select: { id: true, full_name: true } } },
  });

  return { hasOverlap: overlaps.length > 0, overlapping: overlaps };
}

export async function getBookingSummary(): Promise<{ pending: number; confirmed: number; active: number; cancelled: number; total: number }> {
  const [pending, confirmed, active, cancelled] = await Promise.all([
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { status: 'CHECKED_IN' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
  ]);
  return { pending, confirmed, active, cancelled, total: pending + confirmed + active + cancelled };
}
