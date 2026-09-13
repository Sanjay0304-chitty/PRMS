import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as fileUploadService from './service_fileUpload';
import { recordAudit } from '../admin/service_audit';
import { successResponse, paginatedResponse } from '../../utils/response';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'File Upload', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class FileUploadController {
  getUserMedia = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const fileType = req.query.fileType as string | undefined;
      const { getUserMedia: _getUserMedia } = await import('./service_fileUpload');
      const media = await _getUserMedia(userId, fileType);
      res.json(successResponse({ media }));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  upload = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: { message: 'No file provided' } });

      const userId = (req as AuthRequest).user!.id;
      const url = `/files/${file.filename}`;

      // Determine category: image, video, or document
      let category;
      if (file.mimetype.startsWith('image/')) category = 'image';
      else if (file.mimetype.startsWith('video/')) category = 'video';
      else category = 'document';

      const result = await fileUploadService.uploadFile(userId, {
        originalName: file.originalname,
        storageName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        category,
        url,
        description: (req.body as any).description || undefined,
      });

      HELPERS(req).log({ action: 'UPLOAD_FILE', entity: 'UserProfileFile', entityId: result.id, description: `Uploaded ${file.originalname}` });
      res.status(201).json(successResponse(result, 'File uploaded successfully'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'UPLOAD_FILE', entity: 'UserProfileFile', status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string | undefined;

      const { files, total } = await fileUploadService.getUserFiles(userId, page, limit, category);
      HELPERS(req).log({ action: 'LIST_FILES', entity: 'UserProfileFile', description: `Listed files (page ${page})` });
      res.json(successResponse({ files, total }));
    } catch (error: any) {
      HELPERS(req).log({ action: 'LIST_FILES', entity: 'UserProfileFile', status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const file = await fileUploadService.getFileById(String(req.params.fileId));
      if (!file) return res.status(404).json({ success: false, error: { message: 'File not found' } });
      HELPERS(req).log({ action: 'VIEW_FILE', entity: 'UserProfileFile', entityId: file.id, description: `Viewed file ${file.originalName}` });
      res.json(successResponse(file));
    } catch (error: any) {
      HELPERS(req).log({ action: 'VIEW_FILE', entity: 'UserProfileFile', status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const fileId = String(req.params.fileId);

      // Get file details before deletion
      const file = await fileUploadService.getFileById(fileId);
      if (!file) return res.status(404).json({ success: false, error: { message: 'File not found' } });

      // Ensure user can only delete their own files
      if (file.userId !== userId) {
        return res.status(403).json({ success: false, error: { message: 'You can only delete your own files' } });
      }

      await fileUploadService.deleteFile(fileId);
      HELPERS(req).log({ action: 'DELETE_FILE', entity: 'UserProfileFile', entityId: fileId, description: `Deleted file ${file.originalName}` });
      res.json(successResponse(null, 'File deleted'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'DELETE_FILE', entity: 'UserProfileFile', status: 'Failed', level: 'error', errorMessage: error.message });
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };
}
