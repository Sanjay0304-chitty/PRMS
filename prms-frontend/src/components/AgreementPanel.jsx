import { useState, useEffect, useCallback } from 'react';
import { agreementApi } from '../api';
import './AgreementPanel.css';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatRM(n) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(Number(n) || 0);
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  AWAITING_TENANT_SIGNATURE: 'Awaiting Tenant Signature',
  AWAITING_LANDLORD_SIGNATURE: 'Awaiting Landlord Signature',
  FULLY_SIGNED: 'Fully Signed',
  PHYSICAL_COPY_PENDING: 'Physical Copy Pending Verification',
  PHYSICALLY_SIGNED: 'Physically Signed',
  SUPERSEDED: 'Superseded',
  CANCELLED: 'Cancelled',
};

/**
 * AgreementPanel — generation, editing, and both electronic and physical
 * signing for a single booking's tenancy agreement. Reused from the
 * Landlord/Admin application-review view and the Tenant's application
 * detail view; behaviour adapts to `role`.
 *
 * Props: bookingId, booking (with .status, .userId, .property.ownerId),
 * role ('tenant' | 'landlord' | 'agent' | 'admin'), userId (current user id).
 */
export default function AgreementPanel({ bookingId, booking, role, userId }) {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [draftForm, setDraftForm] = useState(null);
  const [legalName, setLegalName] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [physicalFile, setPhysicalFile] = useState(null);

  const isTenant = role === 'tenant' && booking?.userId === userId;
  const isLandlordOrAdmin = role === 'admin' || (role === 'landlord' && booking?.property?.ownerId === userId);
  // An assigned Agent may view and help correct a draft's terms, but never
  // sign for either party — that stays reserved to isLandlordOrAdmin below.
  const canEditDraft = isLandlordOrAdmin || role === 'agent';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await agreementApi.getByBooking(bookingId);
      setAgreements(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load agreement');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const latest = agreements[0] || null;

  useEffect(() => {
    if (latest && latest.status === 'DRAFT') {
      setDraftForm({
        monthlyRent: latest.monthlyRent,
        securityDeposit: latest.securityDeposit,
        utilityDeposit: latest.utilityDeposit,
        leaseStartDate: latest.leaseStartDate?.slice(0, 10),
        leaseEndDate: latest.leaseEndDate?.slice(0, 10),
        terms: latest.terms || '',
      });
    }
  }, [latest?.id, latest?.status]);

  // Deliberately keyed on id only, not status: consenting moves the
  // agreement from DRAFT to AWAITING_TENANT_SIGNATURE in the same flow,
  // and resetting on every status change would wipe the just-issued
  // simulated OTP before the tenant had a chance to read and enter it.
  useEffect(() => {
    setOtpStep(false);
    setOtpValue('');
    setSimulatedOtp('');
  }, [latest?.id]);

  async function handleGenerate() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.generate(bookingId);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to generate agreement'); }
    finally { setBusy(false); }
  }

  async function handleSaveDraft() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.update(latest.id, draftForm);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to save draft'); }
    finally { setBusy(false); }
  }

  async function handleTenantConsent() {
    setBusy(true);
    setError('');
    try {
      const res = await agreementApi.tenantConsent(latest.id, legalName);
      setSimulatedOtp(res.data?.data?.simulatedOtp || '');
      setOtpStep(true);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to record consent'); }
    finally { setBusy(false); }
  }

  async function handleVerifyOtp() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.verifyOtp(latest.id, otpValue);
      setOtpStep(false);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Incorrect verification code'); }
    finally { setBusy(false); }
  }

  async function handleLandlordSign() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.landlordSign(latest.id, legalName);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to sign'); }
    finally { setBusy(false); }
  }

  async function handleRemind() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.remind(latest.id);
      setError('');
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to send reminder'); }
    finally { setBusy(false); }
  }

  async function handleUploadPhysical() {
    if (!physicalFile) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', physicalFile);
      await agreementApi.uploadPhysical(latest.id, fd);
      setPhysicalFile(null);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to upload'); }
    finally { setBusy(false); }
  }

  async function handleVerifyPhysical() {
    setBusy(true);
    setError('');
    try {
      await agreementApi.verifyPhysical(latest.id);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to verify'); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="agreement-panel-loading">Loading agreement…</p>;

  return (
    <div className="agreement-panel">
      {error && <div className="agreement-panel-error">{error}</div>}

      {!latest && (
        <div className="agreement-panel-empty">
          <p>No tenancy agreement has been generated yet.</p>
          {isLandlordOrAdmin && booking?.status === 'CONFIRMED' && (
            <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={busy}>Generate Agreement</button>
          )}
        </div>
      )}

      {latest && (
        <div className="agreement-panel-card">
          <div className="agreement-panel-header">
            <div>
              <strong>{latest.reference}</strong> · v{latest.version}
              <span className={`agreement-status-badge agreement-status-${latest.status.toLowerCase()}`}>
                {STATUS_LABEL[latest.status] || latest.status}
              </span>
            </div>
          </div>

          {/* ── DRAFT: editable terms (landlord/admin/agent) ── */}
          {latest.status === 'DRAFT' && draftForm && (
            <div className="agreement-panel-terms">
              {canEditDraft ? (
                <>
                  <div className="agreement-form-grid">
                    <label>Monthly Rent (RM)
                      <input type="number" value={draftForm.monthlyRent} onChange={(e) => setDraftForm((p) => ({ ...p, monthlyRent: e.target.value }))} />
                    </label>
                    <label>Security Deposit (RM)
                      <input type="number" value={draftForm.securityDeposit} onChange={(e) => setDraftForm((p) => ({ ...p, securityDeposit: e.target.value }))} />
                    </label>
                    <label>Utility Deposit (RM)
                      <input type="number" value={draftForm.utilityDeposit} onChange={(e) => setDraftForm((p) => ({ ...p, utilityDeposit: e.target.value }))} />
                    </label>
                    <label>Lease Start
                      <input type="date" value={draftForm.leaseStartDate} onChange={(e) => setDraftForm((p) => ({ ...p, leaseStartDate: e.target.value }))} />
                    </label>
                    <label>Lease End
                      <input type="date" value={draftForm.leaseEndDate} onChange={(e) => setDraftForm((p) => ({ ...p, leaseEndDate: e.target.value }))} />
                    </label>
                  </div>
                  <label className="agreement-terms-label">Terms / House Rules / Maintenance Responsibilities
                    <textarea rows={4} value={draftForm.terms} onChange={(e) => setDraftForm((p) => ({ ...p, terms: e.target.value }))} placeholder="Maintenance responsibilities, house rules, termination and renewal clauses…" />
                  </label>
                  <button className="btn btn-sm btn-outline" onClick={handleSaveDraft} disabled={busy}>Save Draft</button>
                </>
              ) : (
                <AgreementSummary a={latest} />
              )}

              {/* Electronic signing entry — tenant only, from DRAFT */}
              {isTenant && !otpStep && (
                <div className="agreement-sign-block">
                  <h4>Sign Electronically</h4>
                  <label>Type your legal name to consent
                    <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Full legal name" />
                  </label>
                  <button className="btn btn-sm btn-primary" onClick={handleTenantConsent} disabled={busy || !legalName.trim()}>
                    I Consent — Send Verification Code
                  </button>
                </div>
              )}
              {isTenant && otpStep && (
                <div className="agreement-sign-block">
                  <h4>Enter Verification Code</h4>
                  <p className="agreement-otp-hint">Demonstration mode — simulated code: <strong>{simulatedOtp}</strong></p>
                  <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)} placeholder="6-digit code" maxLength={6} />
                  <button className="btn btn-sm btn-primary" onClick={handleVerifyOtp} disabled={busy || otpValue.length !== 6}>Verify & Sign</button>
                </div>
              )}

              {/* Physical signing entry — either party, from DRAFT */}
              {(isTenant || isLandlordOrAdmin) && (
                <div className="agreement-sign-block">
                  <h4>Or Sign Physically</h4>
                  <p className="agreement-otp-hint">Download and print the terms above, sign on paper, then upload the signed copy.</p>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPhysicalFile(e.target.files?.[0] || null)} />
                  <button className="btn btn-sm btn-outline" onClick={handleUploadPhysical} disabled={busy || !physicalFile}>Upload Signed Copy</button>
                </div>
              )}
            </div>
          )}

          {/* ── AWAITING_TENANT_SIGNATURE: resume OTP step for tenant ── */}
          {latest.status === 'AWAITING_TENANT_SIGNATURE' && (
            <div className="agreement-panel-terms">
              <AgreementSummary a={latest} />
              {isTenant ? (
                <div className="agreement-sign-block">
                  <h4>Enter Verification Code</h4>
                  {simulatedOtp && <p className="agreement-otp-hint">Demonstration mode — simulated code: <strong>{simulatedOtp}</strong></p>}
                  <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)} placeholder="6-digit code" maxLength={6} />
                  <button className="btn btn-sm btn-primary" onClick={handleVerifyOtp} disabled={busy || otpValue.length !== 6}>Verify & Sign</button>
                </div>
              ) : (
                <p className="agreement-waiting-note">Waiting for the tenant to verify their signature.</p>
              )}
              {role === 'agent' && (
                <button className="btn btn-sm btn-outline" onClick={handleRemind} disabled={busy}>Remind Tenant to Sign</button>
              )}
            </div>
          )}

          {/* ── AWAITING_LANDLORD_SIGNATURE ── */}
          {latest.status === 'AWAITING_LANDLORD_SIGNATURE' && (
            <div className="agreement-panel-terms">
              <AgreementSummary a={latest} />
              {isLandlordOrAdmin ? (
                <div className="agreement-sign-block">
                  <h4>Sign as Landlord</h4>
                  <label>Type your legal name to sign
                    <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Full legal name" />
                  </label>
                  <button className="btn btn-sm btn-primary" onClick={handleLandlordSign} disabled={busy || !legalName.trim()}>Sign Agreement</button>
                </div>
              ) : (
                <p className="agreement-waiting-note">The tenant has signed. Waiting for the landlord's signature.</p>
              )}
              {role === 'agent' && (
                <button className="btn btn-sm btn-outline" onClick={handleRemind} disabled={busy}>Remind Landlord to Sign</button>
              )}
            </div>
          )}

          {/* ── PHYSICAL_COPY_PENDING ── */}
          {latest.status === 'PHYSICAL_COPY_PENDING' && (
            <div className="agreement-panel-terms">
              <AgreementSummary a={latest} />
              <a href={`http://localhost:3500${latest.physicalCopyUrl}`} target="_blank" rel="noopener noreferrer" className="agreement-doc-link">View Uploaded Copy</a>
              {isLandlordOrAdmin && (
                <button className="btn btn-sm btn-primary" onClick={handleVerifyPhysical} disabled={busy}>Verify Physical Copy</button>
              )}
            </div>
          )}

          {/* ── FULLY_SIGNED / PHYSICALLY_SIGNED ── */}
          {['FULLY_SIGNED', 'PHYSICALLY_SIGNED'].includes(latest.status) && (
            <div className="agreement-panel-terms">
              <AgreementSummary a={latest} />
              <div className="agreement-signed-info">
                <p><strong>Tenant signed:</strong> {formatDateTime(latest.tenantSignedAt)}</p>
                <p><strong>Landlord signed:</strong> {formatDateTime(latest.landlordSignedAt)}</p>
                {latest.physicalVerifiedAt && <p><strong>Physical copy verified:</strong> {formatDateTime(latest.physicalVerifiedAt)}</p>}
                {latest.documentHash && <p className="agreement-hash">Document hash: <code>{latest.documentHash.slice(0, 24)}…</code></p>}
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => window.print()}>Print Agreement</button>
            </div>
          )}
        </div>
      )}

      {agreements.length > 1 && (
        <details className="agreement-history">
          <summary>Version history ({agreements.length})</summary>
          <ul>
            {agreements.map((a) => (
              <li key={a.id}>{a.reference} · v{a.version} · {STATUS_LABEL[a.status] || a.status}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function AgreementSummary({ a }) {
  return (
    <div className="agreement-summary">
      <p><strong>Monthly Rent:</strong> {formatRM(a.monthlyRent)}</p>
      <p><strong>Security Deposit:</strong> {formatRM(a.securityDeposit)}</p>
      <p><strong>Utility Deposit:</strong> {formatRM(a.utilityDeposit)}</p>
      <p><strong>Lease Period:</strong> {formatDate(a.leaseStartDate)} → {formatDate(a.leaseEndDate)}</p>
      {a.terms && <p className="agreement-summary-terms">{a.terms}</p>}
    </div>
  );
}
