import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth';
import * as userService from './service_user';
import { recordAudit } from '../admin/service_audit';
import { successResponse, paginatedResponse } from '../../utils/response';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'User Management', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class UserController {
  list = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { search, role, is_active } = req.query as any;
      const { users, total } = await userService.getAllUsers(page, limit, search, role, is_active);
      HELPERS(req).log({ action: 'VIEW_USERS', entity: 'User', description: `Listed users (page ${page})` });
      res.json(paginatedResponse(users, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_USERS', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const user = await userService.getUserById(String(req.params.id));
      if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });
      HELPERS(req).log({ action: 'VIEW_USER', entity: 'User', entityId: user.id, description: `Viewed user ${user.email}` });
      res.json(successResponse(user));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const { email, password, full_name, phone, role } = req.body;
      const user = await userService.createUser(email, password, full_name, phone, role);
      HELPERS(req).log({ action: 'CREATE_USER', entity: 'User', entityId: user.id, description: `Created user ${email} with role ${role}` });
      res.status(201).json(successResponse(user, 'User created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const user = await userService.updateUser(String(req.params.id), req.body);
      HELPERS(req).log({ action: 'UPDATE_USER', entity: 'User', entityId: user.id, description: `Updated user ${user.email}` });
      res.json(successResponse(user, 'User updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.id);
      const user = await userService.getUserById(userId);
      await userService.softDeleteUser(userId);
      HELPERS(req).log({ action: 'DELETE_USER', entity: 'User', entityId: userId, description: `Deactivated user ${user?.email || userId}` });
      res.json(successResponse(null, 'User deactivated'));
    } catch (error: any) { HELPERS(req).log({ action: 'DELETE_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  activate = async (req: Request, res: Response) => {
    try {
      const user = await userService.activateUser(String(req.params.id));
      HELPERS(req).log({ action: 'ACTIVATE_USER', entity: 'User', entityId: user.id, description: `Activated user ${user.email}` });
      res.json(successResponse(user, 'User activated'));
    } catch (error: any) { HELPERS(req).log({ action: 'ACTIVATE_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  suspend = async (req: Request, res: Response) => {
    try {
      const user = await userService.suspendUser(String(req.params.id));
      HELPERS(req).log({ action: 'SUSPEND_USER', entity: 'User', entityId: user.id, description: `Suspended user ${user.email}` });
      res.json(successResponse(user, 'User suspended'));
    } catch (error: any) { HELPERS(req).log({ action: 'SUSPEND_USER', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  changeRole = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    }
    try {
      const { role } = req.body;
      const userId = String(req.params.id);
      await userService.changeUserRole(userId, role);
      HELPERS(req).log({ action: 'CHANGE_USER_ROLE', entity: 'User', entityId: userId, description: `Changed role to ${role}` });
      res.json(successResponse(null, `Role changed to ${role}`));
    } catch (error: any) { HELPERS(req).log({ action: 'CHANGE_USER_ROLE', entity: 'User', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
