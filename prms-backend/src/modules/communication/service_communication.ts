import { prisma } from '../../db';

export async function getAdminContacts(userId: string) {
  const administrators = await prisma.user.findMany({
    where: {
      id: { not: userId },
      is_active: true,
      UserRole: { some: { role: { name: 'Admin' } } },
    },
    orderBy: { full_name: 'asc' },
    select: { id: true, full_name: true, email: true },
  });

  return administrators.map((admin) => ({
    id: admin.id,
    name: `${admin.full_name || admin.email || 'System Administrator'} (Admin)`,
    role: 'Admin',
  }));
}

export async function sendMessage(data: { receiverId: string; content: string; conversationId: string }, senderId: string) {
  if (!data.receiverId || data.receiverId === senderId) throw new Error('A different receiver is required');
  const receiver = await prisma.user.findUnique({ where: { id: data.receiverId }, select: { id: true } });
  if (!receiver) throw new Error('Receiver not found');

  // Conversation ids are server-derived so a caller cannot inject a message
  // into a private thread belonging to other users.
  const conversationId = `conv-${[senderId, data.receiverId].sort().join('-')}`;
  return prisma.message.create({
    data: { receiverId: data.receiverId, content: data.content, conversationId, senderId, isRead: false },
    include: { sender: { select: { id: true, full_name: true } }, receiver: { select: { id: true, full_name: true } } },
  });
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
    where: { conversationId },
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
