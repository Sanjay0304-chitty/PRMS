import { prisma } from '../../db';
import { Role } from '@prisma/client';

export async function getAllAgents(page = 1, limit = 10, search?: string, propertyId?: string, ownerId?: string) {
  const where: any = {};
  
  if (search) {
    where.user = {
      OR: [
        { email: { contains: search } },
        { full_name: { contains: search } }
      ]
    };
  }
  
  if (propertyId) {
    // Find agents who are assigned to this property
    const agentProperties = await prisma.agentProperty.findMany({
      where: { propertyId },
      select: { agentId: true }
    });
    const agentIds = agentProperties.map(ap => ap.agentId);
    where.id = { in: agentIds };
  }

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({ 
      where, 
      skip: (page - 1) * limit, 
      take: limit, 
      orderBy: { id: 'desc' },
      include: { 
        user: { 
          select: { 
            id: true, 
            email: true, 
            full_name: true, 
            phone: true,
            profile_img_url: true
          } 
        },
        agentProperties: {
          where: ownerId ? { property: { ownerId } } : undefined,
          include: { 
            property: { 
              select: { 
                id: true, 
                title: true, 
                address: true 
              } 
            } 
          } 
        }
      } 
    }),
    prisma.agent.count({ where }),
  ]);
  
  return { agents, total };
}

export async function getAgentById(id: string, ownerId?: string) {
  return prisma.agent.findUnique({
    where: { id },
    include: { 
      user: { 
        select: { 
          id: true, 
          email: true, 
          full_name: true, 
          phone: true,
          profile_img_url: true
        } 
      },
      agentProperties: {
        where: ownerId ? { property: { ownerId } } : undefined,
        include: { 
          property: { 
            select: { 
              id: true, 
              title: true, 
              address: true 
            } 
          } 
        } 
      } 
    },
  });
}

export async function createAgent(userId: string) {
  // First check if user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Check if agent already exists
  const existingAgent = await prisma.agent.findUnique({ where: { userId } });
  if (existingAgent) throw new Error('Agent already exists for this user');
  
  // Create agent and link it to user
  return prisma.agent.create({
    data: { 
      userId,
    },
    include: { 
      user: { 
        select: { 
          id: true, 
          email: true, 
          full_name: true, 
          phone: true,
          profile_img_url: true
        } 
      },
      agentProperties: { 
        include: { 
          property: { 
            select: { 
              id: true, 
              title: true, 
              address: true 
            } 
          } 
        } 
      } 
    }
  });
}

export async function updateAgent(id: string, data: any) {
  return prisma.agent.update({ 
    where: { id }, 
    data,
    include: { 
      user: { 
        select: { 
          id: true, 
          email: true, 
          full_name: true, 
          phone: true,
          profile_img_url: true
        } 
      } 
    }
  });
}

export async function deleteAgent(id: string) {
  return prisma.agent.delete({ where: { id } });
}

function assignmentAccessError(message: string) {
  const error: any = new Error(message);
  error.statusCode = 403;
  return error;
}

async function assertAssignmentAuthority(propertyId: string, actorId: string, actorRole: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } });
  if (!property) throw new Error('Property not found');
  if (actorRole === 'Admin') return property;
  if (actorRole === 'Landlord' && property.ownerId === actorId) return property;
  throw assignmentAccessError('Only the property owner or an administrator can manage this Agent assignment');
}

export async function assignProperty(agentId: string, propertyId: string, actorId: string, actorRole: string) {
  // Check if agent exists
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error('Agent not found');

  await assertAssignmentAuthority(propertyId, actorId, actorRole);
  
  // Check if assignment already exists
  const existingAssignment = await prisma.agentProperty.findUnique({
    where: { agentId_propertyId: { agentId, propertyId } }
  });
  
  if (existingAssignment) {
    throw new Error('Agent already assigned to this property');
  }
  
  // Create the assignment
  return prisma.agentProperty.create({
    data: {
      agentId,
      propertyId
    }
  });
}

export async function unassignProperty(agentId: string, propertyId: string, actorId: string, actorRole: string) {
  await assertAssignmentAuthority(propertyId, actorId, actorRole);
  const assignment = await prisma.agentProperty.findUnique({ where: { agentId_propertyId: { agentId, propertyId } } });
  if (!assignment) throw new Error('Agent is not assigned to this property');
  return prisma.agentProperty.delete({ where: { agentId_propertyId: { agentId, propertyId } } });
}

export async function getMyAssignedProperties(userId: string, page = 1, limit = 10) {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) return { agents: [], total: 0 };
  return getAssignedProperties(agent.id, page, limit);
}

export async function getAgentDashboard(userId: string) {
  const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
  if (!agent) {
    return {
      assignedProperties: 0, rentedProperties: 0, activeTenancies: 0,
      applicationsToReview: 0, upcomingViewings: 0, viewingsAwaitingResponse: 0,
      openMaintenance: 0, urgentMaintenance: 0,
    };
  }

  const assignments = await prisma.agentProperty.findMany({ where: { agentId: agent.id }, select: { propertyId: true } });
  const propertyIds = assignments.map((assignment) => assignment.propertyId);
  if (!propertyIds.length) {
    return {
      assignedProperties: 0, rentedProperties: 0, activeTenancies: 0,
      applicationsToReview: 0, upcomingViewings: 0, viewingsAwaitingResponse: 0,
      openMaintenance: 0, urgentMaintenance: 0,
    };
  }

  const now = new Date();
  const [rentedProperties, activeTenancies, applicationsToReview, upcomingViewings, viewingsAwaitingResponse, openMaintenance, urgentMaintenance] = await Promise.all([
    prisma.property.count({ where: { id: { in: propertyIds }, status: 'RENTED' } }),
    prisma.booking.count({ where: { propertyId: { in: propertyIds }, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
    prisma.booking.count({ where: { propertyId: { in: propertyIds }, status: 'PENDING', application_stage: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'] } } }),
    prisma.viewingAppointment.count({
      where: { propertyId: { in: propertyIds }, preferredTime: { gte: now }, status: { in: ['REQUESTED', 'ACCEPTED', 'PROPOSED_ALTERNATE', 'CONFIRMED'] } },
    }),
    prisma.viewingAppointment.count({ where: { propertyId: { in: propertyIds }, status: 'REQUESTED' } }),
    prisma.maintenanceTicket.count({ where: { propertyId: { in: propertyIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.maintenanceTicket.count({ where: { propertyId: { in: propertyIds }, status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: { in: ['HIGH', 'URGENT'] } } }),
  ]);

  return {
    assignedProperties: propertyIds.length,
    rentedProperties,
    activeTenancies,
    applicationsToReview,
    upcomingViewings,
    viewingsAwaitingResponse,
    openMaintenance,
    urgentMaintenance,
  };
}

export async function getAssignedProperties(agentId: string, page = 1, limit = 10, ownerId?: string) {
  const where: any = { agentId };
  if (ownerId) where.property = { ownerId };
  
  const [properties, total] = await Promise.all([
    prisma.agentProperty.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            rent: true,
            status: true,
            images: { select: { url: true }, take: 1 }
          }
        }
      }
    }),
    prisma.agentProperty.count({ where }),
  ]);
  
  return {
    agents: properties.map(p => ({
      ...p.property,
      agent_property_id: p.propertyId
    })),
    total
  };
}
