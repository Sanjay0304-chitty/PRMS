import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  protectAgreements,
  protectUserFiles,
  protectPropertyUploads,
} from '../fileAuth';
import { prisma } from '../../db';
import { env } from '../../config';

jest.mock('../../db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    agreement: {
      findFirst: jest.fn(),
    },
    systemSetting: {
      findFirst: jest.fn(),
    },
    userProfileFile: {
      findFirst: jest.fn(),
    },
    propertyImage: {
      findFirst: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
    },
    agentProperty: {
      findUnique: jest.fn(),
    },
  },
}));

describe('fileAuth Middleware', () => {
  const secret = env.JWT_SECRET;
  const adminToken = jwt.sign({ userId: 'admin-1' }, secret);
  const tenantToken = jwt.sign({ userId: 'tenant-1' }, secret);
  const landlordToken = jwt.sign({ userId: 'landlord-1' }, secret);
  const strangerToken = jwt.sign({ userId: 'stranger-1' }, secret);

  const mockUsers: Record<string, any> = {
    'admin-1': { id: 'admin-1', is_active: true, UserRole: [{ role: { name: 'admin' } }] },
    'tenant-1': { id: 'tenant-1', is_active: true, UserRole: [{ role: { name: 'tenant' } }] },
    'landlord-1': { id: 'landlord-1', is_active: true, UserRole: [{ role: { name: 'landlord' } }] },
    'stranger-1': { id: 'stranger-1', is_active: true, UserRole: [{ role: { name: 'tenant' } }] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }: { where: { id: string } }) => {
      return Promise.resolve(mockUsers[where.id] || null);
    });
  });

  describe('protectAgreements', () => {
    it('returns 401 when no token is provided', async () => {
      const req = { headers: {}, path: '/agreement_123.pdf' } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectAgreements(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows admin access', async () => {
      const req = {
        headers: { authorization: `Bearer ${adminToken}` },
        path: '/agreement_123.pdf',
      } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectAgreements(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('allows tenant on that agreement', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
        id: 'ag-1',
        physicalCopyUrl: '/uploads/agreements/agreement_123.pdf',
        booking: {
          userId: 'tenant-1',
          property: { id: 'prop-1', ownerId: 'landlord-1' },
        },
      });

      const req = {
        headers: { authorization: `Bearer ${tenantToken}` },
        path: '/agreement_123.pdf',
      } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectAgreements(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies unrelated user with 403', async () => {
      (prisma.agreement.findFirst as jest.Mock).mockResolvedValue({
        id: 'ag-1',
        physicalCopyUrl: '/uploads/agreements/agreement_123.pdf',
        booking: {
          userId: 'tenant-1',
          property: { id: 'prop-1', ownerId: 'landlord-1' },
        },
      });

      const req = {
        headers: { authorization: `Bearer ${strangerToken}` },
        path: '/agreement_123.pdf',
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectAgreements(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('protectUserFiles', () => {
    it('allows public branding logo without token', async () => {
      (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue({
        key: 'branding_logo_url',
        value: '/files/system_logo.png',
      });

      const req = { headers: {}, path: '/system_logo.png' } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectUserFiles(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies unauthenticated request to private user file with 401', async () => {
      (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue(null);

      const req = { headers: {}, path: '/passport.pdf' } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectUserFiles(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows owner of the user file', async () => {
      (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userProfileFile.findFirst as jest.Mock).mockResolvedValue({
        id: 'file-1',
        userId: 'tenant-1',
        storageName: 'passport.pdf',
      });

      const req = {
        headers: { authorization: `Bearer ${tenantToken}` },
        path: '/passport.pdf',
      } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectUserFiles(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies non-owner with 403', async () => {
      (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userProfileFile.findFirst as jest.Mock).mockResolvedValue({
        id: 'file-1',
        userId: 'tenant-1',
        storageName: 'passport.pdf',
      });

      const req = {
        headers: { authorization: `Bearer ${strangerToken}` },
        path: '/passport.pdf',
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectUserFiles(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('protectPropertyUploads', () => {
    it('allows property photos of public listings without authentication', async () => {
      (prisma.propertyImage.findFirst as jest.Mock).mockResolvedValue({
        id: 'img-1',
        url: '/uploads/properties/living_room.jpg',
        type: 'image',
        property: { id: 'prop-1', ownerId: 'landlord-1', status: 'AVAILABLE' },
      });

      const req = { headers: {}, path: '/living_room.jpg' } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectPropertyUploads(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('requires authentication for property documents', async () => {
      (prisma.propertyImage.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        url: '/uploads/properties/deed.pdf',
        type: 'document',
        property: { id: 'prop-1', ownerId: 'landlord-1', status: 'AVAILABLE' },
      });

      const req = { headers: {}, path: '/deed.pdf' } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectPropertyUploads(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows landlord to access property document', async () => {
      (prisma.propertyImage.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        url: '/uploads/properties/deed.pdf',
        type: 'document',
        property: { id: 'prop-1', ownerId: 'landlord-1', status: 'AVAILABLE' },
      });

      const req = {
        headers: { authorization: `Bearer ${landlordToken}` },
        path: '/deed.pdf',
      } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn();

      await protectPropertyUploads(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
