import { useState, useEffect } from 'react';
import { useRecordList, ArchiveAction, ArchiveHint, RecordPagination } from '../components/RecordListControls';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';
import { propertyApi } from '../api/property';
import { getFullUrl } from '../config/apiBaseUrl';
import './SharedPageShell.css';

const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed', 'archived'];

export default function LandlordMaintenance({ embedded = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [tab, setTab] = useState('all');
  const list = useRecordList('maintenance', tab);
  const { records: tickets, loading, load } = list;
  const [propertyNames, setPropertyNames] = useState({});
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (isAdmin ? propertyApi.list({ limit: 100 }) : propertyApi.myProperties()).then((res) => {
      const items = res.data?.data || [];
      setPropertyNames(Object.fromEntries(items.map((p) => [p.id, p.title])));
    }).catch(() => {});
  }, [isAdmin]);


  const saveTicket = async (status) => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await maintenanceApi.update(selected.id, {
        inspectionNotes: note,
        ...(status ? { status } : {}),
      });
      setSelected(null);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to update maintenance ticket'); }
    finally { setSaving(false); }
  };

  const exportReport = () => {
    const csv = [
      'ID,Title,Property,Tenant,Priority,Status,Created',
      ...tickets.map(t =>
        `"${t._id || t.id || ''}","${t.title || ''}","${propertyNames[t.propertyId] || ''}","${t.user?.full_name || ''}","${t.priority || ''}","${t.status || ''}","${t.created_at || ''}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'maintenance-report.csv'; a.click();
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        {!embedded && <h1 className="page-title">{isAdmin ? 'Maintenance Center' : 'Maintenance Overview'}</h1>}
        <button className="btn btn-primary" onClick={exportReport}>Export Current Page</button>
      </div>
      {error && !selected && <div className="alert alert-danger" role="alert">{error}</div>}

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
              <tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{t.property?.title || propertyNames[t.propertyId] || t.propertyId || 'N/A'}</td>
                  <td><span className={`shell-status-badge status-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`shell-status-badge status-${(t.status||'').toLowerCase()}`}>{t.status}</span></td>
                  <td>{t.assignedTo?.full_name ?? t.assignedTo?.name ?? '—'}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => { setError(''); setSelected(t); setNote(t.inspectionNotes || ''); }}>Detail</button><ArchiveAction record={t} list={list} kind="maintenance" /></td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No maintenance tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <RecordPagination list={list} />
      {selected && (
        <Modal isOpen={!!selected} onOpenChange={() => { if (!saving) setSelected(null); }} title="Manage Maintenance Ticket">
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
          <p><strong>Status:</strong> {selected.status}</p>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <label className="mt-2">Maintenance note
            <textarea className="input" rows={3} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
          </label>
          {!!selected.attachments?.length && <div className="mt-2"><strong>Photographs:</strong> {selected.attachments.map((photo) => <a key={photo.id} href={getFullUrl(photo.url)} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>View</a>)}</div>}
          <button className="btn btn-outline mt-2" disabled={saving} onClick={() => saveTicket()}>{saving ? 'Saving…' : 'Save Note'}</button>
          {['OPEN', 'IN_PROGRESS'].includes(selected.status) && (
            <div className="flex gap-2 flex-wrap mt-4">
              {selected.status === 'OPEN' && <button className="btn btn-primary" disabled={saving} onClick={() => saveTicket('IN_PROGRESS')}>Start Progress</button>}
              <button className="btn btn-success" disabled={saving} onClick={() => saveTicket('RESOLVED')}>Mark Resolved</button>
            </div>
          )}
          {selected.status === 'RESOLVED' && (
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary" disabled={saving} onClick={() => saveTicket('CLOSED')}>Confirm and Close</button>
              <button className="btn btn-danger" disabled={saving} onClick={() => saveTicket('IN_PROGRESS')}>Request Revision</button>
            </div>
          )}
          {selected.status === 'CLOSED' && <button className="btn btn-outline mt-4" disabled={saving} onClick={() => saveTicket('IN_PROGRESS')}>Reopen Ticket</button>}
        </Modal>
      )}
    </div>
  );
}
