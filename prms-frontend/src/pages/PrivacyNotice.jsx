import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PRIVACY_NOTICE_SECTIONS, PRIVACY_NOTICE_VERSION } from '../config/legalContent';
import './LegalPage.css';

export default function PrivacyNotice() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <button type="button" className="legal-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="legal-page-header">
          <ShieldCheck size={28} />
          <div>
            <h1>Privacy Notice</h1>
            <p>Version {PRIVACY_NOTICE_VERSION} · How PRMS collects, uses and protects your personal data</p>
          </div>
        </div>

        <div className="legal-disclaimer">
          This system is designed to support good PDPA data-handling practice for a university
          project. It is an implementation checklist, not a certified legal compliance product.
        </div>

        {PRIVACY_NOTICE_SECTIONS.map((s) => (
          <section className="legal-section" key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
