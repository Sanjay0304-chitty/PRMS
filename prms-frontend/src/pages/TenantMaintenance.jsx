import { useState, useEffect } from 'react';
import { useRecordList, ArchiveAction, ArchiveHint, RecordPagination } from '../components/RecordListControls';
import Modal from '../components/Modal';
import MaintenanceForm from '../components/MaintenanceForm';
import { propertyApi } from '../api/property';
import { getFullUrl } from '../config/apiBaseUrl';
import './SharedPageShell.css';

// Matches the real MaintenanceStatus enum (OPEN/IN_PROGRESS/RESOLVED/CLOSED)
// - the previous tabs (submitted/assigned) didn't correspond to any status
// the backend actually uses, so those filters silently returned nothing.
const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed', 'archived'];

export default function TenantMaintenance() {
  const [tab, setTab] = useState('all');
  const list = useRecordList('maintenance', tab);
  const { records: tickets, loading, error, load } = list;
  const [propertyNames, setPropertyNames] = useState({});
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    // Tickets only store a bare propertyId (no real relation) - resolve
    // names client-side the same way Agent/Landlord's maintenance pages do.
    propertyApi.list({ limit: 100 }).then((res) => {
      const data = res.data?.data;
      const items = Array.isArray(data) ? data : data?.properties || [];
      setPropertyNames(Object.fromEntries(items.map((p) => [p.id, p.title])));
    }).catch(() => {});
  }, []);


  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Maintenance</h1>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>+ New Request</button>
      </div>

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
        {error && <div className="alert alert-danger mt-2">{error} <button className="btn btn-sm" onClick={load}>Retry</button></div>}
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>{tab === 'archived' ? 'Archived' : 'Created'}</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{t.property?.title || propertyNames[t.propertyId] || t.propertyId || 'N/A'}</td>
                  <td><span className={`shell-status-badge status-${(t.priority || 'medium').toLowerCase()}`}>{t.priority || 'Medium'}</span></td>
                  <td><span className={`shell-status-badge status-${(t.status || '').toLowerCase()}`}>{t.status}</span></td>
                  <td>{new Date(tab === 'archived' ? t.archivedAt : t.createdAt || t.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => setSelected(t)}>View</button><ArchiveAction record={t} list={list} kind="maintenance" /></td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No maintenance tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <RecordPagination list={list} />
      {/* Detail Modal */}
      {selected && (
        <Modal isOpen={!!selected} onOpenChange={() => setSelected(null)} title="Ticket Detail">
          <p>{selected.description}</p>
          <p><strong>Property:</strong> {selected.property?.title || propertyNames[selected.propertyId] || selected.propertyId || 'N/A'}</p>
          <p><strong>Priority:</strong> {selected.priority} | <strong>Status:</strong> {selected.status}</p>
          {selected.inspectionNotes && <p><strong>Maintenance note:</strong> {selected.inspectionNotes}</p>}
          {!!selected.attachments?.length && <div><strong>Photographs:</strong> {selected.attachments.map((photo) => <a key={photo.id} href={getFullUrl(photo.url)} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>View</a>)}</div>}
          <div className="notes mt-2">
            <h4>Notes</h4>
            {selected.notes?.length ? (
              selected.notes.map((n, i) => (
                <div key={n.id || n._id || i} className="note-item">{n.note || n.message || 'No note content'}</div>
              ))
            ) : (
              <p>No notes available.</p>
            )}
          </div>
        </Modal>
      )}

      {/* Create Form */}
      {formOpen && <MaintenanceForm onSuccess={() => { setFormOpen(false); load(); }} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
