import express from 'express';
import { agentOnly, adminOnly, adminOrLandlord, authorize } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';
import { AgentController } from './controller_agent';

const router = express.Router();
const agent = new AgentController();

router.get('/me/properties', authenticate, agentOnly, agent.myProperties);
router.get('/me/dashboard', authenticate, agentOnly, agent.dashboard);
router.get('/', authenticate, adminOrLandlord, agent.list);
router.get('/:id', authenticate, authorize('Admin', 'Landlord', 'Agent'), agent.getById);
router.post('/', authenticate, adminOnly, agent.create);
router.put('/:id', authenticate, adminOnly, agent.update);
router.delete('/:id', authenticate, adminOnly, agent.remove);
router.post('/:id/assign', authenticate, adminOrLandlord, agent.assignProperty);
router.delete('/:id/assign/:propertyId', authenticate, adminOrLandlord, agent.unassignProperty);
router.get('/:id/properties', authenticate, authorize('Admin', 'Landlord', 'Agent'), agent.getAssignedProperties);

export default router;
