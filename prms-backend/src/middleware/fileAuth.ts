import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import { env } from '../config';
import { prisma } from '../db';
import { hasPropertyAuthority } from '../utils/propertyAuthority';

export interface AuthenticatedFileInfo {
  id: string;
  role: string;
}

/**
 * File requests use the same bearer credentials as API requests, never URL tokens.
 */
export async function authenticateFileUser(req: Request): Promise<AuthenticatedFileInfo | null> {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7).trim()
      : null;

    if (!token) return null;

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        UserRole: { include: { role: { select: { name: true } } } },
      },
    });

    if (!user || !user.is_active) return null;

    return {
      id: user.id,
      role: (user.UserRole[0]?.role?.name || 'Tenant').toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Protects agreement documents (/uploads/agreements/*).
 * Accessible only by the landlord, tenant, or admin of that property.
 */
export async function protectAgreements(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticateFileUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required to access agreement documents' },
      });
    }

    if (user.role === 'admin') {
      setFileHeaders(res);
      return next();
    }

    const filename = path.basename(req.path);
    const agreement = await prisma.agreement.findFirst({
      where: {
        physicalCopyUrl: `/uploads/agreements/${filename}`,
      },
      include: {
        booking: {
          include: {
            property: { select: { id: true, ownerId: true } },
          },
        },
      },
    });

    if (agreement) {
      const isTenant = agreement.booking?.userId === user.id;
      const isLandlordOrAgent = agreement.booking?.property
        ? await hasPropertyAuthority(user.id, user.role, agreement.booking.property.ownerId, agreement.booking.property.id)
        : false;

      if (isTenant || isLandlordOrAgent) {
        setFileHeaders(res);
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: { message: 'You do not have permission to access this agreement' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * Protects user-uploaded files (/files/*).
 * System branding logos are public; private user files are restricted to the owner or admin.
 */
export async function protectUserFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const filename = path.basename(req.path);

    // Public branding logo
    const branding = await prisma.systemSetting.findFirst({
      where: {
        key: 'branding_logo_url',
        value: `/files/${filename}`,
      },
    });
    if (branding) {
      setFileHeaders(res);
      return next();
    }

    const user = await authenticateFileUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required to access documents' },
      });
    }

    if (user.role === 'admin') {
      setFileHeaders(res);
      return next();
    }

    const file = await prisma.userProfileFile.findFirst({
      where: {
        OR: [
          { storageName: filename },
          { url: `/files/${filename}` },
        ],
      },
    });

    if (file && file.userId === user.id) {
      setFileHeaders(res);
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { message: 'You do not have permission to access this file' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * Protects property uploads (/uploads/properties/*).
 * Property photos and videos of public listings stay public.
 * Non-public listings and property documents are restricted to landlord, tenant, or admin.
 */
export async function protectPropertyUploads(req: Request, res: Response, next: NextFunction) {
  try {
    const filename = path.basename(req.path);

    const image = await prisma.propertyImage.findFirst({
      where: {
        OR: [
          { url: `/uploads/properties/${filename}` },
          { thumbnailUrl: `/uploads/properties/${filename}` },
        ],
      },
      include: {
        property: {
          select: { id: true, ownerId: true, status: true },
        },
      },
    });

    if (image) {
      const isMedia = image.type === 'image' || image.type === 'video';
      const isPublicStatus = image.property?.status === 'AVAILABLE' || image.property?.status === 'RENTED';

      // Property photos and videos of public listings can stay public
      if (isMedia && isPublicStatus) {
        setFileHeaders(res);
        return next();
      }

      // Documents or private listings require authentication and authority
      const user = await authenticateFileUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required to access property documents' },
        });
      }

      if (user.role === 'admin') {
        setFileHeaders(res);
        return next();
      }

      const isAuthorizedManager = await hasPropertyAuthority(
        user.id,
        user.role,
        image.property.ownerId,
        image.property.id
      );
      if (isAuthorizedManager) {
        setFileHeaders(res);
        return next();
      }

      const tenantBooking = await prisma.booking.findFirst({
        where: {
          propertyId: image.property.id,
          userId: user.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      });
      if (tenantBooking) {
        setFileHeaders(res);
        return next();
      }

      return res.status(403).json({
        success: false,
        error: { message: 'You do not have permission to access this property document' },
      });
    }

    // An untracked filename must not become public merely because it ends in .jpg.
    const user = await authenticateFileUser(req);
    if (user?.role === 'admin') {
      setFileHeaders(res);
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { message: 'Access denied' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
}

function setFileHeaders(res: Response) {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
}

/** Ticket attachments follow ticket ownership and property management authority. */
export async function protectMaintenance(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticateFileUser(req);
    if (!user) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    const filename = path.basename(req.path);
    const attachment = await prisma.maintenanceAttachment.findFirst({
      where: { url: `/uploads/maintenance/${filename}` },
      include: { ticket: { select: { userId: true, propertyId: true } } },
    });
    if (!attachment) return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
    let allowed = user.role === 'admin' || attachment.ticket.userId === user.id;
    if (!allowed && attachment.ticket.propertyId) {
      const property = await prisma.property.findUnique({ where: { id: attachment.ticket.propertyId }, select: { id: true, ownerId: true } });
      if (property) allowed = await hasPropertyAuthority(user.id, user.role, property.ownerId, property.id);
    }
    if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have permission to access this attachment' } });
    setFileHeaders(res);
    return next();
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Unable to access attachment' } });
  }
}

/** Private-file thumbnails need the same owner check as their source document. */
export async function protectUserThumbnails(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticateFileUser(req);
    if (!user) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    const file = await prisma.userProfileFile.findFirst({ where: { thumbnailUrl: `/api/files/thumbnails/${path.basename(req.path)}` } });
    if (!file || (user.role !== 'admin' && file.userId !== user.id)) return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    setFileHeaders(res);
    return next();
  } catch {
    return res.status(500).json({ success: false, error: { message: 'Unable to access thumbnail' } });
  }
}
