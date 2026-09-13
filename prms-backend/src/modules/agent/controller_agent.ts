import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as agentService from './service_agent';
import { successResponse, paginatedResponse } from '../../utils/response';

export class AgentController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { search, propertyId } = req.query as any;
      const { agents, total } = await agentService.getAllAgents(page, limit, search, propertyId);
      res.json(paginatedResponse(agents, page, limit, total));
    } catch (error: any) { 
      res.status(500).json({ success: false, error: { message: error.message } }); 
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const agent = await agentService.getAgentById(String(req.params.id));
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

  assignProperty = async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.body;
      await agentService.assignProperty(String(req.params.id), propertyId);
      res.json(successResponse(null, 'Property assigned to agent'));
    } catch (error: any) { 
      res.status(400).json({ success: false, error: { message: error.message } }); 
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

  getAssignedProperties = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { agents, total } = await agentService.getAssignedProperties(String(req.params.id), page, limit);
      res.json(paginatedResponse(agents, page, limit, total));
    } catch (error: any) { 
      res.status(500).json({ success: false, error: { message: error.message } }); 
    }
  };
}