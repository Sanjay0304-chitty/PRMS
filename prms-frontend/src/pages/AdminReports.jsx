import { useState, useEffect, useCallback } from 'react';
import { WalletCards, Clock, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { paymentApi } from '../api/payment';
import './AdminSimplePage.css';

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPaymentSummary();
      setReport(res.data?.data || {});
    } catch (e) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { icon: WalletCards, label: 'Revenue Collected', value: 'RM ' + (report?.total || 0).toLocaleString() },
    { icon: Clock, label: 'Pending Payments', value: report?.pending ?? '...' },
    { icon: CheckCircle2, label: 'Payments Collected', value: report?.collected ?? '...' },
    { icon: AlertTriangle, label: 'Overdue Payments', value: report?.overdue ?? '...' },
  ];

  return (
    <>
      <section className="admin-simple-hero">
        <div>
          <h1>Reports &amp; Audit</h1>
          <p>Platform-wide revenue, payment activity, and financial health at a glance.</p>
        </div>
        <button type="button" className="admin-simple-primary-btn" onClick={() => window.print()}>
          <Printer size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
          Print Report
        </button>
      </section>

      {error && (
        <div className="admin-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      <section className="admin-simple-cards">
        {cards.map((card) => (
          <article className="admin-simple-card" key={card.label}>
            <div className="admin-simple-icon">
              <card.icon size={26} />
            </div>
            <p>{card.label}</p>
            <h3>{loading ? '...' : card.value}</h3>
          </article>
        ))}
      </section>
    </>
  );
}
