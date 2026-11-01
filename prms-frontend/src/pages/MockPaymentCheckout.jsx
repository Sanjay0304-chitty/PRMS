import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentApi } from '../api';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Banknote,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Shield,
} from 'lucide-react';
import './MockPaymentCheckout.css';

const METHODS = [
  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, AMEX' },
  { id: 'FPX', label: 'FPX Online Banking', icon: Banknote, desc: 'All major Malaysian banks' },
  { id: 'QR', label: 'QR Pay (DuitNow)', icon: Smartphone, desc: 'Scan to pay via any e-wallet' },
];

function MockPaymentCheckout() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('SELECT'); // SELECT | PROCESSING | SUCCESS | FAILED | CANCELLED
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [txn, setTxn] = useState(null);
  const [processingMsg, setProcessingMsg] = useState('Connecting to payment gateway...');
  const pollTimer = useRef(null);

  // ── Step 1: Load payment details ──
  useEffect(() => {
    if (!paymentId) return;
    (async () => {
      try {
        const res = await paymentApi.getById(paymentId);
        const data = res.data?.data;
        setPaymentInfo(data);
        if (data?.status === 'PAID') {
          // Already paid — let gateway redirect handle it
        }
      } catch {
        // ignore — will fail if access denied
      }
    })();
  }, [paymentId]);

  // ── Step 2: Start mock checkout (if no transactionId provided) ──
  const startCheckout = async (method) => {
    if (!paymentId) return;
    try {
      const res = await paymentApi.startMockCheckout(paymentId, method);
      const data = res.data?.data;
      setTxn(data);
      setPhase('PROCESSING');
      simulateProcessing(data.id);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Checkout failed';
      setProcessingMsg(msg);
      setPhase('FAILED');
    }
  };

  // ── Step 3: Simulate bank processing (1.5s → 2.5s) ──
  const simulateProcessing = (txnId) => {
    setProcessingMsg('Processing your payment...');
    const duration = 1500 + Math.random() * 1000;

    setTimeout(async () => {
      try {
        // Random outcome: 80% success
        const outcome = Math.random() < 0.8 ? 'SUCCESS' : 'FAILED';
        const res = await paymentApi.completeMockTransaction(
          txnId,
          outcome,
          outcome === 'FAILED' ? 'Insufficient funds — please retry' : undefined,
        );
        setTxn(res.data?.data);
        setPhase(outcome);
      } catch {
        setProcessingMsg('Connection lost — please try again');
        setPhase('FAILED');
      }
    }, duration);
  };

  // ── Step 4: Redirect to receipt (handled in success view) ──
  useEffect(() => {
    if (phase === 'SUCCESS') {
      pollTimer.current = setTimeout(() => {
        if (paymentId) navigate(`/tenant/payments/${paymentId}`);
      }, 3000);
    }
    return () => clearTimeout(pollTimer.current);
  }, [phase, paymentId, navigate]);

  if (!paymentId) return <div className="checkout-error">Invalid payment</div>;

  return (
    <motion.div
      className="mock-checkout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Back button */}
      <button className="checkout-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <AnimatePresence mode="wait">
        {/* ── SELECT ── */}
        {phase === 'SELECT' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <h2 className="checkout-title">Pay with Mock Gateway</h2>
            <p className="checkout-subtitle">Secure payment processing · 100% reliable</p>

            {paymentInfo && (
              <div className="checkout-payment-card">
                <div className="checkout-payment-row">
                  <span className="checkout-label">Amount</span>
                  <span className="checkout-amount">RM {Number(paymentInfo.amount).toFixed(2)}</span>
                </div>
                {paymentInfo.booking?.property && (
                  <div className="checkout-payment-row">
                    <span className="checkout-label">Property</span>
                    <span className="checkout-value">
                      <Building2 size={14} className="checkout-icon" />
                      {paymentInfo.booking.property.title}
                    </span>
                  </div>
                )}
                <div className="checkout-payment-row">
                  <span className="checkout-label">Due Date</span>
                  <span className="checkout-value">
                    {new Date(paymentInfo.due_date).toLocaleDateString('en-MY', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}

            <h3 className="checkout-methods-title">Choose Payment Method</h3>
            <div className="checkout-methods">
              {METHODS.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  className="checkout-method-btn"
                  onClick={() => startCheckout(id)}
                >
                  <Icon size={22} className="checkout-method-icon" />
                  <div className="checkout-method-info">
                    <span className="checkout-method-label">{label}</span>
                    <span className="checkout-method-desc">{desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="checkout-secure">
              <Shield size={14} className="checkout-icon" />
              All transactions are secure and encrypted
            </p>
          </motion.div>
        )}

        {/* ── PROCESSING ── */}
        {phase === 'PROCESSING' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="checkout-processing"
          >
            <Loader2 size={48} className="checkout-spinner" />
            <p className="checkout-processing-text">{processingMsg}</p>
            <p className="checkout-processing-hint">
              This typically takes 1 to 3 seconds...
            </p>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {phase === 'SUCCESS' && txn && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="checkout-success"
          >
            <CheckCircle size={56} className="checkout-success-icon" />
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed.</p>
            <div className="checkout-receipt-mini">
              <div className="checkout-mini-row">
                <span>Reference</span>
                <span className="checkout-ref">{txn.reference}</span>
              </div>
              <div className="checkout-mini-row">
                <span>Amount Paid</span>
                <span className="checkout-mini-amount">RM {Number(paymentInfo?.amount || txn?.payment?.amount).toFixed(2)}</span>
              </div>
              <div className="checkout-mini-row">
                <span>Status</span>
                <span className="checkout-status-badge success">PAID</span>
              </div>
            </div>
            <p className="checkout-redirect-hint">
              Redirecting to receipt in 3 seconds...
            </p>
            <button
              className="checkout-redirect-btn"
              onClick={() => navigate(`/tenant/payments/${paymentId}`)}
            >
              View Receipt Now
            </button>
          </motion.div>
        )}

        {/* ── FAILED ── */}
        {phase === 'FAILED' && txn && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="checkout-failed"
          >
            <XCircle size={56} className="checkout-failed-icon" />
            <h2>Payment Failed</h2>
            <p>{txn.failureMessage || 'The transaction did not complete.'}</p>
            <div className="checkout-actions">
              <button
                className="checkout-retry-btn"
                onClick={() => {
                  const m = txn?.method || 'CARD';
                  startCheckout(m);
                }}
              >
                <Clock size={16} /> Try Again
              </button>
              <button
                className="checkout-back-btn"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} /> Back to Payments
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MockPaymentCheckout;
