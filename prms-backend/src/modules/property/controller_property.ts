import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth';
import * as propertyService from './service_property';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';
import { prisma } from '../../db';
import { clearCache } from '../../middleware/responseCache';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Property', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class PropertyController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const { properties, total } = await propertyService.getAllProperties(page, limit, { type, search });
      HELPERS(req).log({ action: 'VIEW_PROPERTIES', entity: 'Property', description: `Listed properties (page ${page})` });
      res.json(paginatedResponse(properties, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PROPERTIES', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const property = await propertyService.getPropertyById(String(req.params.id));
      if (!property) return res.status(404).json({ success: false, error: { message: 'Property not found' } });
      HELPERS(req).log({ action: 'VIEW_PROPERTY', entity: 'Property', entityId: property?.id, description: `Viewed property ${property?.title || req.params.id}` });
      res.json(successResponse(property));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PROPERTY', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: { message: errors.array()[0].msg } });
    try {
      const property = await propertyService.createProperty(req.body, req.user!.id);
      clearCache('^/properties');
      HELPERS(req).log({ action: 'CREATE_PROPERTY', entity: 'Property', entityId: property?.id, description: `Created property ${property?.title}` });
      res.status(201).json(successResponse(property, 'Property created'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_PROPERTY', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const property = await propertyService.updateProperty(String(req.params.id), req.body);
      clearCache('^/properties');
      HELPERS(req).log({ action: 'UPDATE_PROPERTY', entity: 'Property', entityId: property?.id, description: `Updated property ${property?.title || req.params.id}` });
      res.json(successResponse(property, 'Property updated'));
    } catch (error: any) { HELPERS(req).log({ action: 'UPDATE_PROPERTY', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  deactivate = async (req: Request, res: Response) => {
    try {
      const prop = await propertyService.getPropertyById(String(req.params.id));
      await propertyService.deactivateProperty(String(req.params.id));
      clearCache('^/properties');
      HELPERS(req).log({ action: 'DEACTIVATE_PROPERTY', entity: 'Property', entityId: prop?.id, description: `Deactivated property ${prop?.title || prop?.id}` });
      res.json(successResponse(null, 'Property deactivated'));
    } catch (error: any) { HELPERS(req).log({ action: 'DEACTIVATE_PROPERTY', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  addImage = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: { message: 'No image file provided' } });
      const url = `/uploads/properties/${file.filename}`;
      const image = await propertyService.addImage(String(req.params.id), url);
      clearCache('^/properties');
      HELPERS(req).log({ action: 'ADD_PROPERTY_IMAGE', entity: 'Property', entityId: String(req.params.id), description: `Added image to property` });
      res.status(201).json(successResponse(image));
    } catch (error: any) { HELPERS(req).log({ action: 'ADD_PROPERTY_IMAGE', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  deleteImage = async (req: Request, res: Response) => {
    try {
      const image = await propertyService.getImageById(String(req.params.imageId));
      await propertyService.deleteImage(String(req.params.imageId));
      if (image?.url) {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(__dirname, '..', '..', '..', 'uploads', 'properties', image.url.replace(/^\/uploads\/properties\//, ''));
        fs.promises.unlink(filePath).catch(() => {});
      }
      clearCache('^/properties');
      HELPERS(req).log({ action: 'DELETE_PROPERTY_IMAGE', entity: 'PropertyImage', entityId: String(req.params.imageId), description: `Deleted property image` });
      res.json(successResponse(null, 'Image deleted'));
    } catch (error: any) { HELPERS(req).log({ action: 'DELETE_PROPERTY_IMAGE', entity: 'PropertyImage', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  myProperties = async (req: AuthRequest, res: Response) => {
    try {
      const properties = await propertyService.getLandlordProperties(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_MY_PROPERTIES', entity: 'Property', description: `Viewed own properties` });
      res.json(successResponse(properties));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_MY_PROPERTIES', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  addVideo = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: { message: 'No video file provided' } });
      const url = `/uploads/properties/${file.filename}`;
      // Generate thumbnail for video
      let thumbnailUrl = '';
      try {
        const { generateThumbnail } = await import('../../utils/generateThumbnail');
        const path = await import('path');
        const sourcePath = path.join(__dirname, '..', '..', '..', 'uploads', 'properties', file.filename);
        thumbnailUrl = await generateThumbnail(sourcePath);
      } catch (e) { console.warn('Video thumbnail generation skipped:', e); }
      const image = await propertyService.addImage(String(req.params.id), url, thumbnailUrl || undefined);
      // Override type to 'video' since addImage defaults to 'image' — use the
      // updated row in the response, not the stale pre-update `image` object.
      const video = await prisma.propertyImage.update({
        where: { id: image.id },
        data: { type: 'video' },
      });
      clearCache('^/properties');
      HELPERS(req).log({ action: 'ADD_PROPERTY_VIDEO', entity: 'Property', entityId: String(req.params.id), description: `Added video to property` });
      res.status(201).json(successResponse(video));
    } catch (error: any) { HELPERS(req).log({ action: 'ADD_PROPERTY_VIDEO', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  deleteVideo = async (req: Request, res: Response) => {
    try {
      const urlToRemove = (req as any).body?.url || req.query.url as string;
      if (!urlToRemove) return res.status(400).json({ success: false, error: { message: 'Video URL required in body or query' } });
      const prop = await propertyService.removeVideoFromProperty(String(req.params.id), urlToRemove);
      if (prop === null) return res.status(404).json({ success: false, error: { message: 'Video URL not found on this property' } });
      // Clean up file from disk
      if (urlToRemove) {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(__dirname, '..', '..', '..', 'uploads', 'properties', urlToRemove.replace(/^\/uploads\/properties\//, ''));
        fs.promises.unlink(filePath).catch(() => {});
      }
      clearCache('^/properties');
      HELPERS(req).log({ action: 'DELETE_PROPERTY_VIDEO', entity: 'Property', entityId: String(req.params.id), description: `Removed video from property` });
      res.json(successResponse(prop, 'Video deleted'));
    } catch (error: any) { HELPERS(req).log({ action: 'DELETE_PROPERTY_VIDEO', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  addDocument = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: { message: 'No document file provided' } });
      const url = `/uploads/properties/${file.filename}`;
      // Store document as PropertyImage with type='document' and original filename
      const image = await prisma.propertyImage.create({
        data: {
          propertyId: String(req.params.id),
          url,
          type: 'document',
          documentName: file.originalname,
        },
      });
      clearCache('^/properties');
      HELPERS(req).log({ action: 'ADD_PROPERTY_DOCUMENT', entity: 'Property', entityId: String(req.params.id), description: `Added document to property` });
      res.status(201).json(successResponse(image));
    } catch (error: any) { HELPERS(req).log({ action: 'ADD_PROPERTY_DOCUMENT', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  deleteDocument = async (req: Request, res: Response) => {
    try {
      const urlToRemove = (req as any).body?.url || req.query.url as string;
      if (!urlToRemove) return res.status(400).json({ success: false, error: { message: 'Document URL required in body or query' } });
      const prop = await propertyService.removeDocumentFromProperty(String(req.params.id), urlToRemove);
      if (prop === null) return res.status(404).json({ success: false, error: { message: 'Document URL not found on this property' } });
      // Clean up file from disk
      if (urlToRemove) {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(__dirname, '..', '..', '..', 'uploads', 'properties', urlToRemove.replace(/^\/uploads\/properties\//, ''));
        fs.promises.unlink(filePath).catch(() => {});
      }
      clearCache('^/properties');
      HELPERS(req).log({ action: 'DELETE_PROPERTY_DOCUMENT', entity: 'Property', entityId: String(req.params.id), description: `Removed document from property` });
      res.json(successResponse(prop, 'Document deleted'));
    } catch (error: any) { HELPERS(req).log({ action: 'DELETE_PROPERTY_DOCUMENT', entity: 'Property', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
