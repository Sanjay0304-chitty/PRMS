import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord } from '../../middleware/rbac';
import { createPropertyBody, updatePropertyBody, propertyIdParam } from './dto';
import { PropertyController } from './controller_property';
import upload from '../../middleware/upload';
import uploadProperty from '../../middleware/uploadProperty';

const router = express.Router();
const ctrl = new PropertyController();

router.get('/', ctrl.list);
router.get('/my-properties', authenticate, ctrl.myProperties);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, adminOrLandlord, createPropertyBody, ctrl.create);
router.put('/:id', authenticate, adminOrLandlord, propertyIdParam, updatePropertyBody, ctrl.update);
router.delete('/:id', authenticate, ctrl.deactivate);
router.post('/:id/images', authenticate, uploadProperty.single('image'), ctrl.addImage);
router.delete('/images/:imageId', authenticate, ctrl.deleteImage);
router.post('/:id/videos', authenticate, uploadProperty.single('video'), ctrl.addVideo);
router.delete('/:id/videos', authenticate, ctrl.deleteVideo);
router.post('/:id/documents', authenticate, uploadProperty.single('document'), ctrl.addDocument);
router.delete('/:id/documents', authenticate, ctrl.deleteDocument);

export default router;
