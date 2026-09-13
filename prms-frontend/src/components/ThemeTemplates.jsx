import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Download, Upload, FileJson } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Preset definitions — flat key/value objects covering all categories */
/* ------------------------------------------------------------------ */
const PRESETS = [
  {
    id: 'professional',
    name: 'Corporate Professional',
    desc: 'Trustworthy blues and clean typography for enterprise.',
    settings: {
      theme_primary_color: '#2563eb',
      theme_secondary_color: '#1e293b',
      branding_site_name: '',
      header_background_color: '#ffffff',
      homepage_hero_title: 'Find Your Perfect Space',
      homepage_hero_subtitle: 'Discover verified listings with confidence',
      homepage_hero_button_text: 'Explore Now',
      homepage_hero_text_alignment: 'left',
      homepage_about_title: 'Who We Are',
      homepage_about_description:
        'We connect property owners and tenants through a secure, transparent platform.',
      homepage_about_text_alignment: 'centered',
      footer_background_color: '#0f172a',
      footer_copyright_text: '© 2024 Your Company. All rights reserved.',
      homepage_show_hero: true,
      homepage_show_search_bar: true,
      homepage_show_featured: true,
      homepage_show_features: true,
      homepage_show_testimonials: true,
      homepage_show_cta: true,
      homepage_show_about: true,
    },
  },
  {
    id: 'startup',
    name: 'Startup Modern',
    desc: 'Vibrant gradient and minimal layout for modern SaaS.',
    settings: {
      theme_primary_color: '#8b5cf6',
      theme_secondary_color: '#0f172a',
      branding_site_name: '',
      header_background_color: '#ffffff',
      homepage_hero_title: 'Build Smarter.',
      homepage_hero_subtitle: 'The modern way to manage your properties.',
      homepage_hero_button_text: 'Get Started',
      homepage_hero_text_alignment: 'centered',
      homepage_about_title: 'Our Story',
      homepage_about_description:
        'Bootstrapped by founders who believed technology could make property management effortless.',
      homepage_about_text_alignment: 'centered',
      footer_background_color: '#111827',
      footer_copyright_text: '© 2024 Startup Inc.',
      homepage_show_hero: true,
      homepage_show_search_bar: true,
      homepage_show_featured: true,
      homepage_show_features: true,
      homepage_show_testimonials: true,
      homepage_show_cta: true,
      homepage_show_about: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    desc: 'Clean, spacious, black & white.',
    settings: {
      theme_primary_color: '#000000',
      theme_secondary_color: '#f5f5f5',
      branding_site_name: '',
      header_background_color: '#ffffff',
      homepage_hero_title: 'Simplicity.',
      homepage_hero_subtitle: 'We remove the noise so you can focus.',
      homepage_hero_button_text: 'Learn More',
      homepage_hero_text_alignment: 'left',
      homepage_about_title: '',
      homepage_about_description:
        'Less is more. Our design philosophy puts content first and everything else in its place.',
      homepage_about_text_alignment: 'left',
      footer_background_color: '#ffffff',
      footer_copyright_text: '© 2024',
      homepage_show_hero: true,
      homepage_show_search_bar: true,
      homepage_show_featured: true,
      homepage_show_features: true,
      homepage_show_testimonials: false,
      homepage_show_cta: true,
      homepage_show_about: true,
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    desc: 'Full dark palette for a premium feel.',
    settings: {
      theme_primary_color: '#38bdf8',
      theme_secondary_color: '#0f172a',
      branding_site_name: '',
      header_background_color: '#0f172a',
      homepage_hero_title: 'Explore in Style',
      homepage_hero_subtitle: 'Premium listings, premium experience.',
      homepage_hero_button_text: 'Discover',
      homepage_hero_text_alignment: 'centered',
      homepage_about_title: 'About',
      homepage_about_description:
        'Dark mode by default, designed to reduce eye strain and look stunning.',
      homepage_about_text_alignment: 'centered',
      footer_background_color: '#020617',
      footer_copyright_text: '© 2024 — All rights reserved.',
      homepage_show_hero: true,
      homepage_show_search_bar: true,
      homepage_show_featured: true,
      homepage_show_features: true,
      homepage_show_testimonials: true,
      homepage_show_cta: true,
      homepage_show_about: true,
    },
  },
  {
    id: 'bold',
    name: 'Bold & Colorful',
    desc: 'High-saturation palette, big buttons.',
    settings: {
      theme_primary_color: '#ef4444',
      theme_secondary_color: '#111827',
      branding_site_name: '',
      header_background_color: '#fef2f2',
      homepage_hero_title: 'Ready for Something Bold?',
      homepage_hero_subtitle: 'Stand out with colors that pop.',
      homepage_hero_button_text: 'Get Started',
      homepage_hero_text_alignment: 'left',
      homepage_about_title: 'The Bold Approach',
      homepage_about_description:
        'We believe design should be memorable. Go bold or go home.',
      homepage_about_text_alignment: 'centered',
      footer_background_color: '#111827',
      footer_copyright_text: '© 2024 — Bold Theme',
      homepage_show_hero: true,
      homepage_show_search_bar: true,
      homepage_show_featured: true,
      homepage_show_features: true,
      homepage_show_testimonials: true,
      homepage_show_cta: true,
      homepage_show_about: true,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */
export default function ThemeTemplates({ onApply, onExport, onImport }) {
  const [expanded, setExpanded] = useState(false);
  const [appliedId, setAppliedId] = useState(null);

  const handleApply = (preset) => {
    onApply(preset);
    setAppliedId(preset.id);
  };

  return (
    <div style={{
      padding: '8px 24px 16px',
      borderTop: '1px solid #e5e7eb',
    }}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: '12px',
          color: '#475569',
          width: '100%',
        }}
      >
        <Palette size={14} />
        Preset Templates ({PRESETS.length})
      </button>

      {/* Cards grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
              marginTop: 8,
            }}
          >
            {PRESETS.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => handleApply(p)}
                whileTap={{ scale: 0.97 }}
                style={{
                  border: appliedId === p.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px',
                  background: appliedId === p.id ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: p.settings.theme_primary_color,
                }} />
                <strong style={{ fontSize: '11px', color: '#111827' }}>{p.name}</strong>
                <span style={{
                  fontSize: '10px',
                  color: '#64748b',
                }}>{p.desc}</span>
                {appliedId === p.id && (
                  <Check size={14} style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#2563eb',
                  }} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export / Import */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 8,
      }}>
        <button type="button" onClick={onExport} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', background: '#f8fafc', border: '1px solid #d1d5db',
          borderRadius: 6, fontSize: '10px', color: '#475569', cursor: 'pointer',
        }}>
          <Download size={12} />
          Export JSON
        </button>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', background: '#f8fafc', border: '1px solid #d1d5db',
          borderRadius: 6, fontSize: '10px', color: '#475569', cursor: 'pointer',
        }}>
          <Upload size={12} />
          Import JSON
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = (ev) => {
                try {
                  const j = JSON.parse(ev.target.result);
                  onImport(j);
                } catch {
                  alert('Invalid JSON file.');
                }
              };
              r.readAsText(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}
