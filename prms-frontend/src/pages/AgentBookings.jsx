import { useState, useEffect, useCallback, Fragment } from 'react';
import { bookingApi } from '../api/booking';
import { useAuth } from '../contexts/AuthContext';
import AgreementPanel from '../components/AgreementPanel';
import { bookingStatusLabel } from '../config/bookingStatus';
import './SharedPageShell.css';

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
  const recommend = (id, decision) => run(() => bookingApi.review(id, `Recommend: ${decision}. ${notes[id] || ''}`.trim()));
  const requestInfo = (id) => run(() => bookingApi.requestInfo(id, notes[id] || 'Please provide more information.'));

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
                            <button className="btn btn-sm btn-primary" onClick={() => recommend(b.id, 'Approve')}>Recommend Approval</button>
                            <button className="btn btn-sm btn-danger" onClick={() => recommend(b.id, 'Reject')}>Recommend Rejection</button>
                          </div>
                        </div>
                      )}
                      {(b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && (
                        <button className="btn btn-sm btn-outline" onClick={() => setExpandedId((p) => (p === b.id ? null : b.id))}>
                          {expandedId === b.id ? 'Hide Agreement' : 'View Agreement'}
                        </button>
                      )}
                      {b.status === 'CHECKED_OUT' && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Tenancy closed</span>}
                    </td>
                  </tr>
                  {expandedId === b.id && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--surface-container-low, #f8fafc)' }}>
                        <AgreementPanel bookingId={b.id} booking={b} role="agent" userId={user?.id} />
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
