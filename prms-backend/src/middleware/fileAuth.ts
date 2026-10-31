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
 * Extracts and verifies JWT credentials from Authorization header or ?token= query parameter.
 */
export async function authenticateFileUser(req: Request): Promise<AuthenticatedFileInfo | null> {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7).trim()
      : (typeof req.query?.token === 'string' ? req.query.token : null);

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
        physicalCopyUrl: { contains: filename },
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
        value: { contains: filename },
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
          { url: { contains: filename } },
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
          { url: { contains: filename } },
          { thumbnailUrl: { contains: filename } },
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

    // Fallback if not tracked in PropertyImage: allow if public image extension, else require admin
    const ext = path.extname(filename).toLowerCase();
    const isImageExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext);
    if (isImageExt) {
      setFileHeaders(res);
      return next();
    }

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
}
