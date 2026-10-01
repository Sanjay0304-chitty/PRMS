import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as notificationService from './service_notification';
import { successResponse } from '../../utils/response';

export class NotificationController {
  list = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'User required' } });
      const { isRead } = req.query;
      const data = await notificationService.getNotifications(
        userId,
        isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      );
      res.json(successResponse(data));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  markRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'User required' } });
      const data = await notificationService.markRead(userId, String(req.params.id));
      res.json(successResponse(data));
    } catch (error: any) {
      const status = error instanceof notificationService.NotificationNotFoundError ? 404 : 500;
      res.status(status).json({ success: false, error: { message: error.message } });
    }
  };

  markAllRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'User required' } });
      await notificationService.markAllRead(userId);
      res.json(successResponse(null, 'All marked as read'));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'User required' } });
      await notificationService.deleteNotification(userId, String(req.params.id));
      res.json(successResponse(null, 'Notification deleted'));
    } catch (error: any) {
      const status = error instanceof notificationService.NotificationNotFoundError ? 404 : 500;
      res.status(status).json({ success: false, error: { message: error.message } });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const authenticatedUserId = (req as AuthRequest).user?.id;
      if (!authenticatedUserId) return res.status(401).json({ success: false, error: { message: 'User required' } });
      const targetUserId = req.body?.userId || authenticatedUserId;
      const data = await notificationService.createNotification(targetUserId, req.body);
      res.status(201).json(successResponse(data, 'Notification created'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}

export const notificationController = new NotificationController();
