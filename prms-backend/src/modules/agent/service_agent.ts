import { prisma } from '../../db';
import { Role } from '@prisma/client';

export async function getAllAgents(page = 1, limit = 10, search?: string, propertyId?: string) {
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

export async function getAgentById(id: string) {
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

export async function assignProperty(agentId: string, propertyId: string) {
  // Check if agent exists
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error('Agent not found');
  
  // Check if property exists
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error('Property not found');
  
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

export async function getMyAssignedProperties(userId: string, page = 1, limit = 10) {
  const agent = await prisma.agent.findUnique({ where: { userId } });
  if (!agent) return { agents: [], total: 0 };
  return getAssignedProperties(agent.id, page, limit);
}

export async function getAssignedProperties(agentId: string, page = 1, limit = 10) {
  const where = { agentId };
  
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