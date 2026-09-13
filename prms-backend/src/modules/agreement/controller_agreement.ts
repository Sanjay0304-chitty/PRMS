import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as agreementService from './service_agreement';
import { successResponse } from '../../utils/response';
import { createNotification } from '../admin/service_admin';
import { recordAudit } from '../admin/service_audit';
import { hasPropertyAuthority } from '../../utils/propertyAuthority';

const log = async (req: AuthRequest, action: string, entityId?: string, description?: string, status = 'Success', level = 'info', errorMessage?: string) => {
  await recordAudit({
    action, entity: 'Agreement', entityId, description, status, level, errorMessage,
    userId: req.user?.id, username: req.user?.email || undefined, userRole: req.user?.role,
    ipAddress: (req as any).ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'],
    requestUrl: req.originalUrl, httpMethod: req.method, module: 'Agreement',
  });
};

// The tenant and landlord always have access to their own agreement; an
// Agent assigned to the property may also view (and, while still a draft,
// help correct) it, but never sign for either party — that stays gated
// separately to the actual tenant/landlord in service_agreement.ts.
async function canAccess(agreement: any, userId: string, role: string) {
  if (role === 'admin') return true;
  if (agreement.booking.userId === userId) return true;
  if (agreement.booking.property.ownerId === userId) return true;
  if (role === 'agent') return hasPropertyAuthority(userId, role, agreement.booking.property.ownerId, agreement.booking.propertyId);
  return false;
}

