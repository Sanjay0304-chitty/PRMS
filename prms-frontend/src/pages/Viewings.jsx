import { useState, useEffect, useCallback } from 'react';
import { viewingApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './SharedPageShell.css';
import './Viewings.css';

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL = {
  REQUESTED: 'Requested', ACCEPTED: 'Accepted', PROPOSED_ALTERNATE: 'Alternate Proposed',
  CONFIRMED: 'Confirmed', COMPLETED: 'Completed', NO_SHOW: 'No-show', CANCELLED: 'Cancelled',
};

export default function Viewings() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposeFor, setProposeFor] = useState(null);
  const [proposeTime, setProposeTime] = useState('');
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const call = role === 'landlord' ? viewingApi.landlord : role === 'agent' ? viewingApi.assigned : role === 'admin' ? viewingApi.all : viewingApi.mine;
      const res = await call();
      setViewings(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load viewings');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Action failed'); }
  }

  const isManager = role === 'landlord' || role === 'agent' || role === 'admin';

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Viewing Appointments</h1>
        <p>{isManager ? 'Manage viewing requests for your properties.' : 'Track your requested property viewings.'}</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      <div className="card-table">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Property</th>
                {isManager && <th>Tenant</th>}
                <th>Preferred</th>
                <th>Alternative</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {viewings.map((v) => (
                <tr key={v.id}>
                  <td>{v.property?.title}</td>
                  {isManager && <td>{v.tenant?.full_name || v.tenant?.email}</td>}
                  <td>{formatDateTime(v.proposedTime && v.status === 'PROPOSED_ALTERNATE' ? v.proposedTime : v.preferredTime)}</td>
                  <td>{formatDateTime(v.alternativeTime)}</td>
                  <td><span className={`shell-status-badge status-${v.status.toLowerCase()}`}>{STATUS_LABEL[v.status] || v.status}</span></td>
                  <td className="viewings-actions">
                    {isManager && v.status === 'REQUESTED' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => run(() => viewingApi.accept(v.id))}>Accept</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setProposeFor(v.id)}>Propose Time</button>
                        <button className="btn btn-sm btn-danger" onClick={() => run(() => viewingApi.cancel(v.id))}>Cancel</button>
                      </>
                    )}
                    {isManager && v.status === 'CONFIRMED' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => run(() => viewingApi.markCompleted(v.id))}>Mark Completed</button>
                        <button className="btn btn-sm btn-outline" onClick={() => run(() => viewingApi.markNoShow(v.id))}>No-show</button>
                      </>
                    )}
                    {!isManager && ['ACCEPTED', 'PROPOSED_ALTERNATE'].includes(v.status) && (
                      <button className="btn btn-sm btn-primary" onClick={() => run(() => viewingApi.confirmAttendance(v.id))}>Confirm Attendance</button>
                    )}
                    {!isManager && ['REQUESTED', 'ACCEPTED', 'PROPOSED_ALTERNATE'].includes(v.status) && (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => setRescheduleFor(v.id)}>Reschedule</button>
                        <button className="btn btn-sm btn-danger" onClick={() => run(() => viewingApi.cancel(v.id))}>Cancel</button>
                      </>
                    )}

                    {proposeFor === v.id && (
                      <div className="viewings-inline-form">
                        <input type="datetime-local" value={proposeTime} onChange={(e) => setProposeTime(e.target.value)} />
                        <button className="btn btn-sm btn-primary" onClick={() => run(() => viewingApi.proposeAlternate(v.id, proposeTime)).then(() => setProposeFor(null))}>Send</button>
                      </div>
                    )}
                    {rescheduleFor === v.id && (
                      <div className="viewings-inline-form">
                        <input type="datetime-local" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
                        <button className="btn btn-sm btn-primary" onClick={() => run(() => viewingApi.reschedule(v.id, { preferredTime: rescheduleTime })).then(() => setRescheduleFor(null))}>Save</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!viewings.length && <tr><td colSpan={isManager ? 6 : 5}>No viewing appointments.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
