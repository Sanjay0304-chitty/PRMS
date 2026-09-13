import { useSettings } from '../contexts/SettingsContext';
import { getImageUrl } from '../config/imageHelper';

export default function LivePreviewPanel({ onElementClick }) {
  const { settings } = useSettings();

  /* flatten settings to key -> value map */
  const mapSettings = (items) => {
    if (!items) return {};
    if (Array.isArray(items)) {
      const out = {};
      items.forEach((s) => { out[s.key] = s?.value ?? ''; });
      return out;
    }
    return items;
  };

  const s = mapSettings(settings);

  /* ---- settings with defaults matching seed_settings.ts ---- */
  const primary = s.theme_primary_color || '#8a2be2';
  const secondary = s.theme_secondary_color || '#0f172a';
  const bgColor = s.theme_background_color || '#f3f6fb';
  const textColor = s.theme_text_color || '#111827';
  const heroTitle = s.homepage_hero_title || 'Welcome to PRMS';
  const heroSubtitle = s.homepage_hero_subtitle || 'Your property management solution';
  const heroCta = s.homepage_hero_button_text || 'Get Started';
  const heroTextAlign = s.homepage_hero_text_alignment || 'center';
  const heroBgColor = s.homepage_hero_background_color || primary;
  const headerBg = s.header_background_color || '#ffffff';
  const headerColor = s.header_text_color || '#111827';
  const footerBg = s.footer_background_color || '#F3F4F6';
  const footerColor = s.footer_text_color || '#6B7280';
  const footerText = s.footer_copyright_text || `© ${new Date().getFullYear()} PRMS. All rights reserved.`;
  const siteName = s.branding_site_name || 'PRMS';
  const logoUrl = s.branding_logo_url ? getImageUrl(s.branding_logo_url) : '';
  const showLogo = (s.header_show_logo !== false && s.header_show_logo !== 'false') || s.header_show_logo === 'true';

  /* Section visibility toggles */
  const showHero = s.homepage_show_hero !== 'false';
  const showSearchBar = s.homepage_show_search_bar !== 'false';
  const showFeatured = s.homepage_show_featured !== 'false';
  const showFeatures = s.homepage_show_features !== 'false';
  const showTestimonials = s.homepage_show_testimonials !== 'false';
  const showCta = s.homepage_show_cta !== 'false';
  const showAbout = s.homepage_show_about !== 'false';

  /* About section */
  const aboutTitle = s.homepage_about_title || 'About Us';
  const aboutDesc = s.homepage_about_description || '';
  const aboutAlign = s.homepage_about_alignment || 'left';

  /* Gradient */
  const gradientEnabled = s.theme_gradient_enabled === 'true';
  const gradientDirection = s.theme_gradient_direction || '135deg';

  const gradientStyle = gradientEnabled ? {
    background: `linear-gradient(${gradientDirection}, ${primary}, ${secondary})`
  } : {};

  return (
    <div
      className="wc-preview"
      style={{ backgroundColor: bgColor, ...gradientStyle }}
    >
      {/* Header */}
      <div
        className="wc-preview-header"
        style={{ background: headerBg, color: headerColor, cursor: 'pointer' }}
        onClick={() => onElementClick?.('header_background_color')}
      >
        {showLogo && logoUrl && (
          <img src={logoUrl} alt="Logo" className="wc-preview-logo" />
        )}
        <span className="wc-preview-brand" style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onElementClick?.('branding_site_name'); }}>
          {siteName}
        </span>
      </div>

      {/* Hero Section */}
      {showHero && (
        <div
          className="wc-preview-hero"
          style={{
            textAlign: heroTextAlign,
            background: heroBgColor,
            cursor: 'pointer',
          }}
          onClick={() => onElementClick?.('homepage_hero_background_color')}
        >
          <h3 style={{ color: textColor, cursor: 'pointer' }}
             onClick={(e) => { e.stopPropagation(); onElementClick?.('homepage_hero_title'); }}>
            {heroTitle}
          </h3>
          <p style={{ color: textColor, opacity: 0.8, cursor: 'pointer' }}
             onClick={(e) => { e.stopPropagation(); onElementClick?.('homepage_hero_subtitle'); }}>
            {heroSubtitle}
          </p>
          <button className="wc-preview-cta" style={{ background: primary, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onElementClick?.('homepage_hero_button_text'); }}>
            {heroCta}
          </button>
        </div>
      )}

      {/* Search Bar */}
      {showSearchBar && (
        <div style={{ padding: '12px 16px', background: 'var(--card-bg, #fff)', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
          <input placeholder="Search properties..." style={{
            flex: 1, padding: '6px 10px', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 6, fontSize: '11px', outline: 'none'
          }} readOnly />
          <button style={{
            padding: '6px 12px', background: primary, color: 'var(--on-primary, #fff)', border: 'none', borderRadius: 6, fontSize: '10px'
          }}>Search</button>
        </div>
      )}

      {/* Featured Properties */}
      {showFeatured && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: textColor, marginBottom: 8 }}>Featured Properties</div>
          <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                flex: '1', minWidth: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color, #e5e7eb)'
              }}>
                <div style={{ height: 40, background: `linear-gradient(135deg, ${primary}33, ${secondary}33)`, width: '100%' }} />
                <div style={{ padding: '4px 6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: textColor }}>Property {i}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text-secondary, #6b7280)' }}>RM 2,400/mo</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Highlights */}
      {showFeatures && (
        <div style={{ padding: '12px 16px', background: 'var(--card-bg, #fff)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: textColor, marginBottom: 8, textAlign: 'center' }}>Platform Features</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {['Payments', 'Maintenance', 'Messaging'].map((f) => (
              <div key={f} style={{
                padding: '4px 8px', background: `${primary}15`, borderRadius: 4, fontSize: '8px', color: primary, fontWeight: 600
              }}>{f}</div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {showTestimonials && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: textColor, marginBottom: 6 }}>What Our Tenants Say</div>
          <div style={{
            padding: 8, background: 'var(--card-bg, #fff)', borderRadius: 8, borderLeft: `3px solid ${primary}`, fontSize: '9px', color: 'var(--text-secondary, #4b5563)', fontStyle: 'italic'
          }}>
            &ldquo;Great platform for managing my rental property. Highly recommended!&rdquo;
          </div>
        </div>
      )}

      {/* CTA Section */}
      {showCta && (
        <div style={{
          padding: '12px 16px', background: primary, color: 'var(--on-primary, #fff)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700 }}>Ready to Get Started?</div>
          <button style={{
            padding: '4px 12px', background: 'var(--card-bg, #fff)', color: primary, border: 'none', borderRadius: 6, fontSize: '9px', fontWeight: 600
          }}>Contact Us</button>
        </div>
      )}

      {/* About Section */}
      {showAbout && (
        <div style={{ padding: '12px 16px', textAlign: aboutAlign, background: '#fff', cursor: 'pointer' }}
             className="wc-preview-about"
             onClick={() => onElementClick?.('homepage_about_title')}>
          <div className="wc-preview-about-title" style={{ fontSize: '11px', fontWeight: 700, color: textColor, marginBottom: 4 }}>{aboutTitle}</div>
          <div className="wc-preview-about-desc" style={{ fontSize: '9px', color: '#6b7280', lineHeight: 1.4, cursor: 'pointer' }}
               onClick={(e) => { e.stopPropagation(); onElementClick?.('homepage_about_description'); }}>{aboutDesc}</div>
        </div>
      )}

      {/* Footer */}
      <div
        className="wc-preview-footer"
        style={{ background: footerBg, color: footerColor, cursor: 'pointer' }}
        onClick={() => onElementClick?.('footer_background_color')}
      >
        <span style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onElementClick?.('footer_copyright_text'); }}>
          {footerText}
        </span>
      </div>
    </div>
  );
}
