import { prisma } from '../../db';
import { createNotification } from '../notification/service_notification';

const contactSelect = {
  id: true,
  full_name: true,
  email: true,
  UserRole: { select: { role: { select: { name: true } } } },
} as const;

function contactLabel(user: any) {
  const role = user.UserRole?.[0]?.role?.name || 'User';
  return {
    id: user.id,
    name: `${user.full_name || user.email || 'User'} (${role})`,
    role,
  };
}

async function addPropertyContacts(propertyIds: string[], contactIds: Set<string>) {
  if (!propertyIds.length) return;

  const [properties, bookings, viewings, tickets] = await Promise.all([
    prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        ownerId: true,
        agentProperties: { select: { agent: { select: { userId: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: { propertyId: { in: propertyIds }, status: { not: 'CANCELLED' } },
      select: { userId: true },
    }),
    prisma.viewingAppointment.findMany({
      where: { propertyId: { in: propertyIds }, status: { not: 'CANCELLED' } },
      select: { tenantId: true },
    }),
    prisma.maintenanceTicket.findMany({
      where: { propertyId: { in: propertyIds }, status: { not: 'CLOSED' } },
      select: { userId: true },
    }),
  ]);

  properties.forEach((property) => {
    contactIds.add(property.ownerId);
    property.agentProperties.forEach((assignment) => contactIds.add(assignment.agent.userId));
  });
  bookings.forEach((booking) => contactIds.add(booking.userId));
  viewings.forEach((viewing) => contactIds.add(viewing.tenantId));
  tickets.forEach((ticket) => contactIds.add(ticket.userId));
}

export async function getContacts(userId: string) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { UserRole: { select: { role: { select: { name: true } } } } },
  });
  if (!currentUser) throw new Error('User not found');
  const role = currentUser.UserRole[0]?.role.name;

  if (role === 'Admin') {
    const users = await prisma.user.findMany({
      where: { id: { not: userId }, is_active: true },
      orderBy: { full_name: 'asc' },
      select: contactSelect,
    });
    return users.map(contactLabel);
  }

  const contactIds = new Set<string>();
  const administrators = await prisma.user.findMany({
    where: {
      id: { not: userId },
      is_active: true,
      UserRole: { some: { role: { name: 'Admin' } } },
    },
    select: { id: true },
  });
  administrators.forEach((admin) => contactIds.add(admin.id));

  if (role === 'Agent') {
    const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
    if (agent) {
      const assignments = await prisma.agentProperty.findMany({
        where: { agentId: agent.id },
        select: { propertyId: true },
      });
      await addPropertyContacts(assignments.map((assignment) => assignment.propertyId), contactIds);
    }
  } else if (role === 'Landlord') {
    const properties = await prisma.property.findMany({ where: { ownerId: userId }, select: { id: true } });
    await addPropertyContacts(properties.map((property) => property.id), contactIds);
  } else if (role === 'Tenant') {
    const [bookings, viewings, tickets] = await Promise.all([
      prisma.booking.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        select: { propertyId: true },
      }),
      prisma.viewingAppointment.findMany({
        where: { tenantId: userId, status: { not: 'CANCELLED' } },
        select: { propertyId: true },
      }),
      prisma.maintenanceTicket.findMany({
        where: { userId, propertyId: { not: null }, status: { not: 'CLOSED' } },
        select: { propertyId: true },
      }),
    ]);
    const propertyIds = Array.from(new Set([
      ...bookings.map((booking) => booking.propertyId),
      ...viewings.map((viewing) => viewing.propertyId),
      ...tickets.map((ticket) => ticket.propertyId).filter((id): id is string => Boolean(id)),
    ]));
    if (propertyIds.length) {
      const properties = await prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: {
          ownerId: true,
          agentProperties: { select: { agent: { select: { userId: true } } } },
        },
      });
      properties.forEach((property) => {
        contactIds.add(property.ownerId);
        property.agentProperties.forEach((assignment) => contactIds.add(assignment.agent.userId));
      });
    }
  }

  contactIds.delete(userId);
  if (!contactIds.size) return [];
  const contacts = await prisma.user.findMany({
    where: { id: { in: Array.from(contactIds) }, is_active: true },
    orderBy: { full_name: 'asc' },
    select: contactSelect,
  });
  return contacts.map(contactLabel);
}

