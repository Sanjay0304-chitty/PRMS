import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as adminService from './service_admin';
import { successResponse, paginatedResponse } from '../../utils/response';

export class AdminController {
  getSettings = async (req: Request, res: Response) => {
    try {
      const settings = await adminService.getSystemSettings();
      res.json(successResponse(settings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getSettingsByCategory = async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const settings = await adminService.getSystemSettingsByCategory(String(category));
      res.json(successResponse(settings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getPublicSettings = async (req: Request, res: Response) => {
    try {
      const settings = await adminService.getPublicSystemSettings();
      res.json(successResponse(settings));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  bulkUpdateSettings = async (req: Request, res: Response) => {
    try {
      const settingsList = req.body.settings || req.body;
      const updated = await adminService.bulkUpdateSystemSettings(settingsList);
      res.json(successResponse(updated, 'Settings updated'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  updateSetting = async (req: Request, res: Response) => {
    try {
      const { key, value } = req.body;
      const setting = await adminService.updateSystemSetting(key, value);
      res.json(successResponse(setting, 'Setting updated'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  addSetting = async (req: Request, res: Response) => {
    try {
      const { key, value, category, description } = req.body;
      const setting = await adminService.addSystemSetting(key, value, category, description);
      res.status(201).json(successResponse(setting, 'Setting created'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  uploadLogo = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, error: { message: 'No logo file uploaded' } });
      }
      const filePath = `/files/${file.filename}`;
      const setting = await adminService.uploadSystemSetting('branding_logo_url', filePath);
      res.json(successResponse(setting, 'Logo uploaded'));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { logs, total } = await adminService.getAuditLogs(page, limit, req.query.entity as any);
      res.json(paginatedResponse(logs, page, limit, total));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getNotifications = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { notifications, total } = await adminService.getNotifications(req.user!.id, page, limit);
      res.json(paginatedResponse(notifications, page, limit, total));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  markNotificationRead = async (req: AuthRequest, res: Response) => {
    try {
      await adminService.markNotificationRead(String(req.params.id));
      res.json(successResponse(null, 'Notification marked as read'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  markAllRead = async (req: AuthRequest, res: Response) => {
    try {
      await adminService.markAllNotificationsRead(req.user!.id);
      res.json(successResponse(null, 'All notifications marked as read'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  dismissNotification = async (req: AuthRequest, res: Response) => {
    try {
      await adminService.dismissNotification(String(req.params.id));
      res.json(successResponse(null, 'Notification dismissed'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
