import { prisma } from '../../db';

const includeStandard = {
  property: { select: { id: true, title: true, address: true, ownerId: true } },
  tenant: { select: { id: true, full_name: true, email: true } },
};

export async function requestViewing(data: {
  propertyId: string;
  preferredTime: string;
  alternativeTime?: string;
  message?: string;
}, tenantId: string) {
  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) throw new Error('Property not found');
  const preferred = new Date(data.preferredTime);
  if (Number.isNaN(preferred.getTime()) || preferred.getTime() <= Date.now()) {
    throw new Error('Preferred viewing time must be a valid date in the future');
  }
  const alternative = data.alternativeTime ? new Date(data.alternativeTime) : undefined;
  if (alternative && (Number.isNaN(alternative.getTime()) || alternative.getTime() <= Date.now())) {
    throw new Error('Alternative viewing time must be a valid date in the future');
  }
  return prisma.viewingAppointment.create({
    data: {
      propertyId: data.propertyId,
      tenantId,
      preferredTime: preferred,
      alternativeTime: alternative,
      message: data.message,
      status: 'REQUESTED',
    },
    include: includeStandard,
  });
}

export async function getById(id: string) {
  return prisma.viewingAppointment.findUnique({ where: { id }, include: includeStandard });
}

export async function getAllViewings() {
  return prisma.viewingAppointment.findMany({ include: includeStandard, orderBy: { created_at: 'desc' } });
}

export async function getMyViewings(tenantId: string) {
  return prisma.viewingAppointment.findMany({
    where: { tenantId },
    include: includeStandard,
    orderBy: { created_at: 'desc' },
  });
}

export async function getLandlordViewings(landlordId: string) {
  return prisma.viewingAppointment.findMany({
    where: { property: { ownerId: landlordId } },
    include: includeStandard,
    orderBy: { created_at: 'desc' },
  });
}

export async function getAgentViewings(userId: string) {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) return [];
  const assigned = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  const propertyIds = assigned.map((a) => a.propertyId);
  if (!propertyIds.length) return [];
  return prisma.viewingAppointment.findMany({
    where: { propertyId: { in: propertyIds } },
    include: includeStandard,
    orderBy: { created_at: 'desc' },
  });
}

export async function reschedule(id: string, tenantId: string, data: { preferredTime?: string; alternativeTime?: string; message?: string }) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (viewing.tenantId !== tenantId) throw new Error('You can only reschedule your own viewing request');
  if (!['REQUESTED', 'ACCEPTED', 'PROPOSED_ALTERNATE'].includes(viewing.status)) {
    throw new Error('This viewing can no longer be rescheduled');
  }
  if (data.preferredTime && new Date(data.preferredTime).getTime() <= Date.now()) {
    throw new Error('Preferred viewing time must be in the future');
  }
  if (data.alternativeTime && new Date(data.alternativeTime).getTime() <= Date.now()) {
    throw new Error('Alternative viewing time must be in the future');
  }
  return prisma.viewingAppointment.update({
    where: { id },
    data: {
      preferredTime: data.preferredTime ? new Date(data.preferredTime) : undefined,
      alternativeTime: data.alternativeTime ? new Date(data.alternativeTime) : undefined,
      message: data.message,
      status: 'REQUESTED',
      proposedTime: null,
    },
    include: includeStandard,
  });
}

export async function cancel(id: string, userId: string, isLandlordOrAgent: boolean) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (!isLandlordOrAgent && viewing.tenantId !== userId) throw new Error('You can only cancel your own viewing request');
  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(viewing.status)) throw new Error('This viewing is already closed');
  return prisma.viewingAppointment.update({ where: { id }, data: { status: 'CANCELLED' }, include: includeStandard });
}

export async function accept(id: string, respondedById: string) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (viewing.status !== 'REQUESTED') throw new Error('Only a newly requested viewing can be accepted');
  return prisma.viewingAppointment.update({
    where: { id },
    data: { status: 'ACCEPTED', respondedById },
    include: includeStandard,
  });
}

export async function proposeAlternate(id: string, respondedById: string, proposedTime: string) {
  if (!proposedTime) throw new Error('A proposed time is required');
  if (new Date(proposedTime).getTime() <= Date.now()) throw new Error('Proposed viewing time must be in the future');
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (!['REQUESTED', 'ACCEPTED'].includes(viewing.status)) throw new Error('An alternate time can only be proposed for a pending viewing');
  return prisma.viewingAppointment.update({
    where: { id },
    data: { status: 'PROPOSED_ALTERNATE', proposedTime: new Date(proposedTime), respondedById },
    include: includeStandard,
  });
}

// Viewings booked back-to-back on the same property need a gap to actually
// walk through it — anything closer than this to an already-confirmed slot
// counts as an overlap.
const VIEWING_BUFFER_MS = 60 * 60 * 1000;

async function assertNoOverlap(propertyId: string, time: Date, excludeId: string) {
  const nearby = await prisma.viewingAppointment.findMany({
    where: {
      propertyId,
      status: 'CONFIRMED',
      id: { not: excludeId },
    },
  });
  const conflict = nearby.some((v) => Math.abs(v.preferredTime.getTime() - time.getTime()) < VIEWING_BUFFER_MS);
  if (conflict) throw new Error('This property already has a confirmed viewing too close to that time — pick a different slot');
}

export async function confirmAttendance(id: string, tenantId: string) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (viewing.tenantId !== tenantId) throw new Error('You can only confirm your own viewing');
  if (!['ACCEPTED', 'PROPOSED_ALTERNATE'].includes(viewing.status)) throw new Error('This viewing is not ready to be confirmed');
  const finalTime = viewing.status === 'PROPOSED_ALTERNATE' && viewing.proposedTime ? viewing.proposedTime : viewing.preferredTime;
  await assertNoOverlap(viewing.propertyId, finalTime, viewing.id);
  return prisma.viewingAppointment.update({
    where: { id },
    data: {
      status: 'CONFIRMED',
      preferredTime: viewing.status === 'PROPOSED_ALTERNATE' && viewing.proposedTime ? viewing.proposedTime : undefined,
    },
    include: includeStandard,
  });
}

export async function markCompleted(id: string, respondedById: string) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (viewing.status !== 'CONFIRMED') throw new Error('Only a confirmed viewing can be marked completed');
  return prisma.viewingAppointment.update({ where: { id }, data: { status: 'COMPLETED', respondedById }, include: includeStandard });
}

export async function markNoShow(id: string, respondedById: string) {
  const viewing = await prisma.viewingAppointment.findUnique({ where: { id } });
  if (!viewing) throw new Error('Viewing appointment not found');
  if (viewing.status !== 'CONFIRMED') throw new Error('Only a confirmed viewing can be marked as a no-show');
  return prisma.viewingAppointment.update({ where: { id }, data: { status: 'NO_SHOW', respondedById }, include: includeStandard });
}
