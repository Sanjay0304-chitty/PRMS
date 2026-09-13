import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ThemeService } from './service_theme';
import { successResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Theme', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class ThemeController {
  private service = new ThemeService();

  getTheme = async (req: Request, res: Response) => {
    try {
      const theme = await this.service.getPublishedTheme();
      HELPERS(req).log({ action: 'VIEW_THEME', entity: 'Theme', description: 'Viewed published theme' });
      res.json(successResponse(theme));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_THEME', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getDraft = async (req: Request, res: Response) => {
    try {
      const draft = await this.service.getDraft(String(req.params.themeId));
      HELPERS(req).log({ action: 'VIEW_THEME_DRAFT', entity: 'Theme', entityId: req.params.id, description: 'Viewed theme draft' });
      res.json(successResponse(draft));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_THEME_DRAFT', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  saveDraft = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.saveDraft(String(req.params.themeId), req.body.lightConfig, req.body.darkConfig);
      HELPERS(req).log({ action: 'SAVE_THEME_DRAFT', entity: 'Theme', entityId: req.params.id, description: 'Saved theme draft' });
      res.json(successResponse(null, 'Draft saved'));
    } catch (error: any) { HELPERS(req).log({ action: 'SAVE_THEME_DRAFT', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  publishDraft = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.publishDraft(String(req.params.themeId));
      HELPERS(req).log({ action: 'PUBLISH_THEME', entity: 'Theme', entityId: req.params.id, description: 'Published theme configuration' });
      res.json(successResponse(null, 'Theme published'));
    } catch (error: any) { HELPERS(req).log({ action: 'PUBLISH_THEME', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getVersions = async (req: Request, res: Response) => {
    try {
      const versions = await this.service.getVersions(String(req.params.themeId));
      HELPERS(req).log({ action: 'VIEW_THEME_VERSIONS', entity: 'Theme', description: 'Viewed theme version history' });
      res.json(successResponse(versions));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_THEME_VERSIONS', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  restoreVersion = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.restoreVersion(String(req.params.themeId), parseInt(req.body.version as string));
      HELPERS(req).log({ action: 'RESTORE_THEME_VERSION', entity: 'Theme', entityId: req.params.id, description: 'Restored theme version' });
      res.json(successResponse(null, 'Version restored'));
    } catch (error: any) { HELPERS(req).log({ action: 'RESTORE_THEME_VERSION', entity: 'Theme', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
