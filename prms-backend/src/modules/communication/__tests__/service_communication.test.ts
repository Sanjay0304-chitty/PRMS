import * as service from '../service_communication';
import { createNotification } from '../../notification/service_notification';

const findUser = jest.fn();
const findUsers = jest.fn();
const findAgent = jest.fn();
const findAssignments = jest.fn();
const findProperties = jest.fn();
const findBookings = jest.fn();
const findViewings = jest.fn();
const findTickets = jest.fn();
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
    agent: { findUnique: (...args: any[]) => findAgent(...args) },
    agentProperty: { findMany: (...args: any[]) => findAssignments(...args) },
    property: { findMany: (...args: any[]) => findProperties(...args) },
    booking: { findMany: (...args: any[]) => findBookings(...args) },
    viewingAppointment: { findMany: (...args: any[]) => findViewings(...args) },
    maintenanceTicket: { findMany: (...args: any[]) => findTickets(...args) },
    message: {
      findUnique: (...args: any[]) => findMessage(...args),
      findFirst: (...args: any[]) => findFirstMessage(...args),
      findMany: (...args: any[]) => findMessages(...args),
      create: (...args: any[]) => createMessage(...args),
      update: (...args: any[]) => updateMessage(...args),
    },
  },
}));

jest.mock('../../notification/service_notification', () => ({ createNotification: jest.fn() }));

const roleUser = (name: string) => ({ UserRole: [{ role: { name } }] });

beforeEach(() => {
  jest.clearAllMocks();
  findUsers.mockResolvedValue([]);
  findProperties.mockResolvedValue([]);
  findBookings.mockResolvedValue([]);
  findViewings.mockResolvedValue([]);
  findTickets.mockResolvedValue([]);
  findAssignments.mockResolvedValue([]);
  (createNotification as jest.Mock).mockResolvedValue({ id: 'notification-1' });
});

test('returns contacts connected to an agent assigned property', async () => {
  findUser.mockResolvedValue(roleUser('Agent'));
  findAgent.mockResolvedValue({ id: 'agent-profile' });
  findAssignments.mockResolvedValue([{ propertyId: 'property-1' }]);
  findProperties.mockResolvedValue([{ ownerId: 'landlord-1', agentProperties: [] }]);
  findBookings.mockResolvedValue([{ userId: 'tenant-1' }]);
  findUsers
    .mockResolvedValueOnce([{ id: 'admin-1' }])
    .mockResolvedValueOnce([
      { id: 'admin-1', full_name: 'Admin', email: 'admin@prms.com', UserRole: [{ role: { name: 'Admin' } }] },
      { id: 'landlord-1', full_name: 'Landlord', email: 'landlord@prms.com', UserRole: [{ role: { name: 'Landlord' } }] },
      { id: 'tenant-1', full_name: 'Tenant', email: 'tenant@prms.com', UserRole: [{ role: { name: 'Tenant' } }] },
    ]);

  await expect(service.getContacts('agent-user')).resolves.toEqual([
    { id: 'admin-1', name: 'Admin (Admin)', role: 'Admin' },
    { id: 'landlord-1', name: 'Landlord (Landlord)', role: 'Landlord' },
    { id: 'tenant-1', name: 'Tenant (Tenant)', role: 'Tenant' },
  ]);
});

test('tenant contacts include property managers but never other tenants', async () => {
  findUser.mockResolvedValue(roleUser('Tenant'));
  findBookings.mockResolvedValue([{ propertyId: 'property-1' }]);
  findProperties.mockResolvedValue([{
    ownerId: 'landlord-1',
    agentProperties: [{ agent: { userId: 'agent-1' } }],
  }]);
  findUsers
    .mockResolvedValueOnce([{ id: 'admin-1' }])
    .mockResolvedValueOnce([
      { id: 'landlord-1', full_name: 'Landlord', email: null, UserRole: [{ role: { name: 'Landlord' } }] },
      { id: 'agent-1', full_name: 'Agent', email: null, UserRole: [{ role: { name: 'Agent' } }] },
    ]);

  const contacts = await service.getContacts('tenant-1');
  expect(contacts.map((contact) => contact.id)).toEqual(['landlord-1', 'agent-1']);
  expect(findProperties).toHaveBeenCalledTimes(1);
});

test('rejects sending a message to an unrelated user', async () => {
  findUser
    .mockResolvedValueOnce({ id: 'unrelated-user', is_active: true })
    .mockResolvedValueOnce(roleUser('Agent'));
  findAgent.mockResolvedValue(null);

  await expect(service.sendMessage({
    receiverId: 'unrelated-user', content: 'Hello', conversationId: 'foreign-thread',
  }, 'agent-user')).rejects.toThrow('You are not allowed to message this user');
  expect(createMessage).not.toHaveBeenCalled();
});

test('validates empty messages and inactive receivers', async () => {
  await expect(service.sendMessage({ receiverId: 'tenant-user', content: '   ', conversationId: '' }, 'agent-user'))
    .rejects.toThrow('Message content is required');
  findUser.mockResolvedValue({ id: 'tenant-user', is_active: false });
  await expect(service.sendMessage({ receiverId: 'tenant-user', content: 'Hello', conversationId: '' }, 'agent-user'))
    .rejects.toThrow('Receiver is not active');
});

test('derives the conversation id, trims content and notifies the receiver', async () => {
  findUser
    .mockResolvedValueOnce({ id: 'admin-1', is_active: true })
    .mockResolvedValueOnce(roleUser('Agent'));
  findAgent.mockResolvedValue(null);
  findUsers
    .mockResolvedValueOnce([{ id: 'admin-1' }])
    .mockResolvedValueOnce([
      { id: 'admin-1', full_name: 'System Admin', email: 'admin@prms.com', UserRole: [{ role: { name: 'Admin' } }] },
    ]);
  createMessage.mockResolvedValue({ id: 'message-1', sender: { full_name: 'Agent One' } });

  await service.sendMessage({ receiverId: 'admin-1', content: ' Hello ', conversationId: 'foreign-thread' }, 'agent-user');
  expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      conversationId: 'conv-admin-1-agent-user',
      content: 'Hello',
      senderId: 'agent-user',
      receiverId: 'admin-1',
    }),
  }));
  expect(createNotification).toHaveBeenCalledWith('admin-1', {
    type: 'message', title: 'New message', message: 'Agent One sent you a new message.',
  });
});

test('rejects reading a conversation when the caller is not a participant', async () => {
  findFirstMessage.mockResolvedValue(null);
  await expect(service.getMessagesByConversation('private-conversation', 'agent-user'))
    .rejects.toThrow('You do not have access to this conversation');
  expect(findMessages).not.toHaveBeenCalled();
});

test('keeps the participant condition on the final conversation query', async () => {
  findFirstMessage.mockResolvedValue({ id: 'message-1' });
  findMessages.mockResolvedValue([{ id: 'message-1' }]);
  await service.getMessagesByConversation('own-conversation', 'agent-user');
  expect(findMessages).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      conversationId: 'own-conversation',
      OR: [{ senderId: 'agent-user' }, { receiverId: 'agent-user' }],
    },
  }));
});

test('only the receiver can mark a message as read', async () => {
  findMessage.mockResolvedValue({ receiverId: 'tenant-user' });
  await expect(service.markAsRead('message-1', 'agent-user'))
    .rejects.toThrow('Only the receiver can mark this message as read');
  expect(updateMessage).not.toHaveBeenCalled();
});
