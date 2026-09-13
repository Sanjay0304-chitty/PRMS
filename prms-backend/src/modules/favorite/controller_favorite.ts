import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as favoriteService from './service_favorite';
import { successResponse } from '../../utils/response';

export class FavoriteController {
  getMyFavorites = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const data = await favoriteService.getMyFavorites(userId);
      res.json(successResponse(data));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  checkFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const propertyId = String(req.params.propertyId);
      const data = await favoriteService.checkFavorite(userId, propertyId);
      res.json(successResponse(data));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  addFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const propertyId = String(req.params.propertyId);
      const data = await favoriteService.addFavorite(userId, propertyId);
      res.json(successResponse(data, 'Favorite added'));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  removeFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const propertyId = String(req.params.propertyId);
      await favoriteService.removeFavorite(userId, propertyId);
      res.json(successResponse(null, 'Favorite removed'));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}

export const favoriteController = new FavoriteController();