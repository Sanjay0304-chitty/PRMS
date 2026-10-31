import { useRef, useCallback, useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

const ELEMENT_SELECTOR_MAP = [
  { key: 'branding_site_name',          selector: '.wc-preview-brand' },
  { key: 'header_background_color',     selector: '.wc-preview-header' },
  { key: 'homepage_hero_title',         selector: '.wc-preview-hero h3' },
  { key: 'homepage_hero_subtitle',      selector: '.wc-preview-hero p' },
  { key: 'theme_primary_color',         selector: '.wc-preview-cta' },
  { key: 'homepage_about_title',        selector: '.wc-preview-about-title' },
  { key: 'homepage_about_description',  selector: '.wc-preview-about-desc' },
  { key: 'footer_background_color',     selector: '.wc-preview-footer' },
  { key: 'footer_copyright_text',       selector: '.wc-preview-footer' },
];

export default function ElementOverlay({ onInspect }) {
  const previewRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const { settings } = useSettings();

  /* Build a key -> label map for hover labels. */
  const keyLabelMap = useRef(new Map(ELEMENT_SELECTOR_MAP.map((s) => [s.key, s.key.replace(/_/g, ' ')])));

  /* Attach a global event listener inside the preview that highlights on hover. */
  const attachOverlay = useCallback(() => {
    const container = previewRef.current;
    if (!container) return;

    ELEMENT_SELECTOR_MAP.forEach(({ selector }) => {
      const els = container.querySelectorAll(selector);
      els.forEach((el) => {
        el.classList.add('wc-inspectable');
        el.addEventListener('pointerenter', (e) => {
          e.stopPropagation();
          setHovered(selector);
          const rect = el.getBoundingClientRect();
          setCursorX(rect.left);
          setCursorY(rect.top - container.getBoundingClientRect().top);
        });
        el.addEventListener('pointerleave', () => {
          setHovered(null);
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onInspect?.(selector);
        });
      });
    });
  }, [onInspect]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    attachOverlay();
    return () => {
      if (preview) {
        ELEMENT_SELECTOR_MAP.forEach(({ selector }) => {
          const els = preview.querySelectorAll(selector);
          els.forEach((el) => {
            el.classList.remove('wc-inspectable');
            el.removeEventListener('pointerenter', () => {});
            el.removeEventListener('pointerleave', () => {});
            el.removeEventListener('click', () => {});
          });
        });
      }
    };
  }, [settings, attachOverlay]);

  return (
    <div className="wc-element-overlay" ref={previewRef}>
      <style>{`
        .wc-inspectable {
          cursor: pointer !important;
          transition: outline 0.15s ease !important;
          outline-offset: 2px;
          position: relative;
        }
        .wc-inspectable:hover {
          outline: 2px dashed var(--primary-color, #3b82f6) !important;
          outline-offset: 2px;
        }
        .wc-hover-highlight {
          outline: 2px solid var(--primary-color, #3b82f6) !important;
          outline-offset: 2px;
          background: rgba(59, 130, 246, 0.08) !important;
          transition: all 0.15s ease !important;
        }
      `}</style>

      {hovered && (
        <div className="wc-hover-highlight"
             style={{
               position: 'absolute',
               top: cursorY,
               left: cursorX + 16,
               padding: '2px 8px',
               background: 'var(--primary-color, #3b82f6)',
               color: 'var(--on-primary, #fff)',
               borderRadius: 4,
               fontSize: '10px',
               zIndex: 5,
               pointerEvents: 'none',
               whiteSpace: 'nowrap',
               transform: 'translateY(-50%)',
             }}
        >
          <Eye size={9} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          <span>{hovered.replace('.wc-preview-', '').replace(' ', ' ')}</span>
        </div>
      )}
    </div>
  );
}
