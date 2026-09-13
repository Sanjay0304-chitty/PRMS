import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../api/payment';
import { authApi } from '../api/auth';
import './SharedPageShell.css';

const STATUS_TABS = ['all', 'due', 'completed', 'failed'];

export default function TenantPayments() {
  const [tab, setTab] = useState('all');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { await authApi.getMe(); } catch {}
    setLoading(true);
    try {
      const res = await paymentApi.list({ status: tab === 'all' ? undefined : tab });
      setPayments(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id) => {
    try { await paymentApi.markPaid(id); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">My Payments</h1>
      </div>

      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Property</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id || p.id}>
                  <td>{p.property?.title || 'N/A'}</td>
                  <td>{p.dueDate}</td>
                  <td>$ {p.amount}</td>
                  <td><span className={`shell-status-badge status-${(p.status||'').toLowerCase()}`}>{p.status}</span></td>
                  <td>
                    {p.status === 'pending' && <button className="btn btn-sm btn-primary" onClick={() => markPaid(p._id || p.id)}>Pay Now</button>}
                    <Link to={`/receipt/${p._id || p.id}`} className="btn btn-sm btn-outline ml-1">Receipt</Link>
                  </td>
                </tr>
              ))}
              {!payments.length && <tr><td colSpan={5}>No payments.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}