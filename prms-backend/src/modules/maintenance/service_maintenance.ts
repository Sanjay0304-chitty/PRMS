import { prisma } from '../../db';

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
      include: { user: { select: { id: true, full_name: true, email: true } } },
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
      include: { user: { select: { id: true, full_name: true, email: true } } },
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
      include: { user: { select: { id: true, full_name: true, email: true } } },
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  return { tickets, total };
}

export async function getTicketById(id: string) {
  return prisma.maintenanceTicket.findUnique({ where: { id }, include: { user: { select: { id: true, full_name: true, email: true, phone: true } } } });
}

export async function createTicket(data: { title: string; description: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; }, userId: string) {
  return prisma.maintenanceTicket.create({
    data: { ...data, user: { connect: { id: userId } } },
    include: { user: { select: { id: true, full_name: true, email: true, phone: true } } },
  });
}

export async function updateTicket(id: string, data: { status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; assignedTo?: string; }) {
  return prisma.maintenanceTicket.update({
    where: { id }, data,
    include: { user: { select: { id: true, full_name: true, email: true, phone: true } } },
  });
}

export async function resolveTicket(id: string) {
  return prisma.maintenanceTicket.update({
    where: { id }, data: { status: 'RESOLVED', resolved_at: new Date() },
  });
}
