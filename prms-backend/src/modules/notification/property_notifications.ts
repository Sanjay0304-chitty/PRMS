import { prisma } from '../../db';
import { createNotification } from './service_notification';

type Notice = { type: string; title: string; message: string };
async function deliver(ids: string[], notice: Notice) {
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(ids)] }, is_active: true }, select: { id: true } });
  await Promise.all(users.map(user => createNotification(user.id, notice).catch(error => console.error('[Property notification]', error.message))));
}

// Resolve assignments at event time; never copy another user's inbox or private messages.
export async function notifyPropertyManagers(propertyId: string, notice: Notice, excludeUserId?: string) {
  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
    if (!property) return;
    const assignments = await prisma.agentProperty.findMany({ where: { propertyId }, select: { agent: { select: { userId: true } } } });
    const ids = [property.ownerId, ...assignments.map(item => item.agent.userId)].filter(id => id !== excludeUserId);
    await deliver(ids, notice);
  } catch (error: any) { console.error('[Property notification]', error.message); }
}

export async function notifyAgentAssignment(agentId: string, propertyId: string, assigned: boolean) {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true } });
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { title: true, ownerId: true } });
    if (agent && property) {
      await deliver([agent.userId], {
      type: 'property_assignment', title: assigned ? 'Property assigned to you' : 'Property assignment removed',
      message: assigned ? `You have been assigned to manage "${property.title}". Future property updates will follow your notification preferences.` : `You are no longer assigned to "${property.title}". You will no longer receive future management updates for this property.`,
    });
      if (property.ownerId !== agent.userId) await deliver([property.ownerId], { type: 'property_assignment', title: assigned ? 'Agent assigned to property' : 'Agent removed from property', message: `The agent assignment for "${property.title}" has been ${assigned ? 'added' : 'removed'}.` });
    }
  } catch (error: any) { console.error('[Assignment notification]', error.message); }
}

export async function notifyPaymentReceived(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { booking: { include: { property: true } } } });
    if (!payment || payment.status !== 'PAID') return;
    await notifyPropertyManagers(payment.booking.propertyId, {
      type: 'payment_received', title: 'Payment received',
      message: `A payment of RM ${Number(payment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })} for "${payment.booking.property.title}" is marked Paid.`,
    });
  } catch (error: any) { console.error('[Payment notification]', error.message); }
}
