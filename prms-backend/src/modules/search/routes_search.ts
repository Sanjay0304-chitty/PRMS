import express from 'express';
import { authenticate } from '../../middleware/auth';
import { SearchController } from './controller_search';

const router = express.Router();
const ctrl = new SearchController();

router.get('/', ctrl.search);
router.get('/favorites', authenticate, ctrl.getFavorites);
router.post('/favorites/:propertyId/toggle', authenticate, ctrl.toggleFavorite);

export default router;
