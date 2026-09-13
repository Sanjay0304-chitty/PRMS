import crypto from 'crypto';
import { prisma } from '../../db';

const includeStandard = {
  booking: {
    include: {
      user: { select: { id: true, full_name: true, email: true } },
      property: { select: { id: true, title: true, address: true, city: true, state: true, ownerId: true, owner: { select: { id: true, full_name: true, email: true } } } },
    },
  },
};

function makeReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AGR-${date}-${rand}`;
}

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateAgreement(bookingId: string, terms?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { property: true } });
  if (!booking) throw new Error('Application not found');
  if (booking.status !== 'CONFIRMED') throw new Error('An agreement can only be generated for an approved application');
  if (booking.offer_expiry && booking.offer_expiry.getTime() <= Date.now()) {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', application_stage: 'EXPIRED' } });
    throw new Error('The rental offer has expired — a new offer must be issued before an agreement can be generated');
  }

  const existing = await prisma.agreement.findMany({ where: { bookingId }, orderBy: { version: 'desc' } });
  const nextVersion = existing.length ? existing[0].version + 1 : 1;

  // Any prior non-terminal agreement is superseded, never silently
  // overwritten — a fresh version always starts from DRAFT.
  await prisma.agreement.updateMany({
    where: { bookingId, status: { notIn: ['SUPERSEDED', 'CANCELLED'] } },
    data: { status: 'SUPERSEDED' },
  });

  const agreement = await prisma.agreement.create({
    data: {
      bookingId,
      version: nextVersion,
      reference: makeReference(),
      status: 'DRAFT',
      monthlyRent: booking.totalAmount || booking.property.rent,
      securityDeposit: booking.security_deposit ?? booking.property.rent,
      utilityDeposit: booking.utility_deposit ?? 0,
      leaseStartDate: booking.start_date,
      leaseEndDate: booking.end_date,
      terms: terms ?? null,
    },
    include: includeStandard,
  });
  return agreement;
}

export async function getById(id: string) {
  return prisma.agreement.findUnique({ where: { id }, include: includeStandard });
}

export async function getByBooking(bookingId: string) {
  return prisma.agreement.findMany({ where: { bookingId }, include: includeStandard, orderBy: { version: 'desc' } });
}

export async function updateDraft(id: string, data: { monthlyRent?: number; securityDeposit?: number; utilityDeposit?: number; leaseStartDate?: string; leaseEndDate?: string; terms?: string }) {
  const agreement = await prisma.agreement.findUnique({ where: { id } });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'DRAFT') throw new Error('Only a draft agreement can be edited — signing has already started on this version');
  return prisma.agreement.update({
    where: { id },
    data: {
      monthlyRent: data.monthlyRent,
      securityDeposit: data.securityDeposit,
      utilityDeposit: data.utilityDeposit,
      leaseStartDate: data.leaseStartDate ? new Date(data.leaseStartDate) : undefined,
      leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate) : undefined,
      terms: data.terms,
    },
    include: includeStandard,
  });
}

/* ── Electronic signing ── */

export async function tenantConsent(id: string, tenantId: string, legalName: string) {
  if (!legalName || !legalName.trim()) throw new Error('Your typed legal name is required to consent');
  const agreement = await prisma.agreement.findUnique({ where: { id }, include: { booking: true } });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.booking.userId !== tenantId) throw new Error('You can only sign your own tenancy agreement');
  if (agreement.status !== 'DRAFT') throw new Error('This agreement is not awaiting your signature');
  const otp = makeOtp();
  const updated = await prisma.agreement.update({
    where: { id },
    data: {
      signingMethod: 'ELECTRONIC',
      tenantConsentAt: new Date(),
      tenantLegalName: legalName.trim(),
      tenantOtp: otp,
      status: 'AWAITING_TENANT_SIGNATURE',
    },
    include: includeStandard,
  });
  // Demonstration mode: the simulated OTP is returned directly instead of
  // being delivered by SMS/email, since no such channel exists here.
  return { agreement: updated, simulatedOtp: otp };
}

export async function verifyTenantOtp(id: string, tenantId: string, otp: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id }, include: { booking: true } });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.booking.userId !== tenantId) throw new Error('You can only sign your own tenancy agreement');
  if (agreement.status !== 'AWAITING_TENANT_SIGNATURE') throw new Error('This agreement is not awaiting OTP verification');
  if (!otp || otp !== agreement.tenantOtp) throw new Error('Incorrect or expired verification code');
  return prisma.agreement.update({
    where: { id },
    data: { tenantOtpVerifiedAt: new Date(), tenantSignedAt: new Date(), tenantOtp: null, status: 'AWAITING_LANDLORD_SIGNATURE' },
    include: includeStandard,
  });
}

export async function landlordSign(id: string, landlordId: string, legalName: string) {
  if (!legalName || !legalName.trim()) throw new Error('Your typed legal name is required to sign');
  const agreement = await prisma.agreement.findUnique({ where: { id }, include: { booking: { include: { property: true } } } });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.booking.property.ownerId !== landlordId) throw new Error('Only the property owner can sign as landlord');
  if (agreement.status !== 'AWAITING_LANDLORD_SIGNATURE') throw new Error('This agreement is not awaiting the landlord signature');
  const hash = crypto
    .createHash('sha256')
    .update(`${agreement.id}|${agreement.reference}|${agreement.tenantSignedAt}|${new Date().toISOString()}|${legalName.trim()}`)
    .digest('hex');
  return prisma.agreement.update({
    where: { id },
    data: { landlordSignedAt: new Date(), landlordLegalName: legalName.trim(), documentHash: hash, status: 'FULLY_SIGNED' },
    include: includeStandard,
  });
}

/* ── Physical signing ── */

export async function uploadPhysicalCopy(id: string, userId: string, url: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id }, include: { booking: { include: { property: true } } } });
  if (!agreement) throw new Error('Agreement not found');
  const isTenant = agreement.booking.userId === userId;
  const isLandlord = agreement.booking.property.ownerId === userId;
  if (!isTenant && !isLandlord) throw new Error('You do not have access to this agreement');
  if (!['DRAFT', 'PHYSICAL_COPY_PENDING'].includes(agreement.status)) throw new Error('This agreement can no longer accept a physical copy upload');
  return prisma.agreement.update({
    where: { id },
    data: { signingMethod: 'PHYSICAL', physicalCopyUrl: url, status: 'PHYSICAL_COPY_PENDING' },
    include: includeStandard,
  });
}

export async function verifyPhysicalCopy(id: string, verifierId: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id }, include: { booking: { include: { property: true } } } });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'PHYSICAL_COPY_PENDING') throw new Error('There is no uploaded physical copy awaiting verification');
  return prisma.agreement.update({
    where: { id },
    data: { status: 'PHYSICALLY_SIGNED', physicalVerifiedAt: new Date(), physicalVerifiedById: verifierId },
    include: includeStandard,
  });
}

export async function cancelAgreement(id: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id } });
  if (!agreement) throw new Error('Agreement not found');
  if (['FULLY_SIGNED', 'PHYSICALLY_SIGNED'].includes(agreement.status)) throw new Error('A fully signed agreement cannot be cancelled — supersede it with a new version instead');
  return prisma.agreement.update({ where: { id }, data: { status: 'CANCELLED' }, include: includeStandard });
}
