import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Search, Trash2 } from 'lucide-react';
import { bookingApi } from '../api/booking';
import './AdminSimplePage.css';
import './AdminBookings.css';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'CHECKED_IN', label: 'Moved In' },
  { key: 'CHECKED_OUT', label: 'Moved Out' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const COLUMNS = ['Booking', 'Tenant', 'Property', 'Dates', 'Amount', 'Action'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount) {
  return typeof amount === 'number' ? 'RM ' + amount.toLocaleString() : '—';
}

export default function AdminBookings() {
  const [tab, setTab] = useState('PENDING');
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, summaryRes] = await Promise.all([
        bookingApi.list({ status: tab, limit: 100 }),
        bookingApi.getBookingSummary(),
      ]);
      setBookings(listRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (e) {
      setError(e.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const cancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingApi.cancel(id);
      load();
    } catch (e) {
      setError(e.message || 'Failed to cancel booking');
    }
  };

  const deleteBooking = async (id) => {
    if (!confirm('Permanently remove this booking? This cannot be undone.')) return;
    try {
      await bookingApi.remove(id);
      load();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || 'Failed to delete booking');
    }
  };

  const exportCsv = () => {
    const header = 'ID,Tenant,Property,Start,End,Status,Amount';
    const rows = bookings.map((b) =>
      [
        b.id || '',
        b.user?.full_name || b.user?.email || '',
        b.property?.title || '',
        b.start_date || '',
        b.end_date || '',
        b.status || '',
        b.totalAmount ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: 'Total Bookings', value: summary?.total ?? '...' },
    { label: 'Pending', value: summary?.pending ?? '...' },
    { label: 'Confirmed', value: summary?.confirmed ?? '...' },
    { label: 'Cancelled', value: summary?.cancelled ?? '...' },
  ];

  const filteredBookings = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.id?.toLowerCase().includes(q) ||
      b.user?.full_name?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q) ||
      b.property?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <section className="admin-simple-hero">
        <div>
          <h1>Booking Management</h1>
          <p>Monitor rental bookings, approvals, cancellations, and disputes.</p>
        </div>
        <button type="button" className="admin-simple-primary-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </section>

      <section className="admin-simple-cards">
        {cards.map((card) => (
          <article className="admin-simple-card" key={card.label}>
            <div className="admin-simple-icon">
              <CalendarDays size={26} />
            </div>
            <p>{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
      </section>

      <div className="admin-bookings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
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
          <h2>{TABS.find((t) => t.key === tab)?.label} Bookings</h2>
          <div className="admin-simple-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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

            {filteredBookings.length === 0 && (
              <div className="admin-simple-table-row">
                <div style={{ gridColumn: `1 / ${COLUMNS.length + 1}`, textAlign: 'center', padding: 20 }}>
                  {search ? `No bookings match "${search}"` : 'No bookings found'}
                </div>
              </div>
            )}

            {filteredBookings.map((b) => (
              <div
                className="admin-simple-table-row admin-bookings-table-row"
                style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)` }}
                key={b.id}
              >
                <div><span>{'BKG-' + b.id.slice(-6).toUpperCase()}</span></div>
                <div><span>{b.user?.full_name || b.user?.email || '—'}</span></div>
                <div><span>{b.property?.title || '—'}</span></div>
                <div><span>{formatDate(b.start_date)} → {formatDate(b.end_date)}</span></div>
                <div><span>{formatAmount(b.totalAmount)}</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={b.status === 'CANCELLED' || b.status === 'CHECKED_OUT'}
                    onClick={() => cancelBooking(b.id)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    title="Permanently remove this booking"
                    onClick={() => deleteBooking(b.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
