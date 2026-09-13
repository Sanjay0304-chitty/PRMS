import { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { favoriteController } from './controller_favorite';

const router = Router();

router.get('/', authenticate, favoriteController.getMyFavorites);
router.get('/:propertyId', authenticate, favoriteController.checkFavorite);
router.post('/:propertyId', authenticate, favoriteController.addFavorite);
router.delete('/:propertyId', authenticate, favoriteController.removeFavorite);

export default router;