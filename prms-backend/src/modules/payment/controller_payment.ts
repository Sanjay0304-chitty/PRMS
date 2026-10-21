import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as paymentService from './service_payment';
import { successResponse, paginatedResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';

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
  list = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { payments, total } = req.user!.role === 'Agent'
        ? await paymentService.getAgentPayments(req.user!.id, page, limit)
        : req.user!.role === 'Landlord'
          ? await paymentService.getLandlordPayments(req.user!.id, page, limit)
          : await paymentService.getPayments(page, limit);
      HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', description: `Listed payments (page ${page})` });
      res.json(paginatedResponse(payments, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENTS', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const payment = await paymentService.getPaymentById(String(req.params.id));
      if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } });
      const role = req.user!.role.toLowerCase();
      const allowed = payment.userId === req.user!.id
        || await hasPropertyAuthority(req.user!.id, role, payment.booking.property.ownerId, payment.booking.propertyId);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have access to this payment' } });
      HELPERS(req).log({ action: 'VIEW_PAYMENT', entity: 'Payment', entityId: payment.id, description: `Viewed payment` });
      if (role === 'agent') {
        return res.json(successResponse({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          due_date: payment.due_date,
          paid_at: payment.paid_at,
          booking: { property: { id: payment.booking.property.id, title: payment.booking.property.title } },
        }));
      }
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

  markPaid = async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      if (role !== 'Admin' && role !== 'Landlord') {
        return res.status(403).json({ success: false, error: { message: 'Only Admin or Landlord can mark a payment as paid' } });
      }
      const existing = await paymentService.getPaymentById(String(req.params.id));
      if (!existing) return res.status(404).json({ success: false, error: { message: 'Payment not found' } });
      if (role === 'Landlord' && existing.booking.property.ownerId !== req.user!.id) {
        return res.status(403).json({ success: false, error: { message: 'You can only confirm payments for your own properties' } });
      }
      const payment = await paymentService.markAsPaid(existing.id);
      HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', entityId: String(req.params.id), description: `Payment marked as paid` });
      res.json(successResponse(payment, 'Payment marked as paid'));
    } catch (error: any) { HELPERS(req).log({ action: 'MARK_PAYMENT_PAID', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  summary = async (req: AuthRequest, res: Response) => {
    try {
      const summary = req.user!.role === 'Agent'
        ? await paymentService.getAgentFinanceSummary(req.user!.id)
        : req.user!.role === 'Landlord'
          ? await paymentService.getLandlordFinanceSummary(req.user!.id)
          : await paymentService.getFinanceSummary(req.user!.id);
      HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', description: `Viewed financial summary` });
      res.json(successResponse(summary));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_PAYMENT_SUMMARY', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  // ── Mock Payment Gateway ─────────────────────────────────────────────

  myPayments = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { payments, total } = await paymentService.getMyPayments(req.user!.id, page, limit);
      HELPERS(req).log({ action: 'VIEW_MY_PAYMENTS', entity: 'Payment', description: `Listed own payments (page ${page})` });
      res.json(paginatedResponse(payments, page, limit, total));
    } catch (error: any) { HELPERS(req).log({ action: 'VIEW_MY_PAYMENTS', entity: 'Payment', status: 'Failed', level: 'error', errorMessage: error.message }); res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  mockCheckout = async (req: AuthRequest, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { method } = req.body;
      if (!['FPX', 'QR', 'CARD'].includes(method)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid payment method. Use FPX, QR, or CARD.' } });
      }
      const transaction = await paymentService.startMockCheckout(String(req.params.paymentId), req.user!.id, method);
      HELPERS(req).log({ action: 'MOCK_CHECKOUT_START', entity: 'MockTransaction', entityId: transaction.id, description: `Mock checkout started with ${method}` });
      res.json(successResponse(transaction));
    } catch (error: any) {
      HELPERS(req).log({ action: 'MOCK_CHECKOUT_START', entity: 'MockTransaction', status: 'Failed', level: error.message.includes('already') || error.message.includes('active') ? 'warn' : 'error', errorMessage: error.message });
      const code = error.message.includes('already been paid') ? 409 : error.message.includes('active checkout') ? 409 : 400;
      res.status(code).json({ success: false, error: { message: error.message } });
    }
  };

  mockTransactionStatus = async (req: AuthRequest, res: Response) => {
    try {
      const transaction = await paymentService.getMockTransaction(String(req.params.transactionId), req.user!.id);
      res.json(successResponse(transaction));
    } catch (error: any) {
      const code = error.message.includes('not found') ? 404 : error.message.includes('does not belong') ? 403 : 400;
      res.status(code).json({ success: false, error: { message: error.message } });
    }
  };

  completeMockTransaction = async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const { outcome } = req.body;
      if (!['SUCCESS', 'FAILED', 'CANCELLED'].includes(outcome)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid outcome. Use SUCCESS, FAILED, or CANCELLED.' } });
      }
      const result = await paymentService.completeMockTransaction(transactionId, req.user!.id, outcome, req.body.failureMessage);
      HELPERS(req).log({ action: outcome === 'SUCCESS' ? 'MOCK_PAYMENT_COMPLETED' : 'MOCK_PAYMENT_FAILED', entity: 'MockTransaction', entityId: transactionId, description: `Mock transaction ${outcome.toLowerCase()} (${result.payment.status})` });
      res.json(successResponse(result, outcome === 'SUCCESS' ? 'Payment successful!' : 'Transaction updated.'));
    } catch (error: any) {
      HELPERS(req).log({ action: 'COMPLETE_MOCK_TRANSACTION', entity: 'MockTransaction', status: 'Failed', level: 'error', errorMessage: error.message });
      const code = error.message.includes('no longer pending') ? 409 : error.message.includes('not found') ? 404 : 400;
      res.status(code).json({ success: false, error: { message: error.message } });
    }
  };
}
