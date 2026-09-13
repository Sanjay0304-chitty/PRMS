import express from 'express';
import { authenticate } from '../../middleware/auth';
import { CommunicationController } from './controller_communication';

const router = express.Router();
const ctrl = new CommunicationController();

router.use(authenticate);
router.post('/send', ctrl.send);
router.get('/', ctrl.getConversations);
router.get('/conversation/:conversationId', ctrl.getMessages);
router.patch('/:id/mark-read', ctrl.markRead);
router.patch('/:id', ctrl.editMessage);
router.delete('/:id', ctrl.unsendMessage);

export default router;
