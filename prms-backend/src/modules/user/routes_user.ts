import express from 'express';
import { authenticate } from '../../middleware/auth';
import { adminOnly } from '../../middleware/rbac';
import { UserController } from './controller_user';
import { AuthRequest } from '../../middleware/auth';
import upload from '../../middleware/fileUpload';
import { FileUploadController } from './controller_fileUpload';
import { getUserMedia, deletePropertyImage } from './service_fileUpload';
import { createUserBody, updateUserBody, userQuery, userIdParam, changeRoleBody } from './dto';

const router = express.Router();
const ctrl = new UserController();
const fileCtrl = new FileUploadController();

router.use(authenticate);

// File upload endpoints (MUST come before /:id routes)
router.post('/files', upload.single('file'), fileCtrl.upload);
router.get('/files', fileCtrl.list);
router.get('/files/:fileId', fileCtrl.getById);
router.delete('/files/:fileId', fileCtrl.remove);

// My Documents media endpoint (includes property images)
router.get('/my-media', fileCtrl.getUserMedia);

// Delete property image endpoint
router.delete('/my-media/images/:imageId', async (req, res) => {
  const imageId = String(req.params.imageId);
  try {
    const result = await deletePropertyImage(imageId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// Admin-only user management (controller/service already existed but were
// never mounted, so the whole User Management admin page 404'd).
router.get('/', adminOnly, userQuery, ctrl.list);
router.get('/:id', adminOnly, userIdParam, ctrl.getById);
router.post('/', adminOnly, createUserBody, ctrl.create);
router.put('/:id', adminOnly, userIdParam, updateUserBody, ctrl.update);
router.delete('/:id', adminOnly, userIdParam, ctrl.remove);
router.post('/:id/activate', adminOnly, userIdParam, ctrl.activate);
router.post('/:id/suspend', adminOnly, userIdParam, ctrl.suspend);
router.post('/:id/change-role', adminOnly, userIdParam, changeRoleBody, ctrl.changeRole);

export default router;
