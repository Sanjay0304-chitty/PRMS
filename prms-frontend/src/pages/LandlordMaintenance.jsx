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
  const [error, setError] = useState('');

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
      await maintenanceApi.update(id, { status: approved ? 'CLOSED' : 'IN_PROGRESS' });
      setSelected(null); load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Maintenance review failed'); }
  };

  const reviewCost = async (id, approved) => {
    try {
      await maintenanceApi.approveCost(id, approved);
      setSelected(null);
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Cost review failed'); }
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
      {error && <div className="alert alert-danger">{error}</div>}

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
          {selected.inspectionNotes && <p><strong>Inspection notes:</strong> {selected.inspectionNotes}</p>}
          {selected.contractorName && <p><strong>Contractor:</strong> {selected.contractorName}</p>}
          {selected.appointmentAt && <p><strong>Appointment:</strong> {new Date(selected.appointmentAt).toLocaleString()}</p>}
          {selected.estimatedCost != null && <p><strong>Estimated cost:</strong> RM {Number(selected.estimatedCost).toFixed(2)}</p>}
          {selected.actualCost != null && <p><strong>Actual cost:</strong> RM {Number(selected.actualCost).toFixed(2)}</p>}
          {selected.resolutionNotes && <p><strong>Resolution:</strong> {selected.resolutionNotes}</p>}
          {selected.approvalRequired && (
            <div className="mt-2">
              <p><strong>Cost approval:</strong> {selected.approvalStatus || 'PENDING'}</p>
              {selected.approvalStatus === 'PENDING' && (
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => reviewCost(selected.id, true)}>Approve Repair Cost</button>
                  <button className="btn btn-danger" onClick={() => reviewCost(selected.id, false)}>Reject Repair Cost</button>
                </div>
              )}
            </div>
          )}
          {!!selected.attachments?.length && <div className="mt-2"><strong>Photographs:</strong> {selected.attachments.map((photo) => <a key={photo.id} href={`http://localhost:3500${photo.url}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>View</a>)}</div>}
          {!!selected.activities?.length && (
            <details className="mt-2"><summary>Activity history ({selected.activities.length})</summary><ul>{selected.activities.map((activity) => <li key={activity.id}>{new Date(activity.created_at).toLocaleString()} — {activity.action}{activity.details ? `: ${activity.details}` : ''}</li>)}</ul></details>
          )}
          {selected.status === 'RESOLVED' && (
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={() => verify(selected._id || selected.id, true)}>Confirm and Close</button>
              <button className="btn btn-danger" onClick={() => verify(selected._id || selected.id, false)}>Request Revision</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
