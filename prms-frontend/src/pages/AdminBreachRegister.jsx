import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, ShieldAlert } from 'lucide-react';
import { privacyApi } from '../api';
import Modal from '../components/Modal';
import './SharedPageShell.css';

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getNotificationBadge(i) {
  if (i.notificationStatus === 'COMMISSIONER_NOTIFIED') {
    return <span className="shell-status-badge status-confirmed">Commissioner Notified</span>;
  }
  if (i.notificationStatus === 'USERS_NOTIFIED') {
    return <span className="shell-status-badge status-confirmed">Users Notified</span>;
  }
  if (i.notificationStatus === 'NOT_REQUIRED') {
    return <span className="shell-status-badge">Not Required</span>;
  }
  // PENDING: compute 72-hour window
  const detected = new Date(i.detectedAt).getTime();
  const elapsedHours = Math.floor((Date.now() - detected) / 3600000);
  const leftHours = Math.max(0, 72 - elapsedHours);
  return (
    <span className="shell-status-badge status-pending" title="JPDP statutory 72-hour notification requirement">
      Pending ({leftHours}h window left)
    </span>
  );
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

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

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
        <h1 className="page-title">Data Breach Register & Incident Response</h1>
        <p>Internal incident-management record for PDPA breach-notification workflow under JPDP statutory guidelines.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
          <Plus size={14} style={{ marginRight: 6 }} /> Record Incident
        </button>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      {/* Statutory 72-Hour Breach Notification Protocol SOP */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e40af', fontWeight: 700, fontSize: 14 }}>
          <ShieldAlert size={18} />
          <span>Malaysia JPDP 72-Hour Statutory Data Breach Protocol</span>
        </div>
        <p style={{ fontSize: 13, color: '#1e3a8a', margin: '6px 0 10px', lineHeight: 1.5 }}>
          In compliance with Jabatan Perlindungan Data Peribadi (JPDP) directives, all reportable personal data incidents must follow the 4-phase mandatory response workflow:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #dbeafe' }}>
            <strong style={{ color: '#1e40af' }}>1. Immediate Containment</strong>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Isolate affected systems, revoke compromised tokens, and prevent unauthorized exposure.</p>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #dbeafe' }}>
            <strong style={{ color: '#1e40af' }}>2. Risk Assessment</strong>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Classify exposed personal data categories and estimate affected user volume.</p>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #dbeafe' }}>
            <strong style={{ color: '#b91c1c' }}>3. 72-Hour JPDP Notification</strong>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Submit formal incident report to the Commissioner within 72 hours of discovery.</p>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #dbeafe' }}>
            <strong style={{ color: '#1e40af' }}>4. Affected User Notice</strong>
            <p style={{ margin: '4px 0 0', color: '#475569' }}>Inform affected users directly if the breach presents severe risk of identity theft or financial loss.</p>
          </div>
        </div>
      </div>

      <div className="card-table">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Detected</th><th>Data Types</th><th>Affected Users</th><th>Notification Status</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td><AlertTriangle size={14} style={{ marginRight: 6, color: 'var(--status-error)' }} />{i.title}</td>
                  <td>{formatDateTime(i.detectedAt)}</td>
                  <td>{i.dataTypesAffected}</td>
                  <td>{i.affectedUserCount}</td>
                  <td>{getNotificationBadge(i)}</td>
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
