import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Download, Mail } from 'lucide-react';
import { privacyApi, adminApi } from '../api';
import './SharedPageShell.css';
import './PrivacyPersonalData.css';

const REQUEST_TYPES = [
  { value: 'ACCESS', label: 'Access my data', hint: 'Get a copy of the personal data PRMS holds about you.' },
  { value: 'CORRECTION', label: 'Correct my data', hint: 'Ask us to fix inaccurate or outdated information.' },
  { value: 'DELETION', label: 'Delete my account', hint: 'Request permanent removal of your account and personal data.' },
];

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PrivacyPersonalData() {
  const [consents, setConsents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [storedData, setStoredData] = useState(null);
  const [showStoredData, setShowStoredData] = useState(false);
  const [privacyContact, setPrivacyContact] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [requestType, setRequestType] = useState('ACCESS');
  const [requestDetails, setRequestDetails] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [consentsRes, requestsRes, publicSettingsRes] = await Promise.all([
        privacyApi.myConsents(),
        privacyApi.myRequests(),
        adminApi.getPublicSettings().catch(() => ({ data: { data: [] } })),
      ]);
      setConsents(consentsRes.data?.data || []);
      setRequests(requestsRes.data?.data || []);
      const settings = publicSettingsRes.data?.data || [];
      setPrivacyContact({
        name: settings.find((s) => s.key === 'privacy_officer_name')?.value || '',
        email: settings.find((s) => s.key === 'privacy_officer_email')?.value || '',
      });
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const marketingConsent = consents.find((c) => c.type === 'MARKETING' && !c.withdrawnAt);

  async function handleWithdrawMarketing() {
    if (!marketingConsent) return;
    setNotice('');
    setError('');
    try {
      await privacyApi.withdrawConsent(marketingConsent.id);
      setNotice('Marketing consent withdrawn.');
      await load();
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to withdraw consent'); }
  }

  async function handleViewStoredData() {
    setError('');
    try {
      const res = await privacyApi.myStoredData();
      setStoredData(res.data?.data);
      setShowStoredData(true);
    } catch (e) { setError(e.response?.data?.error?.message || 'Failed to load your stored data'); }
  }

  function handleDownloadStoredData() {
    if (!storedData) return;
    const blob = new Blob([JSON.stringify(storedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-prms-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    setNotice('');
    setError('');
    try {
      await privacyApi.submitRequest({ type: requestType, details: requestDetails || undefined });
      setNotice('Your request has been submitted. Track its status below.');
      setRequestDetails('');
      await load();
    } catch (e2) { setError(e2.response?.data?.error?.message || 'Failed to submit request'); }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Privacy & Personal Data</h1>
        <p>View, correct or delete your personal data, and manage your consent choices.</p>
      </div>

      {error && <div className="alert alert-danger mt-2">{error}</div>}
      {notice && <div className="ppd-notice">{notice}</div>}

      {loading ? <p>Loading...</p> : (
        <>
          {/* My stored data */}
          <div className="card-table ppd-section">
            <h2 className="ppd-section-title"><ShieldCheck size={18} /> My Stored Data</h2>
            <p className="ppd-section-hint">See exactly what personal data PRMS holds about you.</p>
            {!showStoredData ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={handleViewStoredData}>View My Data</button>
            ) : (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadStoredData}>
                  <Download size={14} style={{ marginRight: 6 }} /> Download as JSON
                </button>
                <pre className="ppd-data-dump">{JSON.stringify(storedData, null, 2)}</pre>
              </>
            )}
          </div>

          {/* Consent preferences */}
          <div className="card-table ppd-section">
            <h2 className="ppd-section-title">Consent Preferences</h2>
            <div className="ppd-consent-row">
              <div>
                <strong>Marketing communications</strong>
                <p className="ppd-section-hint">Optional — new listings, offers and newsletters.</p>
              </div>
              {marketingConsent ? (
                <button type="button" className="btn btn-sm btn-danger" onClick={handleWithdrawMarketing}>Withdraw</button>
              ) : (
                <span className="ppd-status-off">Not opted in</span>
              )}
            </div>
            <table className="table ppd-consent-history">
              <thead><tr><th>Type</th><th>Choice</th><th>Version</th><th>Date</th><th>Withdrawn</th></tr></thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.id}>
                    <td>{c.type}</td>
                    <td>{c.consented ? 'Consented' : 'Declined'}</td>
                    <td>{c.version}</td>
                    <td>{formatDateTime(c.consentedAt)}</td>
                    <td>{c.withdrawnAt ? formatDateTime(c.withdrawnAt) : '—'}</td>
                  </tr>
                ))}
                {!consents.length && <tr><td colSpan={5}>No consent records yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Submit a request */}
          <div className="card-table ppd-section">
            <h2 className="ppd-section-title">Submit a Request</h2>
            <form onSubmit={handleSubmitRequest} className="ppd-request-form">
              <div className="ppd-request-types">
                {REQUEST_TYPES.map((t) => (
                  <label key={t.value} className={`ppd-request-type ${requestType === t.value ? 'active' : ''}`}>
                    <input type="radio" name="requestType" value={t.value} checked={requestType === t.value} onChange={() => setRequestType(t.value)} />
                    <div>
                      <strong>{t.label}</strong>
                      <p>{t.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Optional details (e.g. what needs correcting)…"
                value={requestDetails}
                onChange={(e) => setRequestDetails(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Submit Request</button>
            </form>
          </div>

          {/* Track requests */}
          <div className="card-table ppd-section">
            <h2 className="ppd-section-title">My Requests</h2>
            <table className="table">
              <thead><tr><th>Type</th><th>Status</th><th>Submitted</th><th>Decision</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.type}</td>
                    <td><span className={`shell-status-badge status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                    <td>{formatDateTime(r.submitted_at)}</td>
                    <td>{r.decisionReason || '—'}</td>
                  </tr>
                ))}
                {!requests.length && <tr><td colSpan={4}>No requests submitted yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Privacy contact */}
          <div className="card-table ppd-section">
            <h2 className="ppd-section-title"><Mail size={18} /> Contact the Privacy Officer</h2>
            {privacyContact.email ? (
              <p>{privacyContact.name || 'Privacy Officer'} — <a href={`mailto:${privacyContact.email}`}>{privacyContact.email}</a></p>
            ) : (
              <p className="ppd-section-hint">No privacy contact has been configured yet. Use the request form above in the meantime.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
