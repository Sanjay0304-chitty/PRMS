import { useState, useEffect, useCallback, useRef } from 'react';
import { customizerApi } from '../api/customizer';
import { getFullUrl } from '../config/apiBaseUrl';
import './WebsiteCustomizer.css';

/* ── defaults ──
   Only Light Mode is customizable - Dark Mode always keeps the app's own
   built-in dark styling, so there are no dark_* fields here.

   These match the app's actual built-in navy/purple branding (styles.css's
   :root tokens), not an arbitrary placeholder theme - an account that
   never touches the customizer, or hits Reset, should look exactly like
   the app always did rather than switching to some other default look. */
const DEFAULTS = {
  company_name: 'PRMS',
  logo_url: '',
  light_header_bg: '#0f172a',
  light_sidebar_bg: '#0f172a',
  light_body_bg: '#f3f6fb',
  light_footer_bg: '#0f172a',
  light_accent_color: '#8a2be2',
  light_card_bg: '#ffffff',
};

/* ── ColorInput ── */
function ColorInput({ label, value, onChange, disabled }) {
  return (
    <div className="editor-field">
      <label>{label}</label>
      <div className="color-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    </div>
  );
}

/* ── Branding ── */
function BrandingSection({ company_name, logo_url, onCompanyChange, onLogoUpload, onLogoRemove, disabled }) {
  const fileRef = useRef(null);

  return (
    <div className="editor-section">
      <div className="editor-section-title">Branding</div>
      <div className="editor-field">
        <label>Company Name</label>
        <input type="text" value={company_name} onChange={(e) => onCompanyChange(e.target.value)} disabled={disabled} maxLength={128} placeholder="PRMS" />
      </div>
      <div className="editor-field">
        <label>Logo</label>
        <div className="logo-area">
          {logo_url ? (
            <img className="logo-preview-img" src={getFullUrl(logo_url)} alt="Logo" />
          ) : (
            <div className="logo-placeholder">No logo</div>
          )}
          <div className="logo-buttons">
            <label>
              Upload
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onLogoUpload(e.target.files[0])} disabled={disabled} />
            </label>
            <button className="remove-btn" type="button" onClick={() => onLogoRemove()} disabled={disabled || !logo_url}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Colors section ── */
function ColorsSection({ colors, onChange, disabled }) {
  const fields = [
    ['header_bg', 'Header Background'],
    ['sidebar_bg', 'Sidebar Background'],
    ['body_bg', 'Body Background'],
    ['card_bg', 'Card / Element Background'],
    ['footer_bg', 'Footer Background'],
    ['accent_color', 'Accent / Attention Color'],
  ];
  return (
    <div className="editor-section">
      {fields.map(([k, l]) => (
        <ColorInput
          key={k}
          label={l}
          value={colors[`light_${k}`]}
          onChange={(v) => onChange(`light_${k}`, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

/* ── Preview (rendered inline) ── */
function PreviewPanel({ config }) {
  const active = { ...pick(DEFAULTS, 'light_'), ...pick(config, 'light_') };

  const logoSrc = config.logo_url ? getFullUrl(config.logo_url) : null;

  return (
    <div className="preview-area">
      <div className="preview-toolbar">
        <span>Live Preview — ☀️ Light Mode</span>
      </div>
      <div className="preview-iframe-wrapper">
        <div style={{
          backgroundColor: active.body_bg || '#f9fafb',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          color: '#111827',
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: active.header_bg,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: `2px solid ${active.accent_color}`,
          }}>
            {logoSrc && <img src={logoSrc} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />}
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#111827' }}>
              {config.company_name || 'PRMS'}
            </span>
          </div>
          {/* Sidebar + Body */}
          <div style={{ flex: 1, display: 'flex' }}>
            {/* Sidebar Preview */}
            <div style={{
              width: '60px',
              backgroundColor: active.sidebar_bg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '16px',
              gap: '8px',
              borderRight: '1px solid #e2e8f0',
            }}>
              {['🏠','🏢','📋','👤'].map((icon, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, opacity: 0.7,
                }}>{icon}</div>
              ))}
            </div>
            {/* Body */}
            <div style={{ flex: 1, padding: '32px 24px', textAlign: 'center' }}>
            <h2 style={{ color: active.accent_color, marginBottom: 8, fontSize: '28px' }}>
              {config.company_name || 'PRMS'}
            </h2>
            <p style={{ maxWidth: 500, margin: '0 auto', fontSize: '15px', opacity: 0.8 }}>
              Property Rental Management System
            </p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <span style={{
                padding: '8px 24px',
                borderRadius: 8,
                background: active.accent_color,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
              }}>
                Browse Properties
              </span>
              <span style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: `1px solid ${active.accent_color}`,
                color: active.accent_color,
                fontWeight: 600,
                fontSize: 14,
              }}>
                Contact Us
              </span>
            </div>
          </div>
          </div>
          {/* Footer */}
          <div style={{
            backgroundColor: active.footer_bg,
            padding: '16px 24px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '13px',
          }}>
            © {new Date().getFullYear()} {config.company_name || 'PRMS'} — Property Rental Management System
          </div>
        </div>
      </div>
    </div>
  );
}

/* helper */
function pick(obj, prefix) {
  const r = {};
  Object.keys(obj).filter((kk) => kk.startsWith(prefix)).forEach((kk) => {
    r[kk.replace(prefix, '')] = obj[kk];
  });
  return r;
}

/* ── Main ── */
export default function WebsiteCustomizer() {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [dirty, setDirty] = useState(false);
  const previewKeyRef = useRef(0);
  const origRef = useRef(null);

  /* load */
  const loadConfig = useCallback(async () => {
    try {
      const res = await customizerApi.getConfig();
      const body = res?.data ?? res;
      setConfig((prev) => ({ ...DEFAULTS, ...body }));
      origRef.current = { ...DEFAULTS, ...body };
      setDirty(false);
    } catch (err) {
      setStatus({ type: 'error', msg: `Load failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  /* change handlers */
  const onCompanyChange = (v) => {
    setConfig((p) => ({ ...p, company_name: v }));
    setDirty(true);
  };

  const onColorChange = (field, value) => {
    setConfig((p) => ({ ...p, [field]: value }));
    setDirty(true);
    previewKeyRef.current++;
  };

  const onLogoUpload = async (file) => {
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const data = await customizerApi.uploadLogo(fd);
      setConfig((p) => ({ ...p, logo_url: data?.data?.logo_url ?? data.logo_url }));
      setDirty(true);
      setStatus({ type: 'success', msg: 'Logo uploaded successfully.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const onLogoRemove = async () => {
    setSaving(true);
    try {
      await customizerApi.removeLogo();
      setConfig((p) => ({ ...p, logo_url: '' }));
      setDirty(true);
      setStatus({ type: 'success', msg: 'Logo removed.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* save */
  const handleSave = async () => {
    setSaving(true);
    previewKeyRef.current++;
    try {
      await customizerApi.updateConfig(config);
      origRef.current = { ...config };
      setDirty(false);
      setStatus({ type: 'success', msg: 'Changes saved. Refreshing...' });
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* reset */
  const handleReset = async () => {
    setSaving(true);
    try {
      await customizerApi.updateConfig(DEFAULTS);
      setConfig((p) => ({ ...p, ...DEFAULTS }));
      origRef.current = { ...origRef.current, ...DEFAULTS };
      setDirty(false);
      setStatus({ type: 'success', msg: 'Reset to defaults. Refreshing...' });
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customizer-loading">
        <div className="spinner" />
        <span>Loading customizer...</span>
      </div>
    );
  }

  return (
    <div className="customizer-page">
      {/* Header */}
      <div className="customizer-header">
        <h1>System Preferences</h1>
        <div className="customizer-actions">
          <button type="button" onClick={handleReset} disabled={saving}>Reset</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className={`status-bar ${status.type}`}>
          <span>{status.msg}</span>
          <button className="close-btn" type="button" onClick={() => setStatus(null)}>✕</button>
        </div>
      )}

      <p className="customizer-hint">
        Only Light Mode can be customized here — Dark Mode always keeps its own built-in look.
      </p>

      {/* Body */}
      <div className="customizer-body">
        {/* Left: Preview */}
        <PreviewPanel config={config} key={previewKeyRef.current} />

        {/* Right: Editor */}
        <div className="editor-panel">
          <BrandingSection
            company_name={config.company_name}
            logo_url={config.logo_url}
            onCompanyChange={onCompanyChange}
            onLogoUpload={onLogoUpload}
            onLogoRemove={onLogoRemove}
            disabled={saving}
          />
          <hr className="customizer-divider" />
          <ColorsSection
            colors={config}
            onChange={onColorChange}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}
