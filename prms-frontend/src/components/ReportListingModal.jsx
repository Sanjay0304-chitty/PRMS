import { useState } from 'react';
import { AlertCircle, CheckCircle2, Flag } from 'lucide-react';
import Modal from './Modal';
import { propertyApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './ReportListingModal.css';

const REPORT_REASONS = [
  'Inaccurate or misleading information',
  'Fraudulent or suspicious listing / Scam',
  'Property no longer available / already rented',
  'Offensive or inappropriate content',
  'Duplicate listing',
  'Wrong pricing or unauthorized landlord',
  'Other',
];

export default function ReportListingModal({ isOpen, onClose, property }) {
  const { user } = useAuth();
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const propertyId = property?.id || property?._id;
  const propertyTitle = property?.title || property?.name || 'this property';

  const resetForm = () => {
    setReportReason(REPORT_REASONS[0]);
    setReportDetails('');
    setReportEmail(user?.email || '');
    setResult(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!propertyId || !reportReason) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await propertyApi.report(propertyId, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        email: reportEmail.trim() || user?.email || undefined,
      });

      setResult({
        success: true,
        message:
          res.data?.message ||
          'Listing report submitted successfully. Our team will review this property.',
      });
      setReportDetails('');
    } catch (err) {
      setResult({
        success: false,
        message:
          err.response?.data?.error?.message ||
          'Failed to submit report. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title="Report This Listing"
      footer={
        !result?.success ? (
          <div className="report-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-report-submit"
              onClick={handleSubmit}
              disabled={submitting || !reportReason}
            >
              <Flag size={14} />
              {submitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleClose}
          >
            Done
          </button>
        )
      }
    >
      {result ? (
        <div className="report-result-box">
          {result.success ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <CheckCircle2
                size={24}
                style={{ color: 'var(--status-success, #10b981)', flexShrink: 0 }}
              />
              <div>
                <h4>Thank you for your report</h4>
                <p>{result.message}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertCircle
                size={24}
                style={{ color: 'var(--status-error, #ef4444)', flexShrink: 0 }}
              />
              <div>
                <h4 style={{ color: 'var(--status-error, #ef4444)' }}>Submission Failed</h4>
                <p style={{ color: 'var(--status-error, #ef4444)' }}>{result.message}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="report-modal-content">
          <p className="report-modal-intro">
            Help us maintain safety and transparency. Why are you reporting{' '}
            <strong>{propertyTitle}</strong>?
          </p>

          <label className="report-field">
            <span className="report-field-label">Reason for reporting *</span>
            <select
              className="report-field-select"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {!user && (
            <label className="report-field">
              <span className="report-field-label">Your email (optional)</span>
              <input
                type="email"
                className="report-field-input"
                placeholder="name@example.com"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
              />
            </label>
          )}

          <label className="report-field">
            <span className="report-field-label">Additional details (optional)</span>
            <textarea
              rows={3}
              className="report-field-textarea"
              placeholder="Describe the issue to help our moderation team investigate..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </label>
        </div>
      )}
    </Modal>
  );
}
