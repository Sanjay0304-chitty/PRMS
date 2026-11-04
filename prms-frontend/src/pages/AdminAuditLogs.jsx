import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/ApiClient';
import Modal from '../components/Modal';
import './AdminSimplePage.css';
import './AdminBookings.css';
import './AdminAuditLogs.css';

const LEVELS = ['info', 'warning', 'error', 'critical'];
const statusLabel = value => (value || 'PENDING').replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
const levelLabel = value => ['warn', 'warning'].includes(value?.toLowerCase()) ? 'Warning' : value || 'Info';
function reportFields(log) {
  try { const fields = JSON.parse(log.newValue); if (fields && typeof fields === 'object') return fields; } catch { /* Legacy reports keep their original text. */ }
  return { propertyTitle: log.description?.match(/^Listing "(.*?)" reported by /)?.[1] || log.entityId || 'Property', reason: log.description?.match(/Reason: ([\s\S]*)/)?.[1] || log.description || 'See details' };
}
export default function AdminAuditLogs() {
  const [params, setParams] = useSearchParams();
  const reports = params.get('view') === 'reports';
  const reportId = params.get('report');
  const [level, setLevel] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [reviewStatus, setReviewStatus] = useState('UNDER_REVIEW');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError('');
    try {
      const res = await apiClient.get('/admin/audit-logs', { params: { page, limit: 25, sortDir, level: level === 'all' ? undefined : level, search: search || undefined, action: reports ? 'REPORT_PROPERTY_LISTING' : undefined, status: reports ? 'Success' : undefined } });
      if (request !== sequence.current) return;
      setLogs(res.data?.data || []); setTotal(res.data?.pagination?.total || 0);
    } catch (e) { if (request === sequence.current) setError(e.response?.data?.error?.message || 'Failed to load audit logs'); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [page, sortDir, level, search, reports]);
  useEffect(() => { const timer = setTimeout(load, 200); return () => { clearTimeout(timer); sequence.current++; }; }, [load]);
  useEffect(() => {
    let active = true;
    if (!reportId) return;
    apiClient.get(`/admin/audit-logs/${encodeURIComponent(reportId)}/report`).then(res => {
      if (active) { setDetail(res.data.data); setReviewStatus(res.data.data.history[0]?.status === 'UNDER_REVIEW' ? 'RESOLVED' : 'UNDER_REVIEW'); setNote(''); }
    }).catch(e => { if (active) setDetailError(e.response?.data?.error?.message || 'Unable to load report'); });
    return () => { active = false; };
  }, [reportId]);
  const openReport = id => { setDetail(null); setDetailError(''); setParams({ view: 'reports', report: id }); setPage(1); };
  const closeReport = () => { if (!saving) { setParams({ view: 'reports' }); setDetail(null); setDetailError(''); } };
  async function saveReview() {
    if (!note.trim()) { setDetailError('Enter a review or resolution note.'); return; }
    setSaving(true); setDetailError('');
    try {
      await apiClient.post(`/admin/audit-logs/${encodeURIComponent(reportId)}/report-review`, { status: reviewStatus, note: note.trim(), previousReviewId: detail.history[0]?.id || null });
      const res = await apiClient.get(`/admin/audit-logs/${encodeURIComponent(reportId)}/report`);
      setDetail(res.data.data); setReviewStatus(res.data.data.history[0]?.status === 'UNDER_REVIEW' ? 'RESOLVED' : 'UNDER_REVIEW'); setNote(''); await load();
    } catch (e) { setDetailError(e.response?.data?.error?.message || 'Review could not be saved'); }
    finally { setSaving(false); }
  }
  const currentStatus = detail?.history[0]?.status || 'PENDING';
  const closed = ['RESOLVED', 'DISMISSED'].includes(currentStatus);
  const fields = detail ? reportFields(detail.report) : {};
  return <>
    <section className="admin-simple-hero"><div><h1>Audit Logs</h1><p>Review system activity and handle listing reports while preserving their history.</p></div></section>
    <div className="admin-bookings-tabs" aria-label="Audit log view">
      <button className={!reports ? 'active' : ''} onClick={() => { setParams({}); setPage(1); }}>All Activity</button>
      <button className={reports ? 'active' : ''} onClick={() => { setParams({ view: 'reports' }); setPage(1); }}>Listing Reports</button>
    </div>
    <div className="admin-bookings-tabs" aria-label="Severity filter">
      {['all', ...LEVELS].map(value => <button key={value} className={level === value ? 'active' : ''} onClick={() => { setLevel(value); setPage(1); }}>{value[0].toUpperCase() + value.slice(1)}</button>)}
    </div>
    {error && <div className="admin-error-banner" role="alert">{error}<button onClick={load}>Retry</button></div>}
    <section className="admin-simple-table-card audit-log-card">
      <div className="admin-simple-table-header"><h2>{reports ? 'Listing Reports' : 'Audit Logs'}</h2><div className="audit-tools">
        <select aria-label="Sort logs" className="admin-simple-search" value={sortDir} onChange={e => { setSortDir(e.target.value); setPage(1); }}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select>
        <div className="admin-simple-search"><Search size={17} aria-hidden="true" /><input aria-label="Search logs" placeholder="Search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
      </div></div>
      {loading ? <p className="audit-message" role="status">Loading...</p> : <div className="audit-table-scroll"><table className={`audit-organized-table ${reports ? 'audit-table-reports' : 'audit-table-activity'}`}><thead><tr>{(reports ? ['Date', 'Property', 'Reporter', 'Reason', 'Level', 'Review status', 'Actions'] : ['Date', 'User', 'Action', 'Level', 'Details']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
        {!logs.length && <tr><td colSpan={reports ? 7 : 5}>No {reports ? 'listing reports' : 'audit logs'} found.</td></tr>}
        {logs.map(log => { const report = reportFields(log); return <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td>
          {reports ? <><td>{report.propertyTitle}</td><td>{report.reporter || log.user?.full_name || log.username || 'Anonymous Guest'}</td><td>{report.reason}</td><td>{levelLabel(log.level)}</td><td>{statusLabel(log.reportReview?.status)}</td><td><button className="btn btn-sm btn-outline" onClick={() => openReport(log.id)}>View Details</button></td></> : <><td>{log.user?.full_name || log.username || 'Anonymous / System'}</td><td>{log.action}</td><td>{levelLabel(log.level)}</td><td>{log.description || '—'}{log.action === 'REPORT_PROPERTY_LISTING' && log.status === 'Success' && <button className="btn btn-sm btn-outline" onClick={() => openReport(log.id)}>Review Report</button>}</td></>}
        </tr>; })}
      </tbody></table></div>}
      <div className="audit-pagination"><button className="btn btn-outline" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / 25))} · {total} records</span><button className="btn btn-outline" disabled={loading || page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button></div>
    </section>
    <Modal isOpen={!!reportId} onOpenChange={open => { if (!open) closeReport(); }} title="Listing Report Details" size="lg">
      {detailError && <p role="alert">{detailError}</p>}
      {!detail ? <p>{detailError ? 'Close this dialog and try again.' : 'Loading report...'}</p> : <div className="audit-report-detail">
        <p><strong>Property:</strong> {fields.propertyTitle} {detail.property && <Link to={`/admin/properties/${encodeURIComponent(detail.property.id)}`}>Open Property</Link>}</p>
        <p><strong>Reporter:</strong> {fields.reporter || detail.report.username || detail.report.user?.full_name || 'Anonymous Guest'}</p>
        <p><strong>Reason:</strong> {fields.reason}</p><p><strong>Additional details:</strong> {fields.details || 'See original report below.'}</p>
        <details><summary>Original report (unchanged)</summary><p>{detail.report.description}</p></details>
        <p><strong>Review status:</strong> {statusLabel(currentStatus)}</p>
        {!closed && <fieldset disabled={saving}><legend>Record review decision</legend><label>Status<select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>{(currentStatus === 'PENDING' ? ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] : ['RESOLVED', 'DISMISSED']).map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
          <label>Review / resolution note<textarea rows={3} maxLength={4000} value={note} onChange={e => setNote(e.target.value)} /></label>
          <p>Recording a decision does not edit or deactivate the listing. Inspect the property and take any necessary action separately.</p>
          <button className="btn btn-primary" disabled={saving || !note.trim()} onClick={saveReview}>{saving ? 'Saving...' : 'Save Review'}</button>
        </fieldset>}
        <h3>Review history</h3>{!detail.history.length && <p>No review decisions yet.</p>}{detail.history.map(event => <div key={event.id}><strong>{statusLabel(event.status)}</strong> · {event.username || 'Admin'} · {new Date(event.created_at).toLocaleString()}<p>{event.description}</p></div>)}
      </div>}
    </Modal>
  </>;
}
