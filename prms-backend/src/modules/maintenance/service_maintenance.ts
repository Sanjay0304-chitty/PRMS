import { prisma } from '../../db';

const includeTicket = {
  user: { select: { id: true, full_name: true, email: true, phone: true } },
  attachments: { orderBy: { created_at: 'desc' as const } },
  activities: { orderBy: { created_at: 'desc' as const } },
};

export const EXPENSIVE_REPAIR_THRESHOLD = 1000;

export async function getPropertyMaintenanceRecipients(propertyId: string, tenantId?: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
  const assignments = await prisma.agentProperty.findMany({
    where: { propertyId },
    select: { agent: { select: { userId: true } } },
  });
  return Array.from(new Set([
    tenantId,
    property?.ownerId,
    ...assignments.map((item) => item.agent.userId),
  ].filter((id): id is string => !!id)));
}

export async function getTickets(page = 1, limit = 10, userId?: string, status?: string) {
  const where: any = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  const [tickets, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      // NOTE: no Prisma relation exists for propertyId -> Property on this
      // model (just a bare string column, unlike Booking's real relation) -
      // can't include it without a schema change, so ticket.property stays
      // unavailable from this endpoint for now.
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' },
      include: includeTicket,
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getLandlordTickets(userId: string, page = 1, limit = 10, status?: string) {
  const owned = await prisma.property.findMany({ where: { ownerId: userId }, select: { id: true } });
  const propertyIds = owned.map((p) => p.id);
  if (!propertyIds.length) return { tickets: [], total: 0 };

  const where: any = { propertyId: { in: propertyIds } };
  if (status) where.status = status;

  const [tickets, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' },
      include: includeTicket,
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getAgentTickets(userId: string, page = 1, limit = 10, status?: string) {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) return { tickets: [], total: 0 };

  const assigned = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  const propertyIds = assigned.map((a) => a.propertyId);
  if (!propertyIds.length) return { tickets: [], total: 0 };

  const where: any = { propertyId: { in: propertyIds } };
  if (status) where.status = status;

  const [tickets, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' },
      include: includeTicket,
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getTicketById(id: string) {
  return prisma.maintenanceTicket.findUnique({ where: { id }, include: includeTicket });
}

export async function createTicket(data: { propertyId?: string; title: string; description: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; }, userId: string) {
  if (!data.title?.trim() || !data.description?.trim() || !data.propertyId) throw new Error('Property, title and description are required');
  return prisma.maintenanceTicket.create({
    data: {
      propertyId: data.propertyId,
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority,
      user: { connect: { id: userId } },
      activities: { create: { actorId: userId, action: 'CREATED', details: 'Maintenance request submitted' } },
    },
    include: includeTicket,
  });
}

export async function updateTicket(id: string, data: {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  inspectionNotes?: string;
  contractorName?: string;
  appointmentAt?: string;
  estimatedCost?: number;
  actualCost?: number;
  resolutionNotes?: string;
}, actorId: string, actorRole: string) {
  const current = await prisma.maintenanceTicket.findUnique({ where: { id } });
  if (!current) throw new Error('Ticket not found');

  const role = actorRole.toLowerCase();
  const transitions: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['IN_PROGRESS', 'CLOSED'],
    CLOSED: [],
  };
  if (data.status && data.status !== current.status) {
    if (!transitions[current.status]?.includes(data.status)) throw new Error(`Invalid maintenance status transition from ${current.status} to ${data.status}`);
    if (data.status === 'CLOSED' && !['admin', 'landlord', 'tenant'].includes(role)) throw new Error('Only the tenant, property owner, or an administrator can close a maintenance ticket');
  }

  const estimatedCost = data.estimatedCost === undefined ? current.estimatedCost : Number(data.estimatedCost);
  const approvalRequired = estimatedCost != null && estimatedCost >= EXPENSIVE_REPAIR_THRESHOLD;
  if (data.status === 'RESOLVED' && approvalRequired && current.approvalStatus !== 'APPROVED') {
    throw new Error(`Repairs estimated at RM${EXPENSIVE_REPAIR_THRESHOLD} or more require landlord approval before resolution`);
  }

  // Build an explicit allow-list. Never pass req.body through to Prisma:
  // otherwise an Agent could forge approvalStatus/approvedById fields that
  // are reserved for the landlord cost-approval endpoint.
  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
  if (data.inspectionNotes !== undefined) updateData.inspectionNotes = data.inspectionNotes?.trim() || null;
  if (data.contractorName !== undefined) updateData.contractorName = data.contractorName?.trim() || null;
  if (data.resolutionNotes !== undefined) updateData.resolutionNotes = data.resolutionNotes?.trim() || null;
  if (data.appointmentAt !== undefined) updateData.appointmentAt = data.appointmentAt ? new Date(data.appointmentAt) : null;
  if (data.estimatedCost !== undefined) {
    updateData.estimatedCost = Number(data.estimatedCost);
    updateData.approvalRequired = approvalRequired;
    if (approvalRequired && Number(data.estimatedCost) !== current.estimatedCost) {
      updateData.approvalStatus = 'PENDING';
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }
    if (!approvalRequired) {
      updateData.approvalStatus = null;
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }
  }
  if (data.actualCost !== undefined) updateData.actualCost = Number(data.actualCost);
  if (data.status === 'RESOLVED') updateData.resolved_at = new Date();
  if (data.status === 'IN_PROGRESS') updateData.resolved_at = null;

  const details = [
    data.status ? `Status: ${data.status}` : null,
    data.contractorName ? `Contractor: ${data.contractorName}` : null,
    data.estimatedCost !== undefined ? `Estimated cost: RM${Number(data.estimatedCost).toFixed(2)}` : null,
    data.inspectionNotes?.trim() || null,
  ].filter(Boolean).join(' | ') || 'Maintenance details updated';

  return prisma.maintenanceTicket.update({
    where: { id },
    data: { ...updateData, activities: { create: { actorId, action: data.status ? `STATUS_${data.status}` : 'UPDATED', details } } },
    include: includeTicket,
  });
}

export async function approveCost(id: string, actorId: string, approved: boolean, note?: string) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
  if (!ticket) throw new Error('Ticket not found');
  if (!ticket.approvalRequired) throw new Error('This repair does not require cost approval');
  return prisma.maintenanceTicket.update({
    where: { id },
    data: {
      approvalStatus: approved ? 'APPROVED' : 'REJECTED',
      approvedAt: approved ? new Date() : null,
      approvedById: actorId,
      activities: { create: { actorId, action: approved ? 'COST_APPROVED' : 'COST_REJECTED', details: note?.trim() || null } },
    },
    include: includeTicket,
  });
}

export async function addAttachments(id: string, actorId: string, files: Array<{ filename: string; originalname: string }>) {
  if (!files.length) throw new Error('At least one photograph is required');
  await prisma.$transaction([
    ...files.map((file) => prisma.maintenanceAttachment.create({
      data: { ticketId: id, uploadedById: actorId, originalName: file.originalname, url: `/uploads/maintenance/${file.filename}` },
    })),
    prisma.maintenanceActivity.create({ data: { ticketId: id, actorId, action: 'PHOTOS_ADDED', details: `${files.length} photograph(s) uploaded` } }),
  ]);
  return getTicketById(id);
}
