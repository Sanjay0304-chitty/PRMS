import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';
import { propertyApi } from '../api/property';
import './SharedPageShell.css';

const STATUS_TABS = ['all', 'in_progress', 'resolved', 'closed'];

export default function LandlordMaintenance() {
  const [tab, setTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [propertyNames, setPropertyNames] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    propertyApi.myProperties().then((res) => {
      const items = res.data?.data || [];
      setPropertyNames(Object.fromEntries(items.map((p) => [p.id, p.title])));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.list({ status: tab === 'all' ? undefined : tab.toUpperCase(), scope: 'my-properties' });
      setTickets(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id, approved) => {
    try {
      await maintenanceApi.updateStatus(id, approved ? 'CLOSED' : 'IN_PROGRESS');
      setSelected(null); load();
    } catch (e) { alert('Failed'); }
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
        <h1 className="page-title">Maintenance Overview</h1>
        <button className="btn btn-primary" onClick={exportReport}>Export Report</button>
      </div>

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
              <tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{propertyNames[t.propertyId] || t.propertyId || 'N/A'}</td>
                  <td><span className={`shell-status-badge status-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`shell-status-badge status-${(t.status||'').toLowerCase()}`}>{t.status}</span></td>
                  <td>{t.assignedTo?.full_name ?? t.assignedTo?.name ?? '—'}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => setSelected(t)}>Detail</button></td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No maintenance tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal isOpen={!!selected} onOpenChange={v => setSelected(v || null)} title="Resolution Review">
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
          <p><strong>Status:</strong> {selected.status}</p>
          <h4 className="mt-2">Agent Notes</h4>
          {(selected.notes || []).map((n, i) => <div key={i} className="note-item">{n.note || n.message}</div>)}
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary" onClick={() => verify(selected._id || selected.id, true)}>Approve</button>
            <button className="btn btn-danger" onClick={() => verify(selected._id || selected.id, false)}>Request Revision</button>
          </div>
        </Modal>
      )}
    </div>
  );
}