import { useState, useEffect, useCallback, useRef } from 'react';
import { customizerApi } from '../api/customizer';
import { getFullUrl } from '../config/apiBaseUrl';
import { useAuth } from '../contexts/AuthContext';
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

const THEME_PRESETS = [
  {
    name: 'Default (Navy & Purple)',
    accent: '#8a2be2',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
  {
    name: 'Ruby Red',
    accent: '#ef4444',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
  {
    name: 'Royal Purple',
    accent: '#8a2be2',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
  {
    name: 'Ocean Blue',
    accent: '#2563eb',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
  {
    name: 'Emerald Green',
    accent: '#10b981',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
  {
    name: 'Sunset Orange',
    accent: '#f97316',
    body: '#f3f6fb',
    card: '#ffffff',
    header: '#0f172a',
    sidebar: '#0f172a',
    footer: '#0f172a',
  },
];

/* ── ColorInput ── */
function ColorInput({ label, hint, value, onChange, disabled }) {
  return (
    <div className="editor-field">
      <label>{label}</label>
      {hint && <span className="editor-field-hint">{hint}</span>}
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
function ColorsSection({ colors, onChange, onApplyPreset, disabled }) {
  const fields = [
    ['accent_color', 'Primary Accent Color', 'Buttons, active filter tabs, progress bars, highlights'],
    ['body_bg', 'Page Body Background', 'Background across all views (recommended: clean neutral #f3f6fb)'],
    ['card_bg', 'Card / Container Background', 'Background for property cards, tables, panels (default: #ffffff)'],
    ['header_bg', 'Header Background', 'Top navigation bar background'],
    ['sidebar_bg', 'Sidebar Background', 'Sidebar menu background'],
    ['footer_bg', 'Footer Background', 'Footer section background'],
  ];

  return (
    <div className="editor-section">
      <div className="preset-section">
        <div className="editor-section-title">Theme Presets</div>
        <div className="preset-grid">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="preset-btn"
              onClick={() => onApplyPreset(p)}
              disabled={disabled}
            >
              <span className="preset-dot" style={{ backgroundColor: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-section-title" style={{ marginTop: '8px' }}>Custom Palette</div>
      {fields.map(([k, l, hint]) => (
        <ColorInput
          key={k}
          label={l}
          hint={hint}
          value={colors[`light_${k}`] || DEFAULTS[`light_${k}`]}
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
  const accentColor = active.accent_color || '#8a2be2';
  const cardBg = active.card_bg || '#ffffff';
  const bodyBg = active.body_bg || '#f3f6fb';

  return (
    <div className="preview-area">
      <div className="preview-toolbar">
        <span>Live Preview — ☀️ Light Mode</span>
      </div>
      <div className="preview-iframe-wrapper">
        <div style={{
          backgroundColor: bodyBg,
          minHeight: '520px',
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
            justifyContent: 'space-between',
            borderBottom: `2px solid ${accentColor}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {logoSrc && <img src={logoSrc} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />}
              <span style={{ fontWeight: 700, fontSize: '18px', color: '#ffffff' }}>
                {config.company_name || 'PRMS'}
              </span>
            </div>
            <span style={{
              background: accentColor,
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              Portal
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
                  fontSize: 14, color: '#ffffff', opacity: i === 0 ? 1 : 0.6,
                  background: i === 0 ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                }}>{icon}</div>
              ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter Tabs Preview */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: accentColor,
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>All</span>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>Available</span>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>Rented</span>
              </div>

              {/* Sample Card Preview */}
              <div style={{
                backgroundColor: cardBg,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                    Modern Apartment in Downtown
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: accentColor,
                    color: '#ffffff',
                  }}>
                    Featured
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  RM 2,500 /mo · 2 Beds · 2 Baths
                </div>
                {/* Progress bar preview */}
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '75%', height: '100%', background: accentColor }} />
                </div>
                {/* Buttons row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: accentColor,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'default',
                  }}>
                    Manage Property
                  </span>
                  <span style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'default',
                  }}>
                    Export
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            backgroundColor: active.footer_bg,
            padding: '12px 24px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '12px',
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
  const { user } = useAuth();
  const canManageBranding = ['admin', 'landlord'].includes((user?.role || '').toLowerCase());
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
      setConfig({ ...DEFAULTS, ...body });
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

  const onApplyPreset = (preset) => {
    setConfig((p) => ({
      ...p,
      light_accent_color: preset.accent,
      light_body_bg: preset.body,
      light_card_bg: preset.card,
      light_header_bg: preset.header,
      light_sidebar_bg: preset.sidebar,
      light_footer_bg: preset.footer,
    }));
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
      const result = await customizerApi.resetConfig();
      const inherited = result?.data ?? result;
      setConfig({ ...DEFAULTS, ...inherited });
      origRef.current = { ...DEFAULTS, ...inherited };
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
        Your preferences apply only to your account. Only Light Mode can be customized here — Dark Mode keeps its built-in look.
      </p>

      {/* Body */}
      <div className="customizer-body">
        {/* Left: Preview */}
        <PreviewPanel config={config} key={previewKeyRef.current} />

        {/* Right: Editor */}
        <div className="editor-panel">
          {canManageBranding && (
            <>
              <BrandingSection
                company_name={config.company_name}
                logo_url={config.logo_url}
                onCompanyChange={onCompanyChange}
                onLogoUpload={onLogoUpload}
                onLogoRemove={onLogoRemove}
                disabled={saving}
              />
              <hr className="customizer-divider" />
            </>
          )}
          <ColorsSection
            colors={config}
            onChange={onColorChange}
            onApplyPreset={onApplyPreset}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}
