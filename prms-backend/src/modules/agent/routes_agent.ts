import express from 'express';
import { agentOnly, adminOrAgent } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';
import { AgentController } from './controller_agent';

const router = express.Router();
const agent = new AgentController();

router.get('/me/properties', authenticate, agentOnly, agent.myProperties);
router.get('/', authenticate, adminOrAgent, agent.list);
router.get('/:id', authenticate, adminOrAgent, agent.getById);
router.post('/', authenticate, adminOrAgent, agent.create);
router.put('/:id', authenticate, adminOrAgent, agent.update);
router.delete('/:id', authenticate, agentOnly, agent.remove);
router.post('/:id/assign', authenticate, adminOrAgent, agent.assignProperty);
router.get('/:id/properties', authenticate, adminOrAgent, agent.getAssignedProperties);

export default router;
