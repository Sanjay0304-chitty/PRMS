import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: `Insufficient permissions. Required role: ${allowedRoles.join(', ')}` },
      });
    }

    next();
  };
}

export const adminOnly = authorize('Admin');
export const landlordOnly = authorize('Landlord');
export const tenantOnly = authorize('Tenant');
export const agentOnly = authorize('Agent');
export const adminOrLandlord = authorize('Admin', 'Landlord');
export const adminOrAgent = authorize('Admin', 'Agent');
export const adminOrLandlordOrAgent = authorize('Admin', 'Landlord', 'Agent');
