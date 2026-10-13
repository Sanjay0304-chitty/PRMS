import { useState, useEffect, useCallback, Fragment } from 'react';
import { bookingApi } from '../api/booking';
import { useAuth } from '../contexts/AuthContext';
import AgreementPanel from '../components/AgreementPanel';
import { bookingStatusLabel } from '../config/bookingStatus';
import './SharedPageShell.css';
import './LandlordBookings.css';

const ALL_TABS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const TAB_LABELS = { pending: 'Applications', confirmed: 'Approved', checked_in: 'Active', checked_out: 'Completed', cancelled: 'Closed' };
const STAGE_LABEL = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', NEEDS_INFORMATION: 'Needs Information',
  APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired',
};

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

// An Agent can check completeness and recommend a decision, but approving
// or rejecting an application outright is reserved for the property owner
// (or Admin) — see bookings/:id/approve and /decline on the backend.
export default function AgentBookings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [offerForms, setOfferForms] = useState({});
  const [declineReasons, setDeclineReasons] = useState({});
  const [moveInForms, setMoveInForms] = useState({});
  const [moveOutForms, setMoveOutForms] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.assigned();
      setBookings(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleBookings = bookings.filter((b) => (b.status || '').toUpperCase() === tab.toUpperCase());

  async function run(fn) {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Action failed'); }
  }

  const markReviewed = (id) => run(() => bookingApi.review(id, notes[id]));
  const recommend = (id, decision) => run(() => bookingApi.recommend(id, decision, notes[id] || ''));
  const requestInfo = (id) => run(() => bookingApi.requestInfo(id, notes[id] || 'Please provide more information.'));
  const approve = (id) => {
    const form = offerForms[id] || {};
    if (!form.security_deposit || !form.utility_deposit || !form.offer_expiry) {
      setError('Security deposit, utility deposit and an offer expiry date are required to approve');
      return;
    }
    return run(() => bookingApi.approve(id, {
      monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : undefined,
      security_deposit: Number(form.security_deposit),
      utility_deposit: Number(form.utility_deposit),
      offer_expiry: form.offer_expiry,
    }));
  };
  const decline = (id) => {
    if (!declineReasons[id]?.trim()) { setError('A rejection reason is required'); return; }
    return run(() => bookingApi.decline(id, declineReasons[id]));
  };
  const moveIn = (id) => {
    const form = moveInForms[id] || {};
    return run(() => bookingApi.moveIn(id, { conditionReport: form.conditionReport, keyHandover: !!form.keyHandover }));
  };
  const moveOut = (id) => {
    const form = moveOutForms[id] || {};
    return run(() => bookingApi.moveOut(id, { conditionReport: form.conditionReport }));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Applications</h1>
        <p>Check completeness and recommend a decision for properties assigned to you.</p>
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
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Move-in</th>
                <th>End</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map(b => (
                <Fragment key={b.id}>
                  <tr>
                    <td>{b.user?.full_name ?? b.user?.email}</td>
                    <td>{b.property?.title}</td>
                    <td>{formatDate(b.start_date)}</td>
                    <td>{formatDate(b.end_date)}</td>
                    <td>
                      <span className={`shell-status-badge status-${(b.status || '').toLowerCase()}`}>{bookingStatusLabel(b.status)}</span>
                      {b.application_stage && <span className="lb-stage-chip" style={{ marginLeft: 6 }}>{STAGE_LABEL[b.application_stage] || b.application_stage}</span>}
                    </td>
                    <td>{formatAmount(b.totalAmount)}</td>
                    <td>
                      {b.status === 'PENDING' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                          <input
                            placeholder="Internal note…"
                            value={notes[b.id] || ''}
                            onChange={(e) => setNotes((p) => ({ ...p, [b.id]: e.target.value }))}
                            style={{ padding: '5px 8px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12 }}
                          />
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => markReviewed(b.id)}>Mark Reviewed</button>
                            <button className="btn btn-sm btn-outline" onClick={() => requestInfo(b.id)}>Request Info</button>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => recommend(b.id, 'APPROVE')}>Recommend Approval</button>
                            <button className="btn btn-sm btn-danger" onClick={() => recommend(b.id, 'REJECT')}>Recommend Rejection</button>
                          </div>
                          <button className="btn btn-sm btn-primary" onClick={() => setExpandedId((p) => (p === b.id ? null : b.id))}>
                            {expandedId === b.id ? 'Hide Decision Form' : 'Manage Application'}
                          </button>
                        </div>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button className="btn btn-sm btn-outline" onClick={() => setExpandedId((p) => (p === b.id ? null : b.id))}>
                          {expandedId === b.id ? 'Hide Agreement' : 'View Agreement'}
                        </button>
                      )}
                      {b.status === 'CHECKED_OUT' && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Tenancy closed</span>}
                      {b.status === 'CHECKED_IN' && (
                        <button className="btn btn-sm btn-outline" onClick={() => setExpandedId((p) => (p === b.id ? null : b.id))}>
                          {expandedId === b.id ? 'Hide Tenancy' : 'Manage Tenancy'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === b.id && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--surface-container-low, #f8fafc)' }}>
                        {b.status === 'PENDING' && (
                          <div className="lb-actions-block">
                            <h4>Final Application Decision</h4>
                            <div className="lb-offer-form">
                              <div className="lb-offer-grid">
                                <label>Monthly Rent (RM)
                                  <input type="number" placeholder={b.property?.rent} value={offerForms[b.id]?.monthlyRent || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [b.id]: { ...p[b.id], monthlyRent: e.target.value } }))} />
                                </label>
                                <label>Security Deposit (RM) *
                                  <input type="number" value={offerForms[b.id]?.security_deposit || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [b.id]: { ...p[b.id], security_deposit: e.target.value } }))} />
                                </label>
                                <label>Utility Deposit (RM) *
                                  <input type="number" value={offerForms[b.id]?.utility_deposit || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [b.id]: { ...p[b.id], utility_deposit: e.target.value } }))} />
                                </label>
                                <label>Offer Expiry *
                                  <input type="date" value={offerForms[b.id]?.offer_expiry || ''} onChange={(e) => setOfferForms((p) => ({ ...p, [b.id]: { ...p[b.id], offer_expiry: e.target.value } }))} />
                                </label>
                              </div>
                              <button className="btn btn-sm btn-primary" onClick={() => approve(b.id)}>Approve Application</button>
                            </div>
                            <div className="lb-inline-form">
                              <input placeholder="Reason for rejection…" value={declineReasons[b.id] || ''} onChange={(e) => setDeclineReasons((p) => ({ ...p, [b.id]: e.target.value }))} />
                              <button className="btn btn-sm btn-danger" onClick={() => decline(b.id)}>Reject Application</button>
                            </div>
                          </div>
                        )}
                        {(b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && (
                          <AgreementPanel bookingId={b.id} booking={b} role="agent" userId={user?.id} />
                        )}
                        {b.status === 'CONFIRMED' && (
                          <div className="lb-actions-block">
                            <h4>Move-In</h4>
                            <textarea rows={2} placeholder="Move-in condition report…" value={moveInForms[b.id]?.conditionReport || ''} onChange={(e) => setMoveInForms((p) => ({ ...p, [b.id]: { ...p[b.id], conditionReport: e.target.value } }))} />
                            <label className="lb-checkbox">
                              <input type="checkbox" checked={!!moveInForms[b.id]?.keyHandover} onChange={(e) => setMoveInForms((p) => ({ ...p, [b.id]: { ...p[b.id], keyHandover: e.target.checked } }))} />
                              Keys handed over
                            </label>
                            <button className="btn btn-sm btn-primary" onClick={() => moveIn(b.id)}>Confirm Move-In</button>
                          </div>
                        )}
                        {b.status === 'CHECKED_IN' && (
                          <div className="lb-actions-block">
                            <h4>Move-Out</h4>
                            <textarea rows={2} placeholder="Move-out inspection / condition report…" value={moveOutForms[b.id]?.conditionReport || ''} onChange={(e) => setMoveOutForms((p) => ({ ...p, [b.id]: { ...p[b.id], conditionReport: e.target.value } }))} />
                            <button className="btn btn-sm btn-primary" onClick={() => moveOut(b.id)}>Confirm Move-Out & Close Tenancy</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!visibleBookings.length && <tr><td colSpan={7}>No applications found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
