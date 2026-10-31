import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Globe2 } from 'lucide-react';
import {
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_SECTIONS_BM,
  PRIVACY_NOTICE_VERSION,
} from '../config/legalContent';
import './LegalPage.css';

export default function PrivacyNotice() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en'); // 'en' | 'bm'

  const sections = lang === 'bm' ? PRIVACY_NOTICE_SECTIONS_BM : PRIVACY_NOTICE_SECTIONS;

  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button type="button" className="legal-back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 0 }}>
            <ArrowLeft size={16} /> Back
          </button>

          {/* Bilingual language switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '4px 8px', borderRadius: 20 }}>
            <Globe2 size={16} style={{ color: '#475569' }} />
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                border: 'none',
                background: lang === 'en' ? '#ffffff' : 'transparent',
                fontWeight: lang === 'en' ? 700 : 500,
                color: lang === 'en' ? '#0f172a' : '#64748b',
                padding: '4px 10px',
                borderRadius: 14,
                cursor: 'pointer',
                boxShadow: lang === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('bm')}
              style={{
                border: 'none',
                background: lang === 'bm' ? '#ffffff' : 'transparent',
                fontWeight: lang === 'bm' ? 700 : 500,
                color: lang === 'bm' ? '#0f172a' : '#64748b',
                padding: '4px 10px',
                borderRadius: 14,
                cursor: 'pointer',
                boxShadow: lang === 'bm' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Bahasa Malaysia
            </button>
          </div>
        </div>

        <div className="legal-page-header">
          <ShieldCheck size={28} />
          <div>
            <h1>{lang === 'bm' ? 'Notis Perlindungan Data Peribadi' : 'Personal Data Protection Notice'}</h1>
            <p>
              {lang === 'bm'
                ? `Versi ${PRIVACY_NOTICE_VERSION} · Cara PRMS mengumpul, memproses dan melindungi data peribadi anda di bawah APDP 2010`
                : `Version ${PRIVACY_NOTICE_VERSION} · How PRMS collects, processes and protects your personal data under Malaysia PDPA 2010`}
            </p>
          </div>
        </div>

        <div className="legal-disclaimer">
          {lang === 'bm'
            ? 'Notis ini disediakan mengikut peruntukan Seksyen 7(3) Akta Perlindungan Data Peribadi 2010 (APDP) dalam kedua-dua Bahasa Kebangsaan dan Bahasa Inggeris.'
            : 'This Personal Data Protection Notice is provided in accordance with Section 7(3) of the Personal Data Protection Act 2010 (PDPA) in both the National Language and English.'}
        </div>

        {sections.map((s) => (
          <section className="legal-section" key={s.title}>
            <h2>{s.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
