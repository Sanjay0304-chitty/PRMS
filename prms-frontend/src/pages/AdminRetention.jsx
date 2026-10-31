import { useState, useEffect, useCallback } from 'react';
import { Trash2, Play, AlertTriangle } from 'lucide-react';
import { privacyApi } from '../api';
import Modal from '../components/Modal';
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
  const [executing, setExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  async function handleExecuteCleanup() {
    setExecuting(true);
    setError('');
    try {
      const res = await privacyApi.executeCleanup();
      const count = res.data?.data?.totalDeleted ?? 0;
      setNotice(`Operational retention cleanup completed: ${count} expired record(s) permanently deleted / anonymized.`);
      setShowConfirmModal(false);
      await handleSimulate();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Retention cleanup execution failed');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Data Retention & Operational Cleanup</h1>
        <p>Configure and enforce statutory retention periods for personal data categories under Malaysia PDPA Retention Principle.</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}
      {notice && <div className="alert" style={{ background: 'var(--success-state-background)', color: 'var(--success-state)' }}>{notice}</div>}

      <div className="card-table">
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Active Retention Schedules</h2>
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead><tr><th>Category</th><th>Description</th><th>Retention (days)</th><th>Last updated</th><th>Actions</th></tr></thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong></td>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Retention Enforcement & Cleanup Actions</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Run dry-run simulation to review eligible records, or execute operational disposal under compliance authorization.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline" onClick={handleSimulate} disabled={simulating}>
              <Play size={14} style={{ marginRight: 6 }} />
              {simulating ? 'Simulating…' : 'Run Simulation'}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setShowConfirmModal(true)} disabled={executing}>
              <Trash2 size={14} style={{ marginRight: 6 }} />
              {executing ? 'Executing…' : 'Execute Retention Cleanup'}
            </button>
          </div>
        </div>

        {simResults && (
          <table className="table">
            <thead><tr><th>Category</th><th>Retention Threshold</th><th>Cutoff Date</th><th>Eligible Records for Disposal</th></tr></thead>
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

      {/* Confirmation Modal for Operational Retention Execution */}
      <Modal
        isOpen={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Operational Retention Cleanup"
        size="md"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowConfirmModal(false)} disabled={executing}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleExecuteCleanup} disabled={executing}>
              {executing ? 'Executing…' : 'Confirm Permanent Disposal'}
            </button>
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626' }}>
            <AlertTriangle size={24} />
            <strong style={{ fontSize: 15 }}>Permanent Personal Data Disposal</strong>
          </div>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
            This operational action will permanently delete or anonymize all personal data and historical records that have exceeded their statutory retention cutoff periods (cancelled applications, closed viewing appointments, superseded contract drafts, expired notifications, and resolved maintenance logs).
          </p>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: 10, fontSize: 12, color: '#991b1b' }}>
            An audit log event (<code>EXECUTE_RETENTION_CLEANUP</code>) will be recorded for compliance accountability.
          </div>
        </div>
      </Modal>
    </div>
  );
}
