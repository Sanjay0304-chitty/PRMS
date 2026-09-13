import { prisma } from '../db';

/**
 * Checks whether `userId` has standing over a property: the owning
 * Landlord, an Agent assigned to it, or an Admin. Used to gate actions
 * that any of "the people who manage this property" may take (review an
 * application, view/edit a draft agreement, manage a viewing) — narrower
 * decision authority (approve/reject, sign) is checked separately.
 */
export async function hasPropertyAuthority(userId: string, role: string, propertyOwnerId: string, propertyId: string) {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return true;
  if (r === 'landlord') return propertyOwnerId === userId;
  if (r === 'agent') {
    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) return false;
    const assignment = await prisma.agentProperty.findUnique({ where: { agentId_propertyId: { agentId: agent.id, propertyId } } });
    return !!assignment;
  }
  return false;
}
