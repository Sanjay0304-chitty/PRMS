import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as paymentService from './service_payment';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';

const HELPERS = (req: Request) => {
  const ip = (req as any).ip || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'];
  const url = req.originalUrl;
  const method = req.method;
  const auth = req as AuthRequest;
  const log = async (ctx: { action: string; entity: string; entityId?: string; description?: string; status?: string; level?: string; errorMessage?: string }) => {
    await recordAudit({ ...ctx, userId: auth.user?.id, username: auth.user?.email || undefined, userRole: auth.user?.role, ipAddress: ip, userAgent: ua, requestUrl: url, httpMethod: method, module: 'Payment', status: ctx.status || 'Success', level: ctx.level || 'info' });
  };
  return { log };
};

export class PaymentController {
  list = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { payments, total } = await paymentService.getPayments(page, limit);
      HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', description: `Listed payments (page ${page})` });
      res.json(paginatedResponse(payments, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const payment = await paymentService.getPaymentById(String(req.params.id));
      if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } });
      HELPERS(req).log({ action: 'VIEW_PAYMENT', entity: 'Payment', entityId: payment.id, description: `Viewed payment` });
      res.json(successResponse(payment));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENT', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const payment = await paymentService.createPayment({ ...req.body, userId: req.user!.id });
      HELPERS(req).log({ action: 'CREATE_PAYMENT', entity: 'Payment', entityId: payment.id, description: `Created payment of amount ${(req.body as any).amount}` });
      res.status(201).json(successResponse(payment, 'Payment recorded'));
    } catch (error: any) { HELPERS(req).log({ action: 'CREATE_PAYMENT', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  markPaid = async (req: Request, res: Response) => {
    try {
      const payment = await paymentService.markAsPaid(String(req.params.id));
      HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', entityId: req.params.id, description: `Payment marked as paid` });
      res.json(successResponse(payment, 'Payment marked as paid'));
    } catch (error: any) { HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  summary = async (req: AuthRequest, res: Response) => {
    try {
      const summary = await paymentService.getFinanceSummary(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', description: `Viewed financial summary` });
      res.json(successResponse(summary));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };
}