export class AgreementController {
  generate = async (req: AuthRequest, res: Response) => {
    try {
      const bookingId = String(req.body?.bookingId);
      const { prisma } = await import('../../db');
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { property: true } });
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (role === 'landlord' && booking.property.ownerId === req.user!.id);
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can generate an agreement' } });
      const agreement = await agreementService.generateAgreement(bookingId, req.body?.terms);
      await createNotification({ userId: booking.userId, type: 'agreement_ready', title: 'Tenancy agreement ready', message: `A tenancy agreement (${agreement.reference}) is ready for your review and signature.` }).catch(() => {});
      await log(req, 'GENERATE_AGREEMENT', agreement.id, `Generated agreement ${agreement.reference} v${agreement.version}`);
      res.status(201).json(successResponse(agreement, 'Agreement generated'));
    } catch (error: any) { await log(req, 'GENERATE_AGREEMENT', undefined, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const agreement = await agreementService.getById(String(req.params.id));
      if (!agreement) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
      const role = (req.user!.role || '').toLowerCase();
      if (!(await canAccess(agreement, req.user!.id, role))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this agreement' } });
      res.json(successResponse(agreement));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  getByBooking = async (req: AuthRequest, res: Response) => {
    try {
      const { prisma } = await import('../../db');
      const booking = await prisma.booking.findUnique({ where: { id: String(req.params.bookingId) }, include: { property: true } });
      if (!booking) return res.status(404).json({ success: false, error: { message: 'Application not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || booking.userId === req.user!.id || booking.property.ownerId === req.user!.id
        || (role === 'agent' && await hasPropertyAuthority(req.user!.id, role, booking.property.ownerId, booking.propertyId));
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'You do not have access to this application' } });
      const agreements = await agreementService.getByBooking(String(req.params.bookingId));
      res.json(successResponse(agreements));
    } catch (error: any) { res.status(500).json({ success: false, error: { message: error.message } }); }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const agreement = await agreementService.getById(String(req.params.id));
      if (!agreement) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = await canAccess(agreement, req.user!.id, role) && role !== 'tenant';
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner, an assigned agent, or an administrator can edit this agreement' } });
      const updated = await agreementService.updateDraft(String(req.params.id), req.body);
      await log(req, 'UPDATE_AGREEMENT', req.params.id, 'Edited draft agreement');
      res.json(successResponse(updated, 'Agreement updated'));
    } catch (error: any) { await log(req, 'UPDATE_AGREEMENT', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  tenantConsent = async (req: AuthRequest, res: Response) => {
    try {
      const { agreement, simulatedOtp } = await agreementService.tenantConsent(String(req.params.id), req.user!.id, req.body?.legalName);
      await log(req, 'AGREEMENT_TENANT_CONSENT', req.params.id, 'Tenant consented and requested OTP');
      // Demonstration mode — the OTP is normally delivered out-of-band (SMS/email);
      // here it is handed back directly so the flow can be demonstrated end-to-end.
      res.json(successResponse({ agreement, simulatedOtp }, 'Consent recorded. Enter the verification code to complete your signature.'));
    } catch (error: any) { await log(req, 'AGREEMENT_TENANT_CONSENT', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  verifyOtp = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await agreementService.verifyTenantOtp(String(req.params.id), req.user!.id, req.body?.otp);
      await log(req, 'AGREEMENT_OTP_VERIFIED', req.params.id, 'Tenant signature completed via OTP verification');
      const ownerId = (updated as any).booking.property.ownerId;
      await createNotification({ userId: ownerId, type: 'agreement_tenant_signed', title: 'Tenant signed the agreement', message: `The tenant has signed agreement ${updated.reference}. Your signature is needed to complete it.` }).catch(() => {});
      res.json(successResponse(updated, 'Signature verified'));
    } catch (error: any) { await log(req, 'AGREEMENT_OTP_VERIFIED', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  landlordSign = async (req: AuthRequest, res: Response) => {
    try {
      const updated = await agreementService.landlordSign(String(req.params.id), req.user!.id, req.body?.legalName);
      await log(req, 'AGREEMENT_LANDLORD_SIGNED', req.params.id, 'Landlord signature completed — agreement fully signed');
      await createNotification({ userId: (updated as any).booking.userId, type: 'agreement_fully_signed', title: 'Agreement fully signed', message: `Agreement ${updated.reference} has been fully signed by both parties.` }).catch(() => {});
      res.json(successResponse(updated, 'Agreement fully signed'));
    } catch (error: any) { await log(req, 'AGREEMENT_LANDLORD_SIGNED', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  uploadPhysical = async (req: AuthRequest, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: { message: 'No file provided' } });
      const url = `/uploads/agreements/${file.filename}`;
      const updated = await agreementService.uploadPhysicalCopy(String(req.params.id), req.user!.id, url);
      await log(req, 'AGREEMENT_PHYSICAL_UPLOAD', req.params.id, 'Uploaded physically signed copy');
      res.json(successResponse(updated, 'Physical copy uploaded — awaiting verification'));
    } catch (error: any) { await log(req, 'AGREEMENT_PHYSICAL_UPLOAD', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  verifyPhysical = async (req: AuthRequest, res: Response) => {
    try {
      const agreement = await agreementService.getById(String(req.params.id));
      if (!agreement) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (agreement as any).booking.property.ownerId === req.user!.id;
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can verify a physical copy' } });
      const updated = await agreementService.verifyPhysicalCopy(String(req.params.id), req.user!.id);
      await log(req, 'AGREEMENT_PHYSICAL_VERIFIED', req.params.id, 'Verified physically signed copy');
      await createNotification({ userId: (updated as any).booking.userId, type: 'agreement_fully_signed', title: 'Agreement verified', message: `Your physically signed agreement ${updated.reference} has been verified.` }).catch(() => {});
      res.json(successResponse(updated, 'Physical copy verified'));
    } catch (error: any) { await log(req, 'AGREEMENT_PHYSICAL_VERIFIED', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  cancel = async (req: AuthRequest, res: Response) => {
    try {
      const agreement = await agreementService.getById(String(req.params.id));
      if (!agreement) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
      const role = (req.user!.role || '').toLowerCase();
      const allowed = role === 'admin' || (agreement as any).booking.property.ownerId === req.user!.id;
      if (!allowed) return res.status(403).json({ success: false, error: { message: 'Only the property owner or an administrator can cancel this agreement' } });
      const updated = await agreementService.cancelAgreement(String(req.params.id));
      await log(req, 'CANCEL_AGREEMENT', req.params.id, 'Cancelled agreement');
      res.json(successResponse(updated, 'Agreement cancelled'));
    } catch (error: any) { await log(req, 'CANCEL_AGREEMENT', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };

  remind = async (req: AuthRequest, res: Response) => {
    try {
      const agreement = await agreementService.getById(String(req.params.id));
      if (!agreement) return res.status(404).json({ success: false, error: { message: 'Agreement not found' } });
      const role = (req.user!.role || '').toLowerCase();
      if (!(await canAccess(agreement, req.user!.id, role))) return res.status(403).json({ success: false, error: { message: 'You do not have access to this agreement' } });

      let targetUserId: string | null = null;
      if (agreement.status === 'DRAFT' || agreement.status === 'AWAITING_TENANT_SIGNATURE') targetUserId = (agreement as any).booking.userId;
      else if (agreement.status === 'AWAITING_LANDLORD_SIGNATURE') targetUserId = (agreement as any).booking.property.ownerId;
      if (!targetUserId) return res.status(400).json({ success: false, error: { message: 'This agreement is not awaiting anyone\'s signature right now' } });

      await createNotification({ userId: targetUserId, type: 'agreement_reminder', title: 'Signature reminder', message: `A reminder to sign tenancy agreement ${agreement.reference}.` });
      await log(req, 'REMIND_AGREEMENT_SIGNATURE', req.params.id, 'Sent a signature reminder');
      res.json(successResponse(null, 'Reminder sent'));
    } catch (error: any) { await log(req, 'REMIND_AGREEMENT_SIGNATURE', req.params.id, undefined, 'Failed', 'error', error.message); res.status(400).json({ success: false, error: { message: error.message } }); }
  };
}
