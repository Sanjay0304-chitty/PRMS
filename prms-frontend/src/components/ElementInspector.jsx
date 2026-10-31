import { useState, useCallback, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Info, X } from 'lucide-react';

/* Maps preview element labels to the setting key that controls them. */
const ELEMENT_MAP = [
  { label: 'Brand Name',            key: 'branding_site_name',            section: 'branding' },
  { label: 'Primary Color',         key: 'theme_primary_color',           section: 'theme' },
  { label: 'Header Background',     key: 'header_background_color',       section: 'header' },
  { label: 'Hero Text Color',       key: 'theme_text_color',              section: 'theme' },
  { label: 'Hero Title',            key: 'homepage_hero_title',           section: 'home' },
  { label: 'Hero Subtitle',         key: 'homepage_hero_subtitle',        section: 'home' },
  { label: 'Hero CTA Button',       key: 'homepage_hero_button_text',     section: 'home' },
  { label: 'CTA Button Color',      key: 'theme_primary_color',           section: 'theme' },
  { label: 'Section Card',          key: 'theme_border_radius',           section: 'theme' },
  { label: 'Card Font',             key: 'theme_font_family',             section: 'theme' },
  { label: 'Card Weight',           key: 'theme_font_weight',             section: 'theme' },
  { label: 'About Title',           key: 'homepage_about_title',          section: 'home' },
  { label: 'About Description',     key: 'homepage_about_description',    section: 'home' },
  { label: 'Footer Background',     key: 'footer_background_color',       section: 'footer' },
  { label: 'Footer Text',           key: 'footer_text_color',             section: 'footer' },
  { label: 'Footer Copyright',      key: 'footer_copyright_text',         section: 'footer' },
];

export default function ElementInspector({ onInspect, onClose }) {
  const { settings } = useSettings();
  const [hoveredKey, setHoveredKey] = useState(null);

  const flatSettings = useMemo(() => {
    if (!settings) return {};
    if (Array.isArray(settings)) {
      const out = {};
      settings.forEach((s) => { out[s.key] = s?.value ?? ''; });
      return out;
    }
    return settings;
  }, [settings]);

  /* Build an index from element key -> label for quick look up. */
  const keyToLabel = useMemo(() => {
    const map = {};
    ELEMENT_MAP.forEach((e) => {
      map[e.key] = e.label;
    });
    return map;
  }, []);

  /* Called by the preview overlay when the user hovers an element. */
  const onHover = useCallback((key) => {
    setHoveredKey(key);
    onInspect?.(key);
  }, [onInspect]);

  /* Show the currently hovered element info. */
  const current = hoveredKey
    ? { label: keyToLabel[hoveredKey] || hoveredKey, value: flatSettings[hoveredKey] ?? '' }
    : null;

  return (
    <div className="wc-inspector">
      <div className="wc-inspector-toolbar" style={{
        background: 'var(--sidebar-bg, #1e293b)',
        color: 'var(--sidebar-text, #f8fafc)',
        fontWeight: 600,
        fontSize: '10px',
        letterSpacing: '0.05em',
        padding: '12px 16px',
        border: '3px solid var(--primary-color, #3b82f6)',
        borderRadius: 12,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        <Wand2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        <span>Element Inspector — Click a preview element to inspect &amp; edit it</span>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            key={`inspect-${hoveredKey}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="wc-inspector-panel"
            style={{
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: 10,
              padding: '12px 14px',
              background: 'var(--card-bg, #f9fafb)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: '12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Info size={14} style={{ color: 'var(--primary-color, #3b82f6)' }} />
                <span>{current.label}</span>
              </div>
              <button
                type="button"
                title="Close inspector"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary-light, #64748b)' }}>Key:</span> <code style={{
                background: 'var(--border-color, #e5e7eb)',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: '10px',
              }}>{hoveredKey}</code>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary-light, #64748b)' }}>Value:</span> <code style={{
                background: 'var(--border-color, #e5e7eb)',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: '10px',
                color: primaryColor(),
              }}>{current.value}</code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!current && (
        <div style={{
          padding: '12px',
          textAlign: 'center',
          color: 'var(--text-secondary-light, #9ca3af)',
          fontSize: '10px',
          fontStyle: 'italic',
        }}>
          Hover over the preview to inspect elements
        </div>
      )}
    </div>
  );
}

function primaryColor() {
  return 'var(--primary-color, #3b82f6)';
}
