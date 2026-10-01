import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as agentService from './service_agent';
import { successResponse, paginatedResponse } from '../../utils/response';
import { prisma } from '../../db';
import { recordAudit } from '../admin/service_audit';

async function auditAssignment(req: AuthRequest, action: string, agentId: string, propertyId: string) {
  await recordAudit({
    userId: req.user!.id,
    username: req.user!.email,
    userRole: req.user!.role,
    action,
    entity: 'AgentProperty',
    entityId: `${agentId}:${propertyId}`,
    description: `${action === 'ASSIGN_AGENT_PROPERTY' ? 'Assigned' : 'Removed'} Agent ${agentId} ${action === 'ASSIGN_AGENT_PROPERTY' ? 'to' : 'from'} property ${propertyId}`,
    status: 'Success',
    level: 'info',
    ipAddress: req.ip || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl,
    httpMethod: req.method,
    module: 'Agent',
  });
}

export class AgentController {
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { search, propertyId } = req.query as any;
      const ownerId = req.user!.role === 'Landlord' ? req.user!.id : undefined;
      if (ownerId && propertyId) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== ownerId) return res.status(403).json({ success: false, error: { message: 'You can only filter Agents by your own properties' } });
      }
      const { agents, total } = await agentService.getAllAgents(page, limit, search, propertyId, ownerId);
      res.json(paginatedResponse(agents, page, limit, total));
    } catch (error: any) { 
      res.status(500).json({ success: false, error: { message: error.message } }); 
    }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const agentId = String(req.params.id);
      if (req.user!.role === 'Agent') {
        const ownAgent = await prisma.agent.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
        if (!ownAgent || ownAgent.id !== agentId) return res.status(403).json({ success: false, error: { message: 'You can only view your own Agent profile' } });
      }
      const ownerId = req.user!.role === 'Landlord' ? req.user!.id : undefined;
      const agent = await agentService.getAgentById(agentId, ownerId);
      if (!agent) return res.status(404).json({ success: false, error: { message: 'Agent not found' } });
      res.json(successResponse(agent));
    } catch (error: any) { 
      res.status(500).json({ success: false, error: { message: error.message } }); 
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const agent = await agentService.createAgent(userId);
      res.status(201).json(successResponse(agent, 'Agent created'));
    } catch (error: any) { 
      res.status(400).json({ success: false, error: { message: error.message } }); 
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const agent = await agentService.updateAgent(String(req.params.id), req.body);
      res.json(successResponse(agent, 'Agent updated'));
    } catch (error: any) { 
      res.status(400).json({ success: false, error: { message: error.message } }); 
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await agentService.deleteAgent(String(req.params.id));
      res.json(successResponse(null, 'Agent deleted'));
    } catch (error: any) { 
      res.status(400).json({ success: false, error: { message: error.message } }); 
    }
  };

  assignProperty = async (req: AuthRequest, res: Response) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) return res.status(400).json({ success: false, error: { message: 'propertyId is required' } });
      const agentId = String(req.params.id);
      await agentService.assignProperty(agentId, propertyId, req.user!.id, req.user!.role);
      await auditAssignment(req, 'ASSIGN_AGENT_PROPERTY', agentId, propertyId);
      res.json(successResponse(null, 'Property assigned to agent'));
    } catch (error: any) { 
      res.status(error.statusCode || 400).json({ success: false, error: { message: error.message } });
    }
  };

  unassignProperty = async (req: AuthRequest, res: Response) => {
    try {
      const agentId = String(req.params.id);
      const propertyId = String(req.params.propertyId);
      await agentService.unassignProperty(agentId, propertyId, req.user!.id, req.user!.role);
      await auditAssignment(req, 'UNASSIGN_AGENT_PROPERTY', agentId, propertyId);
      res.json(successResponse(null, 'Property removed from agent'));
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: { message: error.message } });
    }
  };

  myProperties = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { agents, total } = await agentService.getMyAssignedProperties(req.user!.id, page, limit);
      res.json(paginatedResponse(agents, page, limit, total));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  dashboard = async (req: AuthRequest, res: Response) => {
    try {
      const dashboard = await agentService.getAgentDashboard(req.user!.id);
      res.json(successResponse(dashboard));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  getAssignedProperties = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const agentId = String(req.params.id);
      if (req.user!.role === 'Agent') {
        const ownAgent = await prisma.agent.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
        if (!ownAgent || ownAgent.id !== agentId) return res.status(403).json({ success: false, error: { message: 'You can only view your own assignments' } });
      }
      const ownerId = req.user!.role === 'Landlord' ? req.user!.id : undefined;
      const { agents, total } = await agentService.getAssignedProperties(agentId, page, limit, ownerId);
      res.json(paginatedResponse(agents, page, limit, total));
    } catch (error: any) { 
      res.status(500).json({ success: false, error: { message: error.message } }); 
    }
  };
}