export async function getAdminContacts(userId: string) {
  return getContacts(userId);
}

export async function sendMessage(data: { receiverId: string; content: string; conversationId: string }, senderId: string) {
  if (!data.receiverId || data.receiverId === senderId) throw new Error('A different receiver is required');
  const content = String(data.content || '').trim();
  if (!content) throw new Error('Message content is required');
  if (content.length > 2000) throw new Error('Message content cannot exceed 2000 characters');
  const receiver = await prisma.user.findUnique({
    where: { id: data.receiverId },
    select: { id: true, is_active: true },
  });
  if (!receiver) throw new Error('Receiver not found');
  if (!receiver.is_active) throw new Error('Receiver is not active');
  const contacts = await getContacts(senderId);
  if (!contacts.some((contact) => contact.id === data.receiverId)) {
    throw new Error('You are not allowed to message this user');
  }

  // Conversation ids are server-derived so a caller cannot inject a message
  // into a private thread belonging to other users.
  const conversationId = `conv-${[senderId, data.receiverId].sort().join('-')}`;
  const message = await prisma.message.create({
    data: { receiverId: data.receiverId, content, conversationId, senderId, isRead: false },
    include: { sender: { select: { id: true, full_name: true } }, receiver: { select: { id: true, full_name: true } } },
  });
  const senderName = message.sender?.full_name || 'A PRMS user';
  await createNotification(data.receiverId, {
    type: 'message',
    title: 'New message',
    message: `${senderName} sent you a new message.`,
  });
  return message;
}

export async function getConversations(userId: string) {
  // Ordered by created_at, not id - message ids are UUIDs, so sorting by id
  // is not chronological. The frontend takes the first message it sees per
  // conversationId as that conversation's preview/lastAt, so this ordering
  // is what actually makes the most recently active conversation - and its
  // latest message text - the one shown and floated to the top.
  const conversations = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { created_at: 'desc' },
    include: { sender: { select: { id: true, full_name: true } }, receiver: { select: { id: true, full_name: true } } },
  });
  return conversations;
}

export async function getMessagesByConversation(conversationId: string, userId: string) {
  const membership = await prisma.message.findFirst({
    where: { conversationId, OR: [{ senderId: userId }, { receiverId: userId }] },
    select: { id: true },
  });
  if (!membership) throw new Error('You do not have access to this conversation');
  return prisma.message.findMany({
    where: { conversationId, OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { created_at: 'asc' },
    include: { sender: { select: { id: true, full_name: true } } },
  });
}

export async function markAsRead(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, select: { receiverId: true } });
  if (!message) throw new Error('Message not found');
  if (message.receiverId !== userId) throw new Error('Only the receiver can mark this message as read');
  return prisma.message.update({ where: { id: messageId }, data: { isRead: true } });
}

const EDIT_WINDOW_MS = 2 * 60 * 1000;

export async function editMessage(messageId: string, userId: string, content: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error('Message not found');
  if (message.senderId !== userId) throw new Error('You can only edit your own messages');
  if (message.deleted) throw new Error('Cannot edit a message that was unsent');
  if (Date.now() - message.created_at.getTime() > EDIT_WINDOW_MS) {
    throw new Error('Messages can only be edited within 2 minutes of sending');
  }
  return prisma.message.update({
    where: { id: messageId },
    data: { content, edited: true },
    include: { sender: { select: { id: true, full_name: true } } },
  });
}

export async function unsendMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error('Message not found');
  if (message.senderId !== userId) throw new Error('You can only unsend your own messages');
  if (Date.now() - message.created_at.getTime() > EDIT_WINDOW_MS) {
    throw new Error('Messages can only be unsent within 2 minutes of sending');
  }
  return prisma.message.update({
    where: { id: messageId },
    data: { content: '', deleted: true },
  });
}
