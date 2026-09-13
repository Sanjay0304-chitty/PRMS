import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X, Loader2, CalendarDays } from 'lucide-react';
import { bookingApi } from '../api';
import './TenantBookingModal.css';

/**
 * TenantBookingModal – the "Apply to Rent" flow. Collects the rental
 * application fields the workflow plan calls for (preferred / alternative
 * move-in date, lease duration, occupants, message, PDPA consent and
 * acknowledgement), checks the computed date range for conflicts, then
 * submits the application.
 *
 * Props
 * -----
 *   property  – Property object (must have `id` and `title`)
 *   isOpen    – Boolean controlling visibility
 *   onClose   – () => void  callback to close the modal
 */
function TenantBookingModal({ property, isOpen, onClose }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const [moveInDate, setMoveInDate] = useState('');
  const [alternativeDate, setAlternativeDate] = useState('');
  const [leaseDuration, setLeaseDuration] = useState(12);
  const [occupants, setOccupants] = useState(1);
  const [message, setMessage] = useState('');
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overlapResult, setOverlapResult] = useState(null); // null | { hasOverlap, conflictingBookings }
  const [submitResult, setSubmitResult] = useState(null);   // null | { success: boolean, message: string }

  // Expected tenancy end date, calculated automatically from the move-in
  // date and requested lease duration — never entered manually.
  const expectedEndDate = useMemo(() => {
    if (!moveInDate || !leaseDuration) return '';
    const d = new Date(moveInDate + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(leaseDuration));
    return d.toISOString().slice(0, 10);
  }, [moveInDate, leaseDuration]);

  const canSubmit = moveInDate && leaseDuration > 0 && occupants > 0 && pdpaConsent && acknowledgement;

  /* ---- Check availability against existing bookings ---- */
  async function handleCheckAvailability() {
    if (!moveInDate || !expectedEndDate) return;
    setChecking(true);
    setOverlapResult(null);
    setSubmitResult(null);
    try {
      const res = await bookingApi.checkOverlap({
        propertyId: property.id,
        startDate: moveInDate,
        endDate: expectedEndDate,
      });
      setOverlapResult(res?.data?.data ?? res?.data);
    } catch (err) {
      setOverlapResult({
        hasOverlap: false,
        conflictingBookings: [],
        error: err.response?.data?.error?.message || 'Failed to check availability',
      });
    } finally {
      setChecking(false);
    }
  }

  /* ---- Submit rental application ---- */
  async function handleSubmitApplication() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await bookingApi.create({
        propertyId: property.id,
        start_date: moveInDate,
        lease_duration_months: Number(leaseDuration),
        alternative_start_date: alternativeDate || undefined,
        occupants: Number(occupants),
        applicant_message: message || undefined,
        pdpa_consent: pdpaConsent,
        acknowledgement,
      });
      setSubmitResult({
        success: true,
        message: 'Your rental application has been submitted and is awaiting review.',
        booking: res?.data?.data ?? res?.data,
      });
      /* Auto-close after short delay */
      setTimeout(() => {
        resetAndClose();
      }, 2500);
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err.response?.data?.error?.message || 'Failed to submit your application',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setMoveInDate('');
    setAlternativeDate('');
    setLeaseDuration(12);
    setOccupants(1);
    setMessage('');
    setPdpaConsent(false);
    setAcknowledgement(false);
    setOverlapResult(null);
    setSubmitResult(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="tenant-booking-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && resetAndClose()}
        >
          <motion.div
            className="tenant-booking-modal"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Close button */}
            <button
              type="button"
              className="tenant-booking-close"
              onClick={resetAndClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Success result */}
            {submitResult?.success ? (
              <div className="tenant-booking-result">
                <CheckCircle2 size={48} className="tenant-booking-success-icon" />
                <h2>Application Submitted!</h2>
                <p>{submitResult.message}</p>
              </div>
            ) : submitResult?.success === false ? (
              <div className="tenant-booking-result">
                <AlertTriangle size={48} className="tenant-booking-error-icon" />
                <h2>Application Failed</h2>
                <p>{submitResult.message}</p>
              </div>
            ) : (
              /* ---- Application form ---- */
              <>
                <h2 className="tenant-booking-title">
                  <CalendarDays size={22} />
                  Apply to Rent
                </h2>
                <p className="tenant-booking-property-name">
                  {property?.title || 'Property'}
                </p>

                <h3 className="tenant-booking-section-title">Move-in Details</h3>
                <div className="tenant-booking-dates">
                  <label className="tenant-booking-field">
                    <span>Preferred Move-in Date</span>
                    <input
                      type="date"
                      min={todayStr}
                      max={maxDate}
                      value={moveInDate}
                      onChange={(e) => { setMoveInDate(e.target.value); setOverlapResult(null); }}
                    />
                  </label>

                  <label className="tenant-booking-field">
                    <span>Alternative Move-in Date (optional)</span>
                    <input
                      type="date"
                      min={todayStr}
                      max={maxDate}
                      value={alternativeDate}
                      onChange={(e) => setAlternativeDate(e.target.value)}
                    />
                  </label>
                </div>

                <div className="tenant-booking-dates">
                  <label className="tenant-booking-field">
                    <span>Lease Duration (months)</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={leaseDuration}
                      onChange={(e) => { setLeaseDuration(e.target.value); setOverlapResult(null); }}
                    />
                  </label>

                  <label className="tenant-booking-field">
                    <span>Number of Occupants</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={occupants}
                      onChange={(e) => setOccupants(e.target.value)}
                    />
                  </label>
                </div>

                {expectedEndDate && (
                  <p className="tenant-booking-computed-end">
                    Expected tenancy end: <strong>{expectedEndDate}</strong>
                  </p>
                )}

                <label className="tenant-booking-field tenant-booking-message-field">
                  <span>Message to Landlord (optional)</span>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Anything you'd like the landlord to know…"
                  />
                </label>

                {/* Check Availability button */}
                <button
                  type="button"
                  className="tenant-booking-check-btn"
                  onClick={handleCheckAvailability}
                  disabled={checking || !moveInDate || !expectedEndDate}
                >
                  {checking ? (
                    <>
                      <Loader2 size={18} className="spin" /> Checking…
                    </>
                  ) : (
                    'Check Availability'
                  )}
                </button>

                {/* Overlap / availability result */}
                {overlapResult && (
                  <motion.div
                    className={`tenant-booking-availability ${
                      overlapResult.error
                        ? 'tenant-booking-availability--error'
                        : overlapResult.hasOverlap
                          ? 'tenant-booking-availability--overlap'
                          : 'tenant-booking-availability--ok'
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {overlapResult.error && (
                      <div>
                        <AlertTriangle size={18} />
                        <span>{overlapResult.error}</span>
                      </div>
                    )}

                    {overlapResult.hasOverlap && (
                      <div className="tenant-booking-availability-content">
                        <div className="tenant-booking-availability-header">
                          <AlertTriangle size={20} />
                          <strong>Date(s) already booked</strong>
                        </div>
                        <p>
                          The following existing application{overlapResult.conflictingBookings?.length > 1 ? 's' : ''} conflict with your selection:
                        </p>
                        <ul className="tenant-booking-conflicts">
                          {(overlapResult.conflictingBookings || []).map(
                            (b, i) => (
                              <li key={b?.id ?? i}>
                                <span className="tenant-booking-conflict-range">
                                  {b?.start_date || '—'} → {b?.end_date || '—'}
                                </span>
                                {b?.tenantName && (
                                  <span className="tenant-booking-conflict-tenant">
                                    {b.tenantName}
                                  </span>
                                )}
                                {b?.status && (
                                  <span className="tenant-booking-conflict-status">
                                    {b.status}
                                  </span>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {!overlapResult.hasOverlap && !overlapResult.error && (
                      <div className="tenant-booking-availability-content">
                        <CheckCircle2 size={20} />
                        <strong>Dates available!</strong>
                      </div>
                    )}

                    {/* Consent + submit – only once dates are confirmed free */}
                    {!overlapResult.hasOverlap && !overlapResult.error && (
                      <div className="tenant-booking-consent">
                        <label className="tenant-booking-checkbox">
                          <input
                            type="checkbox"
                            checked={pdpaConsent}
                            onChange={(e) => setPdpaConsent(e.target.checked)}
                          />
                          <span>I consent to my personal data being processed for this application, in accordance with the PDPA.</span>
                        </label>
                        <label className="tenant-booking-checkbox">
                          <input
                            type="checkbox"
                            checked={acknowledgement}
                            onChange={(e) => setAcknowledgement(e.target.checked)}
                          />
                          <span>I acknowledge that the information submitted in this application is accurate.</span>
                        </label>

                        <button
                          type="button"
                          className="tenant-booking-confirm-btn"
                          onClick={handleSubmitApplication}
                          disabled={submitting || !canSubmit}
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={18} className="spin" /> Submitting…
                            </>
                          ) : (
                            'Submit Application'
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TenantBookingModal;
