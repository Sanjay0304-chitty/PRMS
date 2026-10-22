import { useState, useEffect } from 'react';
import { useRecordList, ArchiveAction, ArchiveHint, RecordPagination } from '../components/RecordListControls';
import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';
import { agentApi } from '../api/agents';
import { getFullUrl } from '../config/apiBaseUrl';
import './SharedPageShell.css';

const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed', 'archived'];

export default function AgentMaintenance() {
  const [tab, setTab] = useState('open');
  const list = useRecordList('maintenance', tab);
  const { records: tickets, loading, load } = list;
  const [propertyNames, setPropertyNames] = useState({});
  const [selected, setSelected] = useState(null);
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


  const openTicket = (ticket) => {
    setSelected(ticket);
    setError('');
    setPhotos([]);
    setForm({
      priority: ticket.priority || 'MEDIUM',
      inspectionNotes: ticket.inspectionNotes || '',
    });
  };

  const save = async (status) => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const id = selected._id || selected.id;
      const payload = { ...form, status };
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
        <p>Review and update maintenance requests for your assigned properties.</p>
      </div>

      {error && !selected && <div className="alert alert-danger">{error}</div>}

      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); list.setPage(1); }}>
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {t === 'archived' && ` (${list.archivedCount})`}
            </button>
          ))}
        </div>

        <ArchiveHint archived={tab === 'archived'} />
        {list.error && <div className="alert alert-danger" role="alert">{list.error}</div>}
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Property</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{t.property?.title || propertyNames[t.propertyId] || t.propertyId || 'N/A'}</td>
                  <td>{t.user?.full_name ?? t.user?.email}</td>
                  <td><span className={`shell-status-badge status-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`shell-status-badge status-${(t.status||'').toLowerCase()}`}>{t.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => openTicket(t)}>Manage</button>
                    <ArchiveAction record={t} list={list} kind="maintenance" />
                  </td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <RecordPagination list={list} />
      {selected && (
        <Modal isOpen={!!selected} onOpenChange={() => setSelected(null)} title="Manage Maintenance Ticket">
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
          <p><strong>Property:</strong> {selected.property?.title || propertyNames[selected.propertyId] || selected.propertyId || 'N/A'}</p>
          <p><strong>Priority:</strong> {selected.priority} | <strong>Status:</strong> {selected.status}</p>
          {error && <div className="alert alert-danger">{error}</div>}

          <div style={{ display: 'grid', gap: 10 }}>
            <label>Priority
              <select className="input" value={form.priority || 'MEDIUM'} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>Maintenance note
              <textarea className="input" rows={3} value={form.inspectionNotes || ''} onChange={(e) => setForm((p) => ({ ...p, inspectionNotes: e.target.value }))} />
            </label>
            <label>Optional photographs
              <input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
            </label>
            {!!selected.attachments?.length && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.attachments.map((photo) => <a key={photo.id} href={getFullUrl(photo.url)} target="_blank" rel="noreferrer">View photo</a>)}
              </div>
            )}
          </div>

          <div className="footer flex gap-2 mt-4">
            {selected.status === 'OPEN' && <button className="btn btn-primary" disabled={saving} onClick={() => save('IN_PROGRESS')}>Start Progress</button>}
            {['OPEN', 'IN_PROGRESS'].includes(selected.status) && <button className="btn btn-success" disabled={saving} onClick={() => save('RESOLVED')}>Mark Resolved</button>}
            <button className="btn btn-outline" disabled={saving} onClick={() => save(selected.status)}>Save Details</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
