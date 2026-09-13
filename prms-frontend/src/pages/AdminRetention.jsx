import { useState, useEffect, useCallback } from 'react';
import { privacyApi } from '../api';
import './SharedPageShell.css';

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

  useEffect(() => { load(); }, [load]);

  async function handleSave(category) {
    const days = Number(edits[category]);
    if (!days || days < 1) { setError('Enter a valid number of days'); return; }
    setError('');
    setNotice('');
    try {
      await privacyApi.updateRetentionPolicy(category, days);
      setNotice(`Updated retention for "${category}" to ${days} days.`);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to save'); }
  }

  async function handleSimulate() {
    setSimulating(true);
    setError('');
    try {
      const res = await privacyApi.simulateCleanup();
      setSimResults(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Simulation failed'); }
    finally { setSimulating(false); }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Data Retention</h1>
        <p>Configure how long each category of personal data is kept (PDPA Retention principle).</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}
      {notice && <div className="alert" style={{ background: 'var(--success-state-background)', color: 'var(--success-state)' }}>{notice}</div>}

      <div className="card-table">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead><tr><th>Category</th><th>Description</th><th>Retention (days)</th><th>Last updated</th><th>Actions</th></tr></thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.description}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      defaultValue={p.retentionDays}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, margin: 0 }}>Cleanup Simulation</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Dry run only — shows what would be eligible for deletion under the current policies. Nothing is deleted.
            </p>
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleSimulate} disabled={simulating}>
            {simulating ? 'Running…' : 'Run Simulation'}
          </button>
        </div>

        {simResults && (
          <table className="table">
            <thead><tr><th>Category</th><th>Retention</th><th>Cutoff date</th><th>Eligible records</th></tr></thead>
            <tbody>
              {simResults.map((r) => (
                <tr key={r.category}>
                  <td>{r.label}</td>
                  <td>{r.retentionDays} days</td>
                  <td>{formatDate(r.cutoffDate)}</td>
                  <td>
                    <span className={`shell-status-badge ${r.eligibleCount > 0 ? 'status-pending' : 'status-confirmed'}`}>
                      {r.eligibleCount}
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
