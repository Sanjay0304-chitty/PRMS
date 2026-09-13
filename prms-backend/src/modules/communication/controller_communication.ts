import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as communicationService from './service_communication';
import { successResponse } from '../../utils/response';

export class CommunicationController {
  send = async (req: AuthRequest, res: Response) => {
    try {
      const message = await communicationService.sendMessage({ ...req.body, conversationId: req.body.conversationId || `conv-${req.user!.id}-${req.body.receiverId}` }, req.user!.id);
      res.status(201).json(successResponse(message));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getConversations = async (req: AuthRequest, res: Response) => {
    try {
      const convs = await communicationService.getConversations(req.user!.id);
      res.json(successResponse(convs));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getMessages = async (req: AuthRequest, res: Response) => {
    try {
      const messages = await communicationService.getMessagesByConversation(String(req.params.conversationId));
      res.json(successResponse(messages));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  markRead = async (req: AuthRequest, res: Response) => {
    try {
      await communicationService.markAsRead(String(req.params.id));
      res.json(successResponse(null, 'Message marked as read'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  editMessage = async (req: AuthRequest, res: Response) => {
    try {
      const message = await communicationService.editMessage(String(req.params.id), req.user!.id, String(req.body.content || ''));
      res.json(successResponse(message, 'Message updated'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  unsendMessage = async (req: AuthRequest, res: Response) => {
    try {
      await communicationService.unsendMessage(String(req.params.id), req.user!.id);
      res.json(successResponse(null, 'Message unsent'));
    } catch (error: any) { res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
