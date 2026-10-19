import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { apiClient } from '../api';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Download,
    Building2,
    CalendarDays,
    Hash,
} from 'lucide-react';
import './PaymentReceipt.css';

function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-MY', options);
}

function safeFilename(value) {
    return String(value || 'receipt').replace(/[^a-z0-9-_]/gi, '-');
}

function PaymentReceipt() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function loadReceipt() {
            setLoading(true);
            setError('');
            try {
                const res = await apiClient.get(`/payments/${id}`);
                if (!cancelled) setReceipt(res.data?.data ?? null);
            } catch (e) {
                if (!cancelled) setError(e.response?.data?.error?.message || 'Payment not found');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (id) loadReceipt();
        else {
            setError('Payment ID is missing');
            setLoading(false);
        }
        return () => { cancelled = true; };
    }, [id]);


    function handleDownloadPdf() {
        if (!receipt || downloading) return;

        setDownloading(true);
        setDownloadError('');

        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const left = 20;
            const right = pageWidth - 50;
            const valueX = 78;
            const valueWidth = right - valueX;
            const lineHeight = 5;
            let y = 22;

            const addRow = (label, value) => {
                const cleanValue = String(value ?? '—');

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(label, left, y);

                doc.setFont('helvetica', 'normal');

                doc.text(cleanValue, valueX, y, {
                    maxWidth: valueWidth,
                });

                const lines = doc.splitTextToSize(cleanValue, valueWidth);
                y += Math.max(lineHeight, lines.length * lineHeight) + 3;
            };

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('PRMS', left, y);

            doc.setFontSize(15);
            doc.text('Payment Receipt', right, y, { align: 'right' });

            y += 8;
            doc.setDrawColor(180);
            doc.line(left, y, right, y);
            y += 12;

            doc.setFontSize(11);

            addRow('Payment Status', receipt.status || '—');
            addRow(
                'Receipt Number',
                receipt.id ? receipt.id.slice(0, 8).toUpperCase() : '—'
            );
            addRow('Amount', `RM ${Number(receipt.amount || 0).toFixed(2)}`);
            addRow('Property', receipt.booking?.property?.title || '—');
            addRow('Booking Start', formatDate(receipt.booking?.start_date));
            addRow('Booking End', formatDate(receipt.booking?.end_date));
            addRow('Date Issued', formatDate(receipt.due_date));
            addRow(
                'Date Paid',
                receipt.paid_at
                    ? new Date(receipt.paid_at).toLocaleString('en-MY', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '—'
            );
            addRow('Payment Reference', receipt.reference || '—');
            addRow('Payment Method', receipt.method || '—');

            y += 5;
            if (y + 20 > pageHeight - 10) {
                doc.addPage();
                y = 22;
            }

            doc.setDrawColor(180);
            doc.line(left, y, right, y);
            y += 9;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('Thank you for your payment!', pageWidth / 2, y, {
                align: 'center',
            });

            y += 6;
            doc.setFontSize(9);
            doc.text(
                'Contact support@prms.com for enquiries.',
                pageWidth / 2,
                y,
                { align: 'center' }
            );

            doc.save(`PRMS-Receipt-${safeFilename(receipt.id)}.pdf`);
        } catch (e) {
            console.error('Failed to generate payment receipt PDF:', e);
            setDownloadError('Could not generate the PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    }


    if (loading) return <div className="receipt-loading">Loading receipt...</div>;
    if (error) return <div className="receipt-error">{error}</div>;
    if (!receipt) return <div className="receipt-error">Payment not found</div>;

    const isPaid = receipt.status === 'PAID';

    return (
        <motion.div
            className="payment-receipt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <button className="receipt-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Back
            </button>

            <div className="receipt-card">
                <div className="receipt-header">
                    <div className="receipt-logo-section">
                        <h1>PRMS</h1>
                        <span>Payment Receipt</span>
                    </div>
                    <div className={`receipt-status ${isPaid ? 'paid' : 'pending'}`}>
                        {isPaid ? <><CheckCircle size={18} /> Paid</> : <><Clock size={18} /> Pending</>}
                    </div>
                </div>

                <div className="receipt-actions">
                    <button
                        type="button"
                        className="receipt-action-btn"
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                    >
                        <Download size={14} /> {downloading ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                </div>
                {downloadError && <div className="receipt-error" role="alert">{downloadError}</div>}

                <div className="receipt-details">
                    <div className="receipt-row">
                        <div className="receipt-label">Receipt Number</div>
                        <div className="receipt-value receipt-ref"><Hash size={14} className="receipt-icon" />{receipt.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div className="receipt-row">
                        <div className="receipt-label">Amount</div>
                        <div className="receipt-value receipt-amount">RM {Number(receipt.amount).toFixed(2)}</div>
                    </div>
                    {receipt.booking?.property && (
                        <div className="receipt-row">
                            <div className="receipt-label">Property</div>
                            <div className="receipt-value"><Building2 size={14} className="receipt-icon" />{receipt.booking.property.title}</div>
                        </div>
                    )}
                    <div className="receipt-row">
                        <div className="receipt-label">Booking Period</div>
                        <div className="receipt-value">
                            <CalendarDays size={14} className="receipt-icon" />
                            {formatDate(receipt.booking?.start_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' → '}
                            {formatDate(receipt.booking?.end_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="receipt-row">
                        <div className="receipt-label">Date Issued</div>
                        <div className="receipt-value">{formatDate(receipt.due_date)}</div>
                    </div>
                    {receipt.paid_at && (
                        <div className="receipt-row">
                            <div className="receipt-label">Date Paid</div>
                            <div className="receipt-value">{formatDate(receipt.paid_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    )}
                    {receipt.reference && (
                        <div className="receipt-row"><div className="receipt-label">Reference</div><div className="receipt-value">{receipt.reference}</div></div>
                    )}
                    {receipt.method && (
                        <div className="receipt-row"><div className="receipt-label">Payment Method</div><div className="receipt-value">{receipt.method}</div></div>
                    )}
                </div>

                <div className="receipt-footer">
                    <p>Thank you for your payment!</p>
                    <p className="receipt-tinymce">Contact support@prms.com for enquiries.</p>
                </div>
            </div>
        </motion.div>
    );
}

export default PaymentReceipt;
