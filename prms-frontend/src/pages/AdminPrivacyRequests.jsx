import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { privacyApi } from '../api';
import './SharedPageShell.css';

const STATUS_TABS = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPrivacyRequests() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [tab, setTab] = useState('SUBMITTED');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState({});
  const [fulfillmentNotes, setFulfillmentNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await privacyApi.allRequests();
      setRequests(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const visible = requests.filter((r) => r.status === tab);

  async function run(fn) {
    setError('');
    setBusy(true);
    try { await fn(); setConfirmation(null); await load(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Action failed'); }
    finally { setBusy(false); }
  }

  const assign = (id) => run(() => privacyApi.assignRequest(id));
  const decide = (id, decision) => {
    if (!reasons[id]?.trim()) { setError('A decision reason is required'); return; }
    return run(() => privacyApi.decideRequest(id, decision, reasons[id]));
  };
  const complete = (id) => {
    if (!fulfillmentNotes[id]?.trim()) { setError('Describe the action performed and any data retained.'); return; }
    setConfirmation(requests.find(r => r.id === id));
  };


  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Privacy Requests</h1>
        <p>Review personal-data requests, record decisions and document the action taken.</p>
      </div>

      {error && <div role="alert" className="alert alert-danger mt-2">{error}</div>}

      <fieldset className="card-table" disabled={busy} style={{ minWidth: 0 }}>
        <div className="status-filter">
          {STATUS_TABS.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t.replace('_', ' ')}</button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!visible.length && <p style={{ color: 'var(--text-secondary)' }}>No requests in this stage.</p>}
            {visible.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <strong>{r.type}</strong> — {r.user?.full_name || r.user?.email}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Submitted {formatDateTime(r.submitted_at)}</div>
                  </div>
                  <span className={`shell-status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
                {['IN_REVIEW', 'APPROVED'].includes(r.status) && r.assignedAdminId !== user?.id && <p>Assigned to another Admin.</p>}
                {r.details && <p style={{ fontSize: 13, margin: '0 0 8px' }}><em>"{r.details}"</em></p>}
                {r.decisionReason && <p style={{ fontSize: 13, margin: '0 0 8px' }}><strong>Decision:</strong> {r.decisionReason}</p>}

                {r.status === 'SUBMITTED' && (
                  <button className="btn btn-sm btn-outline" onClick={() => assign(r.id)}>Assign to Me</button>
                )}
                {r.status === 'IN_REVIEW' && r.assignedAdminId === user?.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      placeholder="Reason for decision…"
                      value={reasons[r.id] || ''}
                      onChange={(e) => setReasons((p) => ({ ...p, [r.id]: e.target.value }))}
                      style={{ padding: '7px 10px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => decide(r.id, 'APPROVED')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => decide(r.id, 'REJECTED')}>Reject</button>
                    </div>
                  </div>
                )}
                {r.status === 'APPROVED' && r.assignedAdminId === user?.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <p>{r.type === 'DELETION' ? 'Account closure clears only basic profile information. Related records remain. Resolve active applications, tenancies and owned listings first.' : 'Fulfill this request manually first, then record what was provided or corrected. Approval alone does not fulfill it.'}</p>
                    <input
                      aria-label="Fulfillment action and retained data"
                      placeholder={r.type === 'DELETION' ? 'Fulfillment note (e.g. Profile anonymized and account deactivated)' : 'Fulfillment note (e.g. Inaccurate records updated)'}
                      value={fulfillmentNotes[r.id] || ''}
                      onChange={(e) => setFulfillmentNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                      style={{ padding: '7px 10px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13 }}
                    />
                    <div>
                      <button className="btn btn-sm btn-primary" onClick={() => complete(r.id)}>
                        {r.type === 'DELETION' ? 'Close Account & Record Completion' : 'Record Manual Completion'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <Modal isOpen={!!confirmation} onOpenChange={open => { if (!open && !busy) setConfirmation(null); }} title="Confirm request completion" footer={<button className="btn btn-primary" disabled={busy} onClick={() => run(() => privacyApi.completeRequest(confirmation.id, fulfillmentNotes[confirmation.id]))}>{busy ? 'Completing…' : 'Confirm Completion'}</button>}>
        <p>{confirmation?.type === 'DELETION' ? 'This anonymizes the basic profile, deactivates the account and revokes its refresh token. Related messages, agreements, files and other records remain. This is not complete data erasure.' : 'Confirm that you have actually fulfilled the request, such as securely providing the requested data or correcting the specified records. This button records completion; it does not perform those actions automatically.'}</p>
        <p><strong>Fulfillment note:</strong> {confirmation && fulfillmentNotes[confirmation.id]}</p>
        {error && <p role="alert">{error}</p>}
      </Modal>
    </div>
  );
}
