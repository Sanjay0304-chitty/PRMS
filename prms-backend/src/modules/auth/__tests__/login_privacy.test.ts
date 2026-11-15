jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('../../../db', () => ({ prisma: { user: { findUnique: jest.fn() } } }));
jest.mock('bcryptjs', () => ({ compare: jest.fn().mockResolvedValue(false) }));
import { prisma } from '../../../db';
import bcrypt from 'bcryptjs';
import { loginUser } from '../service_auth';
test.each([
 null,
 { id: 'inactive', passwordHash: 'hash', is_active: false },
 { id: 'wrong-password', passwordHash: 'hash', is_active: true },
 { id: 'google-only', passwordHash: null, is_active: true },
])('failed login does not reveal account existence, status or provider',async user=>{
 jest.clearAllMocks();(prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
 await expect(loginUser('someone@example.test','Incorrect123!')).rejects.toThrow('Unable to sign in. Check your email and password, or use Google sign-in.');
 expect(bcrypt.compare).toHaveBeenCalledTimes(1);
});
