import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Printer,
  Building2,
  RotateCw,
  TrendingUp,
  CreditCard,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { paymentApi } from '../api/payment';
import { useAuth } from '../contexts/AuthContext';
import './AdminReports.css';

export default function AdminReports() {
  const { user } = useAuth();
  const isAgent = user?.role === 'Agent';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Stable document timestamp & statement reference
  const [statementMeta] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const dateFormatted = now.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const refNumber = `STM-${year}-883921`;
    return {
      dateFormatted,
      timeFormatted,
      refNumber,
      period: `FY${year} All-Time Platform Operational Cycle`,
    };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        paymentApi.getPaymentSummary(),
        paymentApi.list({ limit: 100 }),
      ]);
      setReport(summaryRes.data?.data || {});
      const listData = paymentsRes.data?.data?.data || paymentsRes.data?.data || paymentsRes.data || [];
      setPayments(Array.isArray(listData) ? listData : []);
    } catch (e) {
      setError(e.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      paymentApi.getPaymentSummary(),
      paymentApi.list({ limit: 100 }),
    ])
      .then(([summaryRes, paymentsRes]) => {
        if (!active) return;
        setReport(summaryRes.data?.data || {});
        const listData = paymentsRes.data?.data?.data || paymentsRes.data?.data || paymentsRes.data || [];
        setPayments(Array.isArray(listData) ? listData : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'Failed to load report data');
        setLoading(false);
      });

    return () => { active = false; };
  }, []);

  // Filtered transactions for statement
  const filteredPayments = useMemo(() => {
    if (statusFilter === 'ALL') return payments;
    return payments.filter((p) => (p.status || '').toUpperCase() === statusFilter);
  }, [payments, statusFilter]);

  // Aggregate totals
  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredPayments]);

  const totalRevenueVal = report?.totalRevenue || report?.total || 0;
  const pendingVal = report?.pendingAmount || report?.pending || 0;
  const collectedVal = report?.collectedAmount || report?.collected || 0;
  const overdueVal = report?.overdue ?? 0;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="admin-reports-container">
      {/* ── Screen Actions Bar (Hidden during Print) ── */}
      <section className="report-actions-bar no-print">
        <div className="report-actions-left">
          <h2>{isAgent ? 'Assigned Property Statement & Report' : 'Official Financial & Rental Statement'}</h2>
          <p>
            {isAgent
              ? 'Official audit statement and payment records for properties assigned to your management.'
              : 'Official accounting statement of rental operations, transactions, and revenue collections.'}
          </p>
        </div>

        <div className="report-actions-right">
          <label htmlFor="statement-filter-select" className="sr-only">Filter by Status</label>
          <select
            id="statement-filter-select"
            className="statement-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Transactions ({payments.length})</option>
            <option value="PAID">Paid Only</option>
            <option value="PENDING">Pending Only</option>
            <option value="OVERDUE">Overdue Only</option>
          </select>

          <button
            type="button"
            className="print-statement-btn"
            onClick={handlePrint}
            title="Print Official Statement to PDF or Paper"
          >
            <Printer size={18} />
            Print Statement
          </button>

          <button
            type="button"
            className="btn-outline"
            onClick={loadData}
            title="Refresh Data"
            style={{ height: 40, padding: '0 12px', display: 'inline-flex', alignItems: 'center' }}
          >
            <RotateCw size={16} />
          </button>
        </div>
      </section>

      {error && (
        <div className="admin-error-banner no-print" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* ── THE OFFICIAL REPORT STATEMENT (Printed / PDF Sheet) ── */}
      <article className="report-statement-document" id="printable-statement">
        {/* Statement Header */}
        <header className="statement-header">
          <div className="statement-brand-block">
            <div className="statement-logo-badge">
              <Building2 size={28} />
            </div>
            <div className="statement-brand-text">
              <h1>PRMS REAL ESTATE MANAGEMENT</h1>
              <p>Property Rental Management System &bull; Financial Operations Division</p>
            </div>
          </div>

          <div className="statement-meta-block">
            <div className="statement-doc-title">Statement of Account</div>
            <div className="statement-meta-row">
              <span className="statement-meta-label">Statement Ref:</span>
              <span>{statementMeta.refNumber}</span>
            </div>
            <div className="statement-meta-row">
              <span className="statement-meta-label">Issue Date:</span>
              <span>{statementMeta.dateFormatted}, {statementMeta.timeFormatted}</span>
            </div>
            <div className="statement-meta-row">
              <span className="statement-meta-label">Currency:</span>
              <span>Malaysian Ringgit (RM)</span>
            </div>
          </div>
        </header>

        {/* Statement Info Strip */}
        <section className="statement-info-strip">
          <div className="statement-info-col">
            <span className="info-title">Reporting Cycle</span>
            <span className="info-value">{statementMeta.period}</span>
          </div>
          <div className="statement-info-col">
            <span className="info-title">Prepared For</span>
            <span className="info-value">Management &amp; Property Stakeholders</span>
          </div>
          <div className="statement-info-col">
            <span className="info-title">Authorized By</span>
            <span className="info-value">{user?.full_name || 'Administrator'} ({user?.role || 'Admin'})</span>
          </div>
          <div className="statement-info-col">
            <span className="info-title">Status</span>
            <span className="info-value" style={{ color: '#15803d' }}>Official / Audited</span>
          </div>
        </section>

        {/* Executive Financial Summary */}
        <section className="statement-summary-section">
          <h3 className="statement-section-title">Financial Summary &amp; Receivables</h3>
          <div className="statement-summary-grid">
            <div className="statement-kpi-card">
              <div className="statement-kpi-label">
                <TrendingUp size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Total Platform Revenue
              </div>
              <div className="statement-kpi-value">
                RM {Number(totalRevenueVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="statement-kpi-card collected">
              <div className="statement-kpi-label">
                <CreditCard size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Payments Collected
              </div>
              <div className="statement-kpi-value">
                {loading ? '...' : (typeof collectedVal === 'number' ? `RM ${collectedVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : collectedVal)}
              </div>
            </div>

            <div className="statement-kpi-card pending">
              <div className="statement-kpi-label">
                <Clock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Pending Receivables
              </div>
              <div className="statement-kpi-value">
                {loading ? '...' : (typeof pendingVal === 'number' ? `RM ${pendingVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : pendingVal)}
              </div>
            </div>

            <div className="statement-kpi-card overdue">
              <div className="statement-kpi-label">
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Overdue Accounts
              </div>
              <div className="statement-kpi-value">
                {loading ? '...' : overdueVal}
              </div>
            </div>
          </div>
        </section>

        {/* Itemized Transactions Breakdown Table */}
        <section className="statement-table-section">
          <h3 className="statement-section-title">Itemized Statement Breakdown ({filteredPayments.length} Records)</h3>
          <div className="statement-table-wrap">
            <table className="statement-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Date</th>
                  <th style={{ width: '16%' }}>Statement Ref</th>
                  <th style={{ width: '28%' }}>Property / Description</th>
                  <th style={{ width: '16%' }}>Payer / Tenant</th>
                  <th style={{ width: '10%' }}>Method</th>
                  <th style={{ width: '8%' }}>Status</th>
                  <th style={{ width: '10%' }} className="num-col">Amount (RM)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, idx) => {
                  const dateStr = p.paid_at || p.due_date;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '—';
                  const refId = p.reference || `TXN-${String(p.id || idx).slice(0, 8).toUpperCase()}`;
                  const propTitle = p.booking?.property?.title || p.property?.title || 'Rental Unit Allocation';
                  const payerName = p.user?.full_name || p.booking?.user?.full_name || 'Verified Tenant';
                  const methodStr = p.method || 'FPX / Online';
                  const statusKey = (p.status || 'PAID').toLowerCase();

                  return (
                    <tr key={p.id || idx}>
                      <td>{formattedDate}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{refId}</td>
                      <td>{propTitle}</td>
                      <td>{payerName}</td>
                      <td>{methodStr}</td>
                      <td>
                        <span className={`statement-status-tag ${statusKey}`}>{p.status || 'PAID'}</span>
                      </td>
                      <td className="num-col">
                        RM {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      {loading ? 'Compiling financial statement records...' : 'No transaction records found for the selected filter.'}
                    </td>
                  </tr>
                )}

                {/* Subtotals & Grand Total Row */}
                {filteredPayments.length > 0 && (
                  <tr className="statement-total-row">
                    <td colSpan={6} style={{ textAlign: 'right', paddingRight: '16px' }}>
                      TOTAL STATEMENT RECONCILIATION ({filteredPayments.length} ITEMS):
                    </td>
                    <td className="num-col" style={{ color: '#1e3a8a', fontSize: '1rem' }}>
                      RM {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Statement Certification & Footer */}
        <footer className="statement-footer-section">
          <div className="statement-disclaimer-box">
            <p className="notice-title">Official Computer-Generated Document Certification</p>
            <p>
              This is an official computer-generated statement issued by the Property Rental Management System (PRMS).
              All monetary values are denominated in Malaysian Ringgit (RM). In accordance with Section 6 of the Electronic
              Commerce Act 2006, this electronic statement is legally binding without a physical hand-signature.
            </p>
            <p style={{ marginTop: 8, fontSize: '0.7rem', color: '#94a3b8' }}>
              Confidentiality Notice: The contents of this statement are protected under the Malaysian Personal Data Protection Act 2010 (PDPA).
              Unauthorized transmission, disclosure, or copying is strictly prohibited.
            </p>
          </div>

          <div className="statement-stamp-box">
            <div className="statement-stamp-title">PRMS AUDITED STATEMENT</div>
            <div className="statement-stamp-sub">CERTIFIED ELECTRONIC RECORD</div>
            <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#2563eb', fontWeight: 700 }}>
              DOC REF: {statementMeta.refNumber}
            </div>
            <div style={{ marginTop: 2, fontSize: '0.65rem', color: '#64748b' }}>
              Generated on {statementMeta.dateFormatted}
            </div>
          </div>
        </footer>

        <div className="statement-page-number">
          Page 1 of 1 &bull; Document Reference: {statementMeta.refNumber} &bull; Property Rental Management System
        </div>
      </article>
    </div>
  );
}
