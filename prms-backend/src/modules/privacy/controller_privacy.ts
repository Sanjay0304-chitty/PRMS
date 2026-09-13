import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as privacyService from './service_privacy';
import { successResponse } from '../../utils/response';
import { recordAudit } from '../admin/service_audit';
import { createNotification } from '../admin/service_admin';

const log = async (req: AuthRequest, action: string, entityId: string | undefined, description: string, status = 'Success', level = 'info', errorMessage?: string) => {
  await recordAudit({
    action, entity: 'Privacy', entityId, description, status, level, errorMessage,
    userId: req.user?.id, username: req.user?.email || undefined, userRole: req.user?.role,
    ipAddress: (req as any).ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl, httpMethod: req.method, module: 'Privacy',
  });
};

export class PrivacyController {
  /* ── Consent ── */

  recordConsent = async (req: AuthRequest, res: Response) => {
    try {
      const record = await privacyService.recordConsent(req.user!.id, { ...req.body, ipAddress: (req as any).ip });
      await log(req, 'RECORD_CONSENT', record.id, `Recorded ${req.body.type} consent (${req.body.consented ? 'granted' : 'declined'})`);
      res.status(201).json(successResponse(record));
    } catch (error: any) { await log(req, 'RECORD_CONSENT', undefined, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  myConsents = async (req: AuthRequest, res: Response) => {
    try {
      const records = await privacyService.getMyConsents(req.user!.id);
      res.json(successResponse(records));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  withdrawConsent = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.withdrawConsent(String(req.params.id), req.user!.id);
      await log(req, 'WITHDRAW_CONSENT', req.params.id, 'Withdrew consent');
      res.json(successResponse(updated, 'Consent withdrawn'));
    } catch (error: any) { await log(req, 'WITHDRAW_CONSENT', req.params.id, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  /* ── My stored data ── */

  myStoredData = async (req: AuthRequest, res: Response) => {
    try {
      const data = await privacyService.getMyStoredData(req.user!.id);
      await log(req, 'VIEW_STORED_DATA', req.user!.id, 'Viewed own stored personal data');
      res.json(successResponse(data));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  /* ── Privacy requests ── */

  submitRequest = async (req: AuthRequest, res: Response) => {
    try {
      const request = await privacyService.submitRequest(req.user!.id, req.body);
      await log(req, 'SUBMIT_PRIVACY_REQUEST', request.id, `Submitted a ${req.body.type} request`);
      res.status(201).json(successResponse(request, 'Request submitted'));
    } catch (error: any) { await log(req, 'SUBMIT_PRIVACY_REQUEST', undefined, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  myRequests = async (req: AuthRequest, res: Response) => {
    try {
      const requests = await privacyService.getMyRequests(req.user!.id);
      res.json(successResponse(requests));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  allRequests = async (req: AuthRequest, res: Response) => {
    try {
      const requests = await privacyService.getAllRequests(req.query.status as string | undefined);
      res.json(successResponse(requests));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  assignRequest = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.assignRequest(String(req.params.id), req.user!.id);
      await log(req, 'ASSIGN_PRIVACY_REQUEST', req.params.id, 'Assigned privacy request to self');
      res.json(successResponse(updated));
    } catch (error: any) { await log(req, 'ASSIGN_PRIVACY_REQUEST', req.params.id, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  decideRequest = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.decideRequest(String(req.params.id), req.body);
      await log(req, 'DECIDE_PRIVACY_REQUEST', req.params.id, `Decision: ${req.body.decision} - ${req.body.decisionReason}`);
      await createNotification({
        userId: updated.userId,
        type: 'privacy_request_decided',
        title: 'Privacy request update',
        message: `Your privacy request has been ${req.body.decision.toLowerCase()}. Open Privacy & Personal Data for details.`,
      }).catch(() => {});
      res.json(successResponse(updated));
    } catch (error: any) { await log(req, 'DECIDE_PRIVACY_REQUEST', req.params.id, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  completeRequest = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.completeRequest(String(req.params.id));
      await log(req, 'COMPLETE_PRIVACY_REQUEST', req.params.id, 'Marked privacy request completed');
      res.json(successResponse(updated));
    } catch (error: any) { await log(req, 'COMPLETE_PRIVACY_REQUEST', req.params.id, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  /* ── Retention ── */

  getPolicies = async (req: AuthRequest, res: Response) => {
    try {
      const policies = await privacyService.getPolicies();
      res.json(successResponse(policies));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  updatePolicy = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.updatePolicy(String(req.params.category), Number(req.body.retentionDays));
      await log(req, 'UPDATE_RETENTION_POLICY', req.params.category, `Set ${req.params.category} retention to ${req.body.retentionDays} days`);
      res.json(successResponse(updated));
    } catch (error: any) { await log(req, 'UPDATE_RETENTION_POLICY', req.params.category, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  simulateCleanup = async (req: AuthRequest, res: Response) => {
    try {
      const results = await privacyService.simulateCleanup();
      await log(req, 'SIMULATE_RETENTION_CLEANUP', undefined, 'Ran a retention cleanup simulation (dry run, nothing deleted)');
      res.json(successResponse(results));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  /* ── Breach register ── */

  createIncident = async (req: AuthRequest, res: Response) => {
    try {
      const incident = await privacyService.createIncident(req.user!.id, req.body);
      await log(req, 'CREATE_BREACH_INCIDENT', incident.id, `Recorded incident: ${incident.title}`, 'Success', 'warn');
      res.status(201).json(successResponse(incident));
    } catch (error: any) { await log(req, 'CREATE_BREACH_INCIDENT', undefined, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getIncidents = async (req: AuthRequest, res: Response) => {
    try {
      const incidents = await privacyService.getIncidents();
      res.json(successResponse(incidents));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  updateIncident = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await privacyService.updateIncident(String(req.params.id), req.body);
      await log(req, 'UPDATE_BREACH_INCIDENT', req.params.id, 'Updated incident record');
      res.json(successResponse(updated));
    } catch (error: any) { await log(req, 'UPDATE_BREACH_INCIDENT', req.params.id, '', 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
