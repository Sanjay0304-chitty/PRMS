import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOrLandlord, agentOnly, landlordOnly } from '../../middleware/rbac';
import { createPropertyBody, updatePropertyBody, propertyIdParam } from './dto';
import { PropertyController } from './controller_property';
import upload from '../../middleware/upload';
import uploadProperty from '../../middleware/uploadProperty';

const router = express.Router();
const ctrl = new PropertyController();

router.get('/', ctrl.list);
router.get('/my-properties', authenticate, landlordOnly, ctrl.myProperties);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, adminOrLandlord, createPropertyBody, ctrl.create);
router.put('/:id', authenticate, adminOrLandlord, propertyIdParam, updatePropertyBody, ctrl.update);
router.patch('/:id/operational', authenticate, agentOnly, ctrl.updateOperational);
router.delete('/:id', authenticate, ctrl.deactivate);
router.post('/:id/images', authenticate, ctrl.requireManagedProperty, uploadProperty.single('image'), ctrl.addImage);
router.delete('/images/:imageId', authenticate, ctrl.deleteImage);
router.post('/:id/videos', authenticate, ctrl.requireManagedProperty, uploadProperty.single('video'), ctrl.addVideo);
router.delete('/:id/videos', authenticate, ctrl.deleteVideo);
router.post('/:id/documents', authenticate, ctrl.requireManagedProperty, uploadProperty.single('document'), ctrl.addDocument);
router.delete('/:id/documents', authenticate, ctrl.deleteDocument);

export default router;
