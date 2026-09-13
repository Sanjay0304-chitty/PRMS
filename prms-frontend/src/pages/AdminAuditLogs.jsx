import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../api/ApiClient';
import './AdminSimplePage.css';
import './AdminBookings.css';

const LEVELS = ['info', 'warning', 'error', 'critical'];
const SORT_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

const COLUMNS = ['Date', 'User', 'Action', 'Level', 'Details'];

export default function AdminAuditLogs() {
  const [tab, setTab] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const params = { page: 1, limit: 50, sortDir };
    if (tab !== 'all') params.level = tab;
    if (search) params.search = search;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/audit-logs', { params });
      setLogs(res.data?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [tab, sortDir, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <section className="admin-simple-hero">
        <div>
          <h1>Reports &amp; Audit</h1>
          <p>Review security logs, user activity, and system audit events.</p>
        </div>
      </section>

      <div className="admin-bookings-tabs">
        <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          All
        </button>
        {LEVELS.map((l) => (
          <button key={l} type="button" className={tab === l ? 'active' : ''} onClick={() => setTab(l)}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="admin-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      <section className="admin-simple-table-card">
        <div className="admin-simple-table-header">
          <h2>Audit Logs</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <select
              className="admin-simple-search"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              style={{ border: '2px solid var(--border-color-strong)', cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="admin-simple-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-simple-table">
            <div className="admin-simple-table-head">Loading...</div>
          </div>
        ) : (
          <div className="admin-simple-table">
            <div
              className="admin-simple-table-head"
              style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)` }}
            >
              {COLUMNS.map((col) => (
                <p key={col}>{col}</p>
              ))}
            </div>

            {logs.length === 0 && (
              <div className="admin-simple-table-row">
                <div style={{ gridColumn: `1 / ${COLUMNS.length + 1}`, textAlign: 'center', padding: 20 }}>
                  No audit logs found
                </div>
              </div>
            )}

            {logs.map((l) => (
              <div
                className="admin-simple-table-row"
                style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)` }}
                key={l.id}
              >
                <div><span>{new Date(l.created_at).toLocaleString()}</span></div>
                <div><span>{l.user?.full_name || l.username || '—'}</span></div>
                <div><span>{l.action}</span></div>
                <div><span>{l.level}</span></div>
                <div><span>{l.description || '—'}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
