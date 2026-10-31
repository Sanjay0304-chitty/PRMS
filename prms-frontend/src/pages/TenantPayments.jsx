import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentApi } from '../api';
import {
  Clock,
  CreditCard,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react';
import './TenantPayments.css';

const FILTERS = [
  { id: 'all', label: 'All Payments' },
  { id: 'due', label: 'Due' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

function TenantPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const LIMIT = 20;

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchPayments() {
      try {
        const params = { page, limit: LIMIT };
        if (filter && filter !== 'all') {
          params.filter = filter;
          params.status = filter;
        }
        const res = await paymentApi.myPayments(params);
        if (!cancelled) {
          setPayments(res.data?.data || []);
          setTotal(res.data?.pagination?.total || 0);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load payments.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchPayments();
    return () => { cancelled = true; };
  }, [page, filter, reloadKey]);


  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function statusInfo(status) {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PAID':
        return { label: 'Completed', icon: CheckCircle, color: '#16a34a', bg: 'rgba(22,163,74,0.08)' };
      case 'FAILED':
        return { label: 'Failed', icon: XCircle, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' };
      case 'PENDING':
      case 'UNPAID':
        return { label: 'Due', icon: Clock, color: '#d97706', bg: 'rgba(217,119,6,0.08)' };
      case 'REFUNDED':
        return { label: 'Refunded', icon: AlertCircle, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' };
      default:
        return { label: status || 'Unknown', icon: AlertCircle, color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <motion.div
      className="tenant-payments"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="payments-header">
        <h1 className="payments-title">My Payments</h1>
        <p className="payments-subtitle">Monitor and manage your property payments</p>
      </div>

      {/* Filter Tabs */}
      <div className="payments-filters" role="tablist" aria-label="Payment status filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`payments-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => {
              setFilter(f.id);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="payments-error" role="alert">
          <AlertCircle size={18} />
          <span className="payments-error-text">{error}</span>
          <button
            type="button"
            className="payments-retry-btn"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && payments.length === 0 && (
        <div className="payments-loading">Loading payments...</div>
      )}

      {payments.length === 0 && !loading && (
        <div className="payments-empty">
          <CreditCard size={36} className="payments-empty-icon" />
          <h3>{filter === 'all' ? 'No payments found' : `No ${filter} payments`}</h3>
          <p>
            {filter === 'all'
              ? 'There are no payments for your bookings yet.'
              : `You currently have no payments matching the "${filter}" filter.`}
          </p>
          {filter !== 'all' && (
            <button
              type="button"
              className="payments-filter-reset-btn"
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
            >
              View All Payments
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {payments.map((payment, i) => {
          const info = statusInfo(payment.status);
          const StatusIcon = info.icon;
          const isPaid = String(payment.status || '').toUpperCase() === 'PAID';
          const isUnpaid = ['PENDING', 'UNPAID'].includes(String(payment.status || '').toUpperCase());
          const isFailed = String(payment.status || '').toUpperCase() === 'FAILED';
          const expanded = expandedId === payment.id;
          const latestTx = payment.transactions?.[0];

          const propertyTitle =
            payment.booking?.property?.title ||
            payment.booking?.property?.address ||
            payment.property?.title ||
            'Property Payment';

          return (
            <motion.div
              key={payment.id}
              className="payment-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {/* Main row */}
              <div className="payment-main">
                <div className="payment-status-badge" style={{ color: info.color, background: info.bg }}>
                  <StatusIcon size={14} />
                  <span>{info.label}</span>
                </div>

                <div className="payment-details">
                  <div className="payment-property">
                    <Building2 size={16} />
                    <span>{propertyTitle}</span>
                  </div>
                  <div className="payment-meta">
                    {payment.type && (
                      <span className="payment-type-badge">{payment.type}</span>
                    )}
                    <span className="payment-due">
                      <CalendarDays size={14} />
                      Due
                    </span>
                    <span className="payment-date">
                      {payment.due_date
                        ? new Date(payment.due_date).toLocaleDateString('en-MY', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="payment-amount-section">
                  <span className="payment-amount">RM {Number(payment.amount).toFixed(2)}</span>

                  <div className="payment-actions-group">
                    {isUnpaid && (
                      <button
                        type="button"
                        className="payment-pay-btn"
                        onClick={() => navigate(`/tenant/payments/${payment.id}/checkout`)}
                      >
                        Pay Now
                        <ArrowRight size={16} />
                      </button>
                    )}

                    {isFailed && (
                      <button
                        type="button"
                        className="payment-pay-btn payment-retry-btn"
                        onClick={() => navigate(`/tenant/payments/${payment.id}/checkout`)}
                      >
                        Retry Pay
                        <ArrowRight size={16} />
                      </button>
                    )}

                    {isPaid && (
                      <button
                        type="button"
                        className="payment-receipt-link"
                        onClick={() => navigate(`/tenant/payments/${payment.id}`)}
                      >
                        View Receipt
                      </button>
                    )}

                    <button
                      type="button"
                      className="payment-details-link"
                      onClick={() => navigate(`/tenant/payments/${payment.id}`)}
                      title="View payment receipt and details"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable section with transaction history */}
              {(latestTx || payment.paid_at || payment.method) && (
                <div className="payment-expand">
                  <button
                    className="payment-expand-btn"
                    onClick={() => toggleExpand(payment.id)}
                  >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? 'Hide' : 'Show'} details
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        className="payment-expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="payment-expanded-grid">
                          <div className="payment-exp-cell">
                            <span className="payment-exp-label">Amount</span>
                            <span className="payment-exp-value">
                              RM {Number(payment.amount).toFixed(2)}
                            </span>
                          </div>
                          {payment.method && (
                            <div className="payment-exp-cell">
                              <span className="payment-exp-label">Method</span>
                              <span className="payment-exp-value">{payment.method}</span>
                            </div>
                          )}
                          {payment.reference && (
                            <div className="payment-exp-cell">
                              <span className="payment-exp-label">Reference</span>
                              <span className="payment-exp-ref">{payment.reference}</span>
                            </div>
                          )}
                          {payment.paid_at && (
                            <div className="payment-exp-cell">
                              <span className="payment-exp-label">Paid On</span>
                              <span className="payment-exp-value">
                                {new Date(payment.paid_at).toLocaleDateString('en-MY', {
                                  day: 'numeric', month: 'long', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {latestTx && (
                          <div className="payment-tx-section">
                            <span className="payment-tx-label">Latest Transaction</span>
                            <div className="payment-tx-card">
                              <div className="payment-tx-row">
                                <span>Reference</span>
                                <span className="payment-tx-ref">{latestTx.reference}</span>
                              </div>
                              <div className="payment-tx-row">
                                <span>Status</span>
                                <span
                                  className="payment-tx-status"
                                  style={{
                                    color:
                                      latestTx.status === 'SUCCESS' ? '#16a34a' :
                                      latestTx.status === 'FAILED' ? '#dc2626' :
                                      latestTx.status === 'CANCELLED' ? '#6b7280' : '#f59e0b',
                                  }}
                                >
                                  {latestTx.status}
                                </span>
                              </div>
                              <div className="payment-tx-row">
                                <span>Method</span>
                                <span>{latestTx.method}</span>
                              </div>
                              {latestTx.failureMessage && (
                                <div className="payment-tx-row">
                                  <span>Message</span>
                                  <span className="payment-tx-msg">{latestTx.failureMessage}</span>
                                </div>
                              )}
                              <div className="payment-tx-row">
                                <span>Created</span>
                                <span>
                                  {new Date(latestTx.created_at).toLocaleString('en-MY')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="payments-pager">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="payments-page-info">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default TenantPayments;
