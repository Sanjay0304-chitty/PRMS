import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { recordAudit } from '../modules/admin/service_audit';

/**
 * createAuditLog - helper that attaches to an AuthRequest so controllers can call it easily.
 *
 * Usage inside a controller:
 *   await req.logAudit({ action: 'LOGIN_SUCCESS', entity: 'User', entityId: userId, description: 'Logged in' });
 */
interface AuditContext {
  userId?: string;
  username?: string;
  userRole?: string;
  module: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  status?: string;
  level?: string;
  ipAddress?: string;
  userAgent?: string;
  requestUrl?: string;
  httpMethod?: string;
  errorMessage?: string;
}

async function logAuditWithContext(ctx: AuditContext, req: Request) {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  return recordAudit({
    ...ctx,
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl,
    httpMethod: req.method,
  });
}

declare global {
  namespace Express {
    interface Request {
      logAudit: (ctx: AuditContext) => Promise<void>;
    }
  }
}

/**
 * Middleware that attaches `req.logAudit(ctx)` and wraps `res.json` to auto-log on error responses.
 */
export function auditMiddleware(moduleName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    (req as any).logAudit = async (ctx: AuditContext) => {
      await logAuditWithContext(
        {
          ...ctx,
          module: ctx.module || moduleName,
          userId: ctx.userId || authReq.user?.id,
          username: ctx.username || authReq.user?.email,
          userRole: ctx.userRole || authReq.user?.role,
          status: ctx.status || 'Success',
          level: ctx.level || 'info',
        },
        req,
      );
    };
    next();
  };
}
