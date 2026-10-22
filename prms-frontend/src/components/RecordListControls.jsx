import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/ApiClient';
import './RecordListControls.css';

export function useRecordList(kind, tab) {
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const base = kind === 'viewing' ? '/viewings' : '/maintenance';
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get(`${base}/records`, { params: { tab, page, limit: 10 } });
      if (version !== requestVersion.current) return;
      if (page > Math.max(1, data.pagination.totalPages)) {
        setPage(Math.max(1, data.pagination.totalPages));
        return;
      }
      setRecords(data.data);
      setPagination(data.pagination);
      setArchivedCount(data.archivedCount);
    } catch (e) {
      if (version !== requestVersion.current) return;
      setRecords([]);
      setError(e.response?.data?.error?.message || e.message || 'Unable to load records');
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [base, page, tab]);
  useEffect(() => { load(); return () => { requestVersion.current++; }; }, [load]);
  const archive = async (id, archived) => {
    setBusy(true);
    setError('');
    try {
      await apiClient.patch(`${base}/${id}/archive`, { archived });
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Unable to update archive'); }
    finally { setBusy(false); }
  };
  return { records, page, setPage, pagination, archivedCount, loading, error, busy, load, archive };
}

export function ArchiveAction({ record, list, kind }) {
  if (!record.archivedAt && !(kind === 'viewing' ? ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(record.status) : record.status === 'CLOSED')) return null;
  return <button type="button" className="btn btn-sm btn-outline record-archive-button" disabled={list.busy} onClick={() => list.archive(record.id, !record.archivedAt)}>{record.archivedAt ? 'Restore' : 'Archive'}</button>;
}

export function RecordPagination({ list }) {
  const { page, pagination: { total, totalPages }, loading, setPage } = list;
  return <nav className="record-pagination" aria-label="Record pages">
    <span>{total ? `Showing ${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} of ${total}` : 'No records'}</span>
    <div>
      <button type="button" className="btn btn-sm btn-outline" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {Math.max(1, totalPages)}</span>
      <button type="button" className="btn btn-sm btn-outline" disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </nav>;
}

export function ArchiveHint({ archived }) {
  return <p className="record-archive-hint">{archived ? 'Your archived records. Restore a record to return it to your main list.' : 'Archiving hides finished records only from your list. Other participants keep their history.'}</p>;
}
