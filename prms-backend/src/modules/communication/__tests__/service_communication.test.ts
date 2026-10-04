import * as service from '../service_communication';

const findUser = jest.fn();
const findUsers = jest.fn();
const findMessage = jest.fn();
const findFirstMessage = jest.fn();
const findMessages = jest.fn();
const createMessage = jest.fn();
const updateMessage = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => findUser(...args),
      findMany: (...args: any[]) => findUsers(...args),
    },
    message: {
      findUnique: (...args: any[]) => findMessage(...args),
      findFirst: (...args: any[]) => findFirstMessage(...args),
      findMany: (...args: any[]) => findMessages(...args),
      create: (...args: any[]) => createMessage(...args),
      update: (...args: any[]) => updateMessage(...args),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

test('returns active administrators as messaging contacts for any authenticated user', async () => {
  findUsers.mockResolvedValue([
    { id: 'admin-1', full_name: 'System Admin', email: 'admin@prms.com' },
  ]);

  await expect(service.getAdminContacts('landlord-new')).resolves.toEqual([
    { id: 'admin-1', name: 'System Admin (Admin)', role: 'Admin' },
  ]);
  expect(findUsers).toHaveBeenCalledWith({
    where: {
      id: { not: 'landlord-new' },
      is_active: true,
      UserRole: { some: { role: { name: 'Admin' } } },
    },
    orderBy: { full_name: 'asc' },
    select: { id: true, full_name: true, email: true },
  });
});

test('rejects reading a conversation when the caller is not a participant', async () => {
  findFirstMessage.mockResolvedValue(null);
  await expect(service.getMessagesByConversation('private-conversation', 'agent-user'))
    .rejects.toThrow('You do not have access to this conversation');
  expect(findMessages).not.toHaveBeenCalled();
});

test('allows a participant to read a conversation', async () => {
  findFirstMessage.mockResolvedValue({ id: 'message-1' });
  findMessages.mockResolvedValue([{ id: 'message-1' }]);
  await expect(service.getMessagesByConversation('own-conversation', 'agent-user'))
    .resolves.toEqual([{ id: 'message-1' }]);
});

test('only the receiver can mark a message as read', async () => {
  findMessage.mockResolvedValue({ receiverId: 'tenant-user' });
  await expect(service.markAsRead('message-1', 'agent-user'))
    .rejects.toThrow('Only the receiver can mark this message as read');
  expect(updateMessage).not.toHaveBeenCalled();
});

test('derives the conversation id on the server', async () => {
  findUser.mockResolvedValue({ id: 'tenant-user' });
  createMessage.mockResolvedValue({ id: 'message-1' });
  await service.sendMessage({ receiverId: 'tenant-user', content: 'Hello', conversationId: 'foreign-thread' }, 'agent-user');
  expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      conversationId: 'conv-agent-user-tenant-user',
      senderId: 'agent-user',
      receiverId: 'tenant-user',
    }),
  }));
});
