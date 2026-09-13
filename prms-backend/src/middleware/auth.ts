import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { prisma } from '../db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    firebase_uid: string;
    email: string;
    role: string;
  };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'No token provided' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        UserRole: { include: { role: { select: { name: true } } } },
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: { message: 'Invalid or inactive user' } });
    }

    (req as AuthRequest).user = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email || '',
      role: user.UserRole[0]?.role.name || 'Tenant',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: { message: 'Token expired' } });
    }
    next(error);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          UserRole: { include: { role: { select: { name: true } } } },
        },
      });
      if (user && user.is_active) {
        (req as AuthRequest).user = {
          id: user.id,
          firebase_uid: user.firebase_uid,
          email: user.email || '',
          role: user.UserRole[0]?.role.name || 'Tenant',
        };
      }
    }
    next();
  } catch {
    next();
  }
}
