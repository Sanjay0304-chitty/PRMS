import { useState, useEffect, useCallback } from 'react';
import { privacyApi } from '../api';
import './SharedPageShell.css';

const STATUS_TABS = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPrivacyRequests() {
  const [tab, setTab] = useState('SUBMITTED');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await privacyApi.allRequests();
      setRequests(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = requests.filter((r) => r.status === tab);

  async function run(fn) {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Action failed'); }
  }

  const assign = (id) => run(() => privacyApi.assignRequest(id));
  const decide = (id, decision) => {
    if (!reasons[id]?.trim()) { setError('A decision reason is required'); return; }
    return run(() => privacyApi.decideRequest(id, decision, reasons[id]));
  };
  const complete = (id) => run(() => privacyApi.completeRequest(id));

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Privacy Requests</h1>
        <p>Manage access, correction and deletion requests from users (PDPA Access principle).</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      <div className="card-table">
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
                {r.details && <p style={{ fontSize: 13, margin: '0 0 8px' }}><em>"{r.details}"</em></p>}
                {r.decisionReason && <p style={{ fontSize: 13, margin: '0 0 8px' }}><strong>Decision:</strong> {r.decisionReason}</p>}

                {r.status === 'SUBMITTED' && (
                  <button className="btn btn-sm btn-outline" onClick={() => assign(r.id)}>Assign to Me</button>
                )}
                {r.status === 'IN_REVIEW' && (
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
                {r.status === 'APPROVED' && (
                  <button className="btn btn-sm btn-primary" onClick={() => complete(r.id)}>Mark Completed</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
