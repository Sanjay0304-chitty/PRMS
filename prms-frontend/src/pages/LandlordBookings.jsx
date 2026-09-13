import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingApi } from '../api/booking';
import { useAuth } from '../contexts/AuthContext';
import AgreementPanel from '../components/AgreementPanel';
import { bookingStatusLabel } from '../config/bookingStatus';
import './SharedPageShell.css';
import './LandlordBookings.css';

// Real BookingStatus enum: PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED.
// Tab keys stay lowercase for display, mapped to the real enum value below.
const ALL_TABS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const TAB_LABELS = { pending: 'Applications', confirmed: 'Approved', checked_in: 'Active Tenancy', checked_out: 'Completed', cancelled: 'Closed' };

function formatAmount(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ? `RM ${amount}` : 'N/A';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(value);
}

function formatDate(date) {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STAGE_LABEL = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', NEEDS_INFORMATION: 'Needs Information',
  APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired',
};

export default function LandlordBookings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(searchParams.get('review'));
  const [error, setError] = useState('');

  // Per-row transient form state, keyed by booking id
  const [offerForms, setOfferForms] = useState({});
  const [declineReasons, setDeclineReasons] = useState({});
  const [infoNotes, setInfoNotes] = useState({});
  const [moveInForms, setMoveInForms] = useState({});
  const [moveOutForms, setMoveOutForms] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.landlordBookings();
      setBookings(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleBookings = bookings.filter((b) => (b.status || '').toUpperCase() === tab.toUpperCase());

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
    setError('');
  }

  async function runAction(fn, successMsg) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Action failed');
    }
  }

  const review = (id) => runAction(() => bookingApi.review(id));
  const requestInfo = (id) => runAction(() => bookingApi.requestInfo(id, infoNotes[id] || ''));
  const approve = (id) => {
    const form = offerForms[id] || {};
    if (!form.security_deposit || !form.utility_deposit || !form.offer_expiry) {
      setError('Security deposit, utility deposit and an offer expiry date are required to approve');
      return;
    }
    return runAction(() => bookingApi.approve(id, {
      monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : undefined,
      security_deposit: Number(form.security_deposit),
      utility_deposit: Number(form.utility_deposit),
      offer_expiry: form.offer_expiry,
    }));
  };
  const decline = (id) => {
    if (!declineReasons[id]?.trim()) { setError('A rejection reason is required'); return; }
    return runAction(() => bookingApi.decline(id, declineReasons[id]));
  };
  const moveIn = (id) => {
    const form = moveInForms[id] || {};
    return runAction(() => bookingApi.moveIn(id, { conditionReport: form.conditionReport, keyHandover: !!form.keyHandover }));
  };
  const moveOut = (id) => {
    const form = moveOutForms[id] || {};
    return runAction(() => bookingApi.moveOut(id, { conditionReport: form.conditionReport }));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Rental Applications</h1>
        <p>Review applications, manage offers, agreements, and active tenancies for your properties.</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      <div className="card-table">
        <div className="status-filter">
          {ALL_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <div className="lb-list">
            {!visibleBookings.length && <p className="lb-empty">No records in this stage.</p>}
            {visibleBookings.map((b) => {
              const id = b._id || b.id;
              const expanded = expandedId === id;
              return (
                <div className="lb-row" key={id}>
                  <div className="lb-row-summary" onClick={() => toggleExpand(id)}>
                    <div className="lb-row-main">
                      <strong>{b.user?.full_name ?? b.user?.email}</strong>
                      <span className="lb-row-property">{b.property?.title}</span>
                    </div>
                    <div className="lb-row-dates">{formatDate(b.start_date)} → {formatDate(b.end_date)}</div>
                    <div className="lb-row-stage">
                      <span className={`shell-status-badge status-${(b.status||'').toLowerCase()}`}>{bookingStatusLabel(b.status)}</span>
                      {b.application_stage && <span className="lb-stage-chip">{STAGE_LABEL[b.application_stage] || b.application_stage}</span>}
                      {b.noticeSubmittedAt && <span className="lb-stage-chip lb-notice-chip">Notice given</span>}
                    </div>
                    <div className="lb-row-amount">{formatAmount(b.totalAmount)}</div>
                  </div>

                  {expanded && (
                    <div className="lb-row-detail">
                      <div className="lb-detail-grid">
                        <div><span>Alternative move-in</span><strong>{formatDate(b.alternative_start_date)}</strong></div>
                        <div><span>Lease duration</span><strong>{b.lease_duration_months ? `${b.lease_duration_months} months` : '—'}</strong></div>
                        <div><span>Occupants</span><strong>{b.occupants ?? '—'}</strong></div>
                        <div><span>PDPA consent</span><strong>{b.pdpa_consent ? 'Yes' : 'No'}</strong></div>
                      </div>
                      {b.applicant_message && <p className="lb-message"><em>"{b.applicant_message}"</em></p>}
                      {b.reviewer_notes && <p className="lb-message"><strong>Notes:</strong> {b.reviewer_notes}</p>}
                      {b.rejection_reason && <p className="lb-message lb-rejection"><strong>Rejection reason:</strong> {b.rejection_reason}</p>}

                      {/* ── Review actions (PENDING) ── */}
                      {b.status === 'PENDING' && (
                        <div className="lb-actions-block">
                          {(!b.application_stage || b.application_stage === 'SUBMITTED') && (
                            <button className="btn btn-sm btn-outline" onClick={() => review(id)}>Mark Under Review</button>
                          )}
                          <div className="lb-inline-form">
                            <input
                              placeholder="Note for the applicant…"
                              value={infoNotes[id] || ''}
                              onChange={(e) => setInfoNotes((p) => ({ ...p, [id]: e.target.value }))}
                            />
                            <button className="btn btn-sm btn-outline" onClick={() => requestInfo(id)}>Request Information</button>
                          </div>

                          <div className="lb-offer-form">
                            <h4>Approve — Offer Terms</h4>
                            <div className="lb-offer-grid">
                              <label>Monthly Rent (RM)
                                <input type="number" placeholder={b.property?.rent} value={offerForms[id]?.monthlyRent || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [id]: { ...p[id], monthlyRent: e.target.value } }))} />
                              </label>
                              <label>Security Deposit (RM) *
                                <input type="number" value={offerForms[id]?.security_deposit || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [id]: { ...p[id], security_deposit: e.target.value } }))} />
                              </label>
                              <label>Utility Deposit (RM) *
                                <input type="number" value={offerForms[id]?.utility_deposit || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [id]: { ...p[id], utility_deposit: e.target.value } }))} />
                              </label>
                              <label>Offer Expiry *
                                <input type="date" value={offerForms[id]?.offer_expiry || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [id]: { ...p[id], offer_expiry: e.target.value } }))} />
                              </label>
                            </div>
                            <button className="btn btn-sm btn-primary" onClick={() => approve(id)}>Approve Application</button>
                          </div>

                          <div className="lb-inline-form">
                            <input
                              placeholder="Reason for rejection…"
                              value={declineReasons[id] || ''}
                              onChange={(e) => setDeclineReasons((p) => ({ ...p, [id]: e.target.value }))}
                            />
                            <button className="btn btn-sm btn-danger" onClick={() => decline(id)}>Reject</button>
                          </div>
                        </div>
                      )}

                      {/* ── Agreement + move-in (CONFIRMED) ── */}
                      {b.status === 'CONFIRMED' && (
                        <>
                          <AgreementPanel bookingId={id} booking={{ ...b, property: b.property }} role="landlord" userId={user?.id} />
                          <div className="lb-actions-block">
                            <h4>Move-In</h4>
                            <textarea
                              rows={2}
                              placeholder="Move-in condition report…"
                              value={moveInForms[id]?.conditionReport || ''}
                              onChange={(e) => setMoveInForms((p) => ({ ...p, [id]: { ...p[id], conditionReport: e.target.value } }))}
                            />
                            <label className="lb-checkbox">
                              <input type="checkbox" checked={!!moveInForms[id]?.keyHandover} onChange={(e) => setMoveInForms((p) => ({ ...p, [id]: { ...p[id], keyHandover: e.target.checked } }))} />
                              Keys handed over
                            </label>
                            <button className="btn btn-sm btn-primary" onClick={() => moveIn(id)}>Confirm Move-In</button>
                          </div>
                        </>
                      )}

                      {/* ── Active tenancy (CHECKED_IN) ── */}
                      {b.status === 'CHECKED_IN' && (
                        <>
                          <AgreementPanel bookingId={id} booking={{ ...b, property: b.property }} role="landlord" userId={user?.id} />
                          <div className="lb-actions-block">
                            <h4>Move-Out{b.noticeSubmittedAt ? ` — notice given ${formatDate(b.noticeSubmittedAt)}` : ' (no notice yet)'}</h4>
                            <textarea
                              rows={2}
                              placeholder="Move-out inspection / condition report…"
                              value={moveOutForms[id]?.conditionReport || ''}
                              onChange={(e) => setMoveOutForms((p) => ({ ...p, [id]: { ...p[id], conditionReport: e.target.value } }))}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => moveOut(id)}>Confirm Move-Out & Close Tenancy</button>
                          </div>
                        </>
                      )}

                      {/* ── Completed (CHECKED_OUT) ── */}
                      {b.status === 'CHECKED_OUT' && (
                        <div className="lb-detail-grid">
                          <div><span>Move-out inspected</span><strong>{formatDate(b.moveOutInspectionAt)}</strong></div>
                          {b.moveOutConditionReport && <div className="lb-message"><span>Condition report</span><strong>{b.moveOutConditionReport}</strong></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
