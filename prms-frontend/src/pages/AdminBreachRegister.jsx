import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { privacyApi } from '../api';
import Modal from '../components/Modal';
import './SharedPageShell.css';

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = {
  title: '', detectedAt: '', nature: '', cause: '', dataTypesAffected: '',
  affectedUserCount: '', containmentAction: '', riskAssessment: '', notificationStatus: 'PENDING',
};

export default function AdminBreachRegister() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [updateFields, setUpdateFields] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await privacyApi.getIncidents();
      setIncidents(res.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to load incidents'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await privacyApi.createIncident({
        ...form,
        affectedUserCount: form.affectedUserCount ? Number(form.affectedUserCount) : 0,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e2) { setError(e2.response?.data?.error?.message || 'Failed to record incident'); }
  }

  async function handleUpdate() {
    if (!selected) return;
    setError('');
    try {
      await privacyApi.updateIncident(selected.id, updateFields);
      setSelected(null);
      setUpdateFields({});
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to update incident'); }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Data Breach Register</h1>
        <p>Internal incident-management record for PDPA breach-notification workflow. Not visible to normal users.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
          <Plus size={14} style={{ marginRight: 6 }} /> Record Incident
        </button>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      <div className="card-table">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Detected</th><th>Data Types</th><th>Affected Users</th><th>Notification</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td><AlertTriangle size={14} style={{ marginRight: 6, color: 'var(--status-error)' }} />{i.title}</td>
                  <td>{formatDateTime(i.detectedAt)}</td>
                  <td>{i.dataTypesAffected}</td>
                  <td>{i.affectedUserCount}</td>
                  <td><span className="shell-status-badge status-pending">{i.notificationStatus}</span></td>
                  <td><span className={`shell-status-badge status-${i.status === 'RESOLVED' ? 'confirmed' : 'pending'}`}>{i.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => { setSelected(i); setUpdateFields({ status: i.status, notificationStatus: i.notificationStatus, resolution: i.resolution || '' }); }}>
                      Update
                    </button>
                  </td>
                </tr>
              ))}
              {!incidents.length && <tr><td colSpan={7}>No incidents recorded.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onOpenChange={setShowForm}
        title="Record Breach Incident"
        size="lg"
        footer={<button type="submit" form="breach-form" className="btn btn-primary">Save Incident</button>}
      >
        <form id="breach-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input required placeholder="Title *" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <input required type="datetime-local" placeholder="Detected at *" value={form.detectedAt} onChange={(e) => setForm((p) => ({ ...p, detectedAt: e.target.value }))} />
          <textarea required rows={2} placeholder="Nature of the incident *" value={form.nature} onChange={(e) => setForm((p) => ({ ...p, nature: e.target.value }))} />
          <input placeholder="Cause" value={form.cause} onChange={(e) => setForm((p) => ({ ...p, cause: e.target.value }))} />
          <input required placeholder="Types of personal data affected *" value={form.dataTypesAffected} onChange={(e) => setForm((p) => ({ ...p, dataTypesAffected: e.target.value }))} />
          <input type="number" min={0} placeholder="Number of affected users" value={form.affectedUserCount} onChange={(e) => setForm((p) => ({ ...p, affectedUserCount: e.target.value }))} />
          <textarea rows={2} placeholder="Containment action taken" value={form.containmentAction} onChange={(e) => setForm((p) => ({ ...p, containmentAction: e.target.value }))} />
          <textarea rows={2} placeholder="Risk assessment" value={form.riskAssessment} onChange={(e) => setForm((p) => ({ ...p, riskAssessment: e.target.value }))} />
        </form>
      </Modal>

      <Modal
        isOpen={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        title={`Update: ${selected?.title || ''}`}
        footer={<button type="button" className="btn btn-primary" onClick={handleUpdate}>Save</button>}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Status
              <select value={updateFields.status || ''} onChange={(e) => setUpdateFields((p) => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="OPEN">Open</option>
                <option value="CONTAINED">Contained</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Notification Status
              <select value={updateFields.notificationStatus || ''} onChange={(e) => setUpdateFields((p) => ({ ...p, notificationStatus: e.target.value }))} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="PENDING">Pending</option>
                <option value="COMMISSIONER_NOTIFIED">Commissioner Notified</option>
                <option value="USERS_NOTIFIED">Users Notified</option>
                <option value="NOT_REQUIRED">Not Required</option>
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Resolution / follow-up
              <textarea rows={3} value={updateFields.resolution || ''} onChange={(e) => setUpdateFields((p) => ({ ...p, resolution: e.target.value }))} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
