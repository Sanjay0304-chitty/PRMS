import { prisma } from '../../db';

export async function sendMessage(data: { receiverId: string; content: string; conversationId: string }, senderId: string) {
  return prisma.message.create({
    data: { ...data, senderId, isRead: false },
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

export async function getMessagesByConversation(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { created_at: 'asc' },
    include: { sender: { select: { id: true, full_name: true } } },
  });
}

export async function markAsRead(messageId: string) {
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
