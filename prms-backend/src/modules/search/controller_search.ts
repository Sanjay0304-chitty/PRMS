import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as searchService from './service_search';
import { successResponse } from '../../utils/response';

export class SearchController {
  search = async (req: Request, res: Response) => {
    try {
      const result = await searchService.searchProperties(req.query as any);
      res.json(successResponse(result));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  toggleFavorite = async (req: AuthRequest, res: Response) => {
    try {
      const nowFavorite = await searchService.toggleFavorite(req.user!.id, String(req.params.propertyId));
      res.json(successResponse({ isFavorite: nowFavorite }));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getFavorites = async (req: AuthRequest, res: Response) => {
    try {
      const favorites = await searchService.getFavorites(req.user!.id);
      res.json(successResponse(favorites));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
