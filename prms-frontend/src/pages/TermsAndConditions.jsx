import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { TERMS_SECTIONS, TERMS_VERSION } from '../config/legalContent';
import './LegalPage.css';

export default function TermsAndConditions() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <button type="button" className="legal-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="legal-page-header">
          <FileText size={28} />
          <div>
            <h1>Terms and Conditions</h1>
            <p>Version {TERMS_VERSION} · The rules for using PRMS</p>
          </div>
        </div>

        {TERMS_SECTIONS.map((s) => (
          <section className="legal-section" key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
