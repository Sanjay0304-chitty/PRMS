import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';
import { agentApi } from '../api/agents';
import './SharedPageShell.css';

const STATUS_TABS = ['open', 'in_progress', 'resolved', 'closed'];

export default function AgentMaintenance() {
  const [tab, setTab] = useState('open');
  const [tickets, setTickets] = useState([]);
  const [propertyNames, setPropertyNames] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    agentApi.myProperties({ limit: 100 }).then((res) => {
      const items = res.data?.data || [];
      setPropertyNames(Object.fromEntries(items.map((p) => [p.id, p.title])));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.assigned({ status: tab.toUpperCase() });
      setTickets(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const openTicket = (ticket) => {
    setSelected(ticket);
    setError('');
    setPhotos([]);
    setForm({
      priority: ticket.priority || 'MEDIUM',
      inspectionNotes: ticket.inspectionNotes || '',
      contractorName: ticket.contractorName || '',
      appointmentAt: ticket.appointmentAt ? new Date(ticket.appointmentAt).toISOString().slice(0, 16) : '',
      estimatedCost: ticket.estimatedCost ?? '',
      actualCost: ticket.actualCost ?? '',
      resolutionNotes: ticket.resolutionNotes || '',
    });
  };

  const save = async (status) => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const id = selected._id || selected.id;
      const payload = {
        ...form,
        status,
        estimatedCost: form.estimatedCost === '' ? undefined : Number(form.estimatedCost),
        actualCost: form.actualCost === '' ? undefined : Number(form.actualCost),
      };
      await maintenanceApi.update(id, payload);
      if (photos.length) await maintenanceApi.addPhotos(id, photos);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Maintenance update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Maintenance Queue</h1>
        <p>Coordinate inspections, contractors, appointments, costs, photographs, and repair progress for assigned properties.</p>
      </div>

      {error && !selected && <div className="alert alert-danger">{error}</div>}

      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Property</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{propertyNames[t.propertyId] || t.propertyId || 'N/A'}</td>
                  <td>{t.user?.full_name ?? t.user?.email}</td>
                  <td><span className={`shell-status-badge status-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`shell-status-badge status-${(t.status||'').toLowerCase()}`}>{t.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => openTicket(t)}>Manage</button>
                  </td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal isOpen={!!selected} onOpenChange={() => setSelected(null)} title="Manage Maintenance Ticket">
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
          <p><strong>Property:</strong> {propertyNames[selected.propertyId] || selected.propertyId || 'N/A'}</p>
          <p><strong>Priority:</strong> {selected.priority} | <strong>Status:</strong> {selected.status}</p>
          {selected.approvalRequired && <p><strong>Cost approval:</strong> {selected.approvalStatus || 'PENDING'} (Landlord action required)</p>}
          {error && <div className="alert alert-danger">{error}</div>}

          <div style={{ display: 'grid', gap: 10 }}>
            <label>Priority
              <select className="input" value={form.priority || 'MEDIUM'} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>Inspection notes
              <textarea className="input" rows={3} value={form.inspectionNotes || ''} onChange={(e) => setForm((p) => ({ ...p, inspectionNotes: e.target.value }))} />
            </label>
            <label>Contractor / service provider
              <input className="input" value={form.contractorName || ''} onChange={(e) => setForm((p) => ({ ...p, contractorName: e.target.value }))} />
            </label>
            <label>Appointment
              <input className="input" type="datetime-local" value={form.appointmentAt || ''} onChange={(e) => setForm((p) => ({ ...p, appointmentAt: e.target.value }))} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>Estimated cost (RM)
                <input className="input" type="number" min="0" value={form.estimatedCost ?? ''} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))} />
              </label>
              <label>Actual cost (RM)
                <input className="input" type="number" min="0" value={form.actualCost ?? ''} onChange={(e) => setForm((p) => ({ ...p, actualCost: e.target.value }))} />
              </label>
            </div>
            <label>Resolution notes
              <textarea className="input" rows={2} value={form.resolutionNotes || ''} onChange={(e) => setForm((p) => ({ ...p, resolutionNotes: e.target.value }))} />
            </label>
            <label>Supporting photographs
              <input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
            </label>
            {!!selected.attachments?.length && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.attachments.map((photo) => <a key={photo.id} href={`http://localhost:3500${photo.url}`} target="_blank" rel="noreferrer">View photo</a>)}
              </div>
            )}
            {!!selected.activities?.length && (
              <details>
                <summary>Activity history ({selected.activities.length})</summary>
                <ul>{selected.activities.map((activity) => <li key={activity.id}>{new Date(activity.created_at).toLocaleString()} — {activity.action}{activity.details ? `: ${activity.details}` : ''}</li>)}</ul>
              </details>
            )}
          </div>

          <div className="footer flex gap-2 mt-4">
            {selected.status === 'OPEN' && <button className="btn btn-primary" disabled={saving} onClick={() => save('IN_PROGRESS')}>Start Progress</button>}
            {selected.status === 'IN_PROGRESS' && <button className="btn btn-success" disabled={saving} onClick={() => save('RESOLVED')}>Mark Ready for Confirmation</button>}
            <button className="btn btn-outline" disabled={saving} onClick={() => save(selected.status)}>Save Details</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
