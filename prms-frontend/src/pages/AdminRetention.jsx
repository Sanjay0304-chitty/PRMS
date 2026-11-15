import { useState, useEffect, useCallback } from 'react';
import { Play } from 'lucide-react';
import { privacyApi } from '../api';
import './SharedPageShell.css';

const dateBasis = {
  rejected_cancelled_applications: 'Cancelled applications only; measured from last updated.',
  viewing_records: 'Completed, cancelled or no-show viewings; measured from last updated.',
  superseded_agreements: 'Superseded or cancelled agreements; measured from last updated.',
  notifications: 'Read and unread notifications; measured from creation.',
  resolved_maintenance_tickets: 'Resolved or closed tickets; measured from last updated.',
  audit_logs: 'Measured from creation.',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminRetention() {
  const [policies, setPolicies] = useState([]);
  const [edits, setEdits] = useState({});
  const [simResults, setSimResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await privacyApi.getRetentionPolicies();
      setPolicies(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to load retention policies'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  async function handleSave(category) {
    const days = Number(edits[category] ?? policies.find(p => p.category === category)?.retentionDays);
    if (!Number.isInteger(days) || days < 1 || days > 2147483647) { setError('Enter a positive whole number of days, up to 2,147,483,647.'); return; }
    setError('');
    setNotice('');
    try {
      await privacyApi.updateRetentionPolicy(category, days);
      setSimResults(null);
      setNotice(`Updated retention for "${category}" to ${days} days.`);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to save'); }
  }

  async function handleSimulate() {
    setSimulating(true);
    setError('');
    try {
      setSimResults(null);
      setNotice('');
      const res = await privacyApi.simulateCleanup();
      setSimResults(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to load preview'); }
    finally { setSimulating(false); }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Retention Settings & Preview</h1>
        <p>Configure how long records are kept and preview records older than the configured periods.</p>
      </div>

      {error && <div role="alert" className="alert alert-danger mt-2">{error}</div>}
      {notice && <div role="status" className="alert" style={{ background: 'var(--success-state-background)', color: 'var(--success-state)' }}>{notice}</div>}

      <p>Initial periods are system defaults requiring review, not verified legal requirements. Saving a period does not delete records or establish legal compliance.</p>
      <div className="card-table">
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Configured Retention Periods</h2>
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead><tr><th>Category</th><th>Description and date used</th><th>Retention (days)</th><th>Last updated</th><th>Actions</th></tr></thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.description}<br /><span>{dateBasis[p.category] || 'Date basis is not configured; review this category before use.'}</span></td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={2147483647}
                      step={1}
                      aria-label={`Retention days for ${p.label}`}
                      value={edits[p.category] ?? p.retentionDays}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [p.category]: e.target.value }))}
                      style={{ width: 80, padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                    />
                  </td>
                  <td>{formatDate(p.updated_at)}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => handleSave(p.category)}>Save</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card-table" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Eligible Records Preview</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Preview only—no records will be deleted. Permanent cleanup remains disabled pending disposal-policy review.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline" onClick={handleSimulate} disabled={simulating}>
              <Play size={14} style={{ marginRight: 6 }} />
              {simulating ? 'Loading preview…' : 'Preview Eligible Records'}
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>The preview uses saved settings. Records must have a qualifying status and a date earlier than the cutoff. Last updated means the most recent record update, which may differ from its completion date. Counts do not check tenancy dependencies, disputes or retention holds and are not disposal approval.</p>
        {simResults && (
          <table className="table">
            <thead><tr><th>Category</th><th>Retention Threshold</th><th>Cutoff Date</th><th>Records Older Than Cutoff</th></tr></thead>
            <tbody>
              {simResults.map((r) => (
                <tr key={r.category}>
                  <td>{r.label}</td>
                  <td>{r.retentionDays} days</td>
                  <td>{formatDate(r.cutoffDate)}</td>
                  <td>
                    <span className={`shell-status-badge ${r.eligibleCount > 0 ? 'status-pending' : 'status-confirmed'}`}>
                      {r.eligibleCount} records
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
