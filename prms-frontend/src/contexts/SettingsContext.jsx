import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../api/admin';
import { getImageUrl } from '../config/imageHelper';

const SettingsContext = createContext(null);

/* Key -> CSS variable mapping for theme injection on <html>.
   --header-background-color, --footer-background-color, --primary-color,
   --accent-color and --background-color are deliberately NOT mapped here
   even though matching settings keys exist (theme_primary_color,
   theme_accent_color, theme_background_color, header_background_color,
   footer_background_color) - BrandingContext (the Website Customizer) owns
   those same CSS variables globally now. Painting them from both places
   was a real race condition: whichever context's async fetch resolved
   last silently overwrote the other's colors, which is what made the
   customizer's colors look like they randomly reverted on theme toggle. */
const THEME_VARIABLE_MAP = {
  theme_secondary_color:     '--secondary-color',
  theme_text_color:          '--text-color',
  theme_font_family:         '--font-family',
  theme_border_radius:       '--border-radius',
  theme_font_weight:         '--font-weight',
  theme_letter_spacing:      '--letter-spacing',
  theme_font_size_base:      '--font-size-base',
  theme_line_height:         '--line-height',
  theme_gradient_enabled:    '--gradient-enabled',
  theme_gradient_direction:  '--gradient-direction',
  theme_shadow_enabled:      '--shadow-enabled',
  theme_shadow_size:         '--shadow-size',
  theme_animation_enabled:   '--animation-enabled',
  header_text_color:         '--header-text-color',
  header_cta_button_color:   '--header-cta-button-color',
  footer_text_color:         '--footer-text-color',
};

/* Default fallbacks so the page never breaks */
const DEFAULTS = {
  theme_primary_color:       '#8a2be2',
  theme_secondary_color:     '#0f172a',
  theme_accent_color:        '#b84cff',
  theme_background_color:    '#f3f6fb',
  theme_text_color:          '#111827',
  theme_font_family:         'Inter, Arial, sans-serif',
  theme_border_radius:       '10px',
  theme_font_weight:         '400',
  theme_letter_spacing:      '0',
  theme_font_size_base:      '14px',
  theme_line_height:         '1.5',
  theme_gradient_enabled:    'false',
  theme_gradient_direction:  '135deg',
  theme_shadow_enabled:      'true',
  theme_shadow_size:         'md',
  theme_animation_enabled:   'true',
  theme_dark_mode:           'false',
  branding_site_name:        'PRMS',
  branding_company_name:     'Customizable Property Rental Management System',
  branding_logo_url:         '',
  branding_favicon_url:      '',
  branding_footer_text:      'Customizable Property Rental Management System',
  branding_support_email:    'support@prms.com',
  branding_support_phone:    '',
  header_background_color:   '#0f172a',
  header_text_color:         '#ffffff',
  header_alignment:          'center',
  header_show_logo:          'true',
  header_show_search:        'true',
  header_show_notifications: 'true',
  header_cta_button_text:    '',
  header_cta_button_color:   '#8a2be2',
  footer_background_color:   '#0f172a',
  footer_text_color:         '#94a3b8',
  footer_company_email:      'info@prms.com',
  footer_company_phone:      '',
  footer_company_address:    '',
  footer_copyright_text:     '2026 Customizable Property Rental Management System. All rights reserved.',
  homepage_hero_title:       'Find Your Perfect Rental Property',
  homepage_hero_subtitle:    'Discover top-quality rental properties tailored to your lifestyle and budget',
  homepage_hero_image:       'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop',
  homepage_hero_button_text: 'Browse Properties',
  homepage_hero_button_link: '/properties',
  homepage_hero_text_alignment: 'left',
  homepage_hero_background_color: '',
  homepage_about_title:      'About Us',
  homepage_about_description: 'We are dedicated to making property rental simple, transparent, and efficient for everyone.',
  homepage_about_image:      '',
  homepage_about_alignment:  'left',
  homepage_show_hero:        'true',
  homepage_show_search_bar:  'true',
  homepage_show_featured:    'true',
  homepage_show_features:    'true',
  homepage_show_testimonials:'true',
  homepage_show_cta:         'true',
  homepage_show_about:       'true',
  feature_payments:          'true',
  feature_maintenance:       'true',
  feature_messaging:         'true',
  feature_notifications:     'true',
  feature_analytics:         'true',
  feature_recommendations:   'true',
  feature_maps:              'true',
  general_currency:          'MYR',
  general_timezone:          'Asia/Kuala_Lumpur',
  general_language:          'en',
  general_contact_email:     'info@prms.com',
};

export function SettingsProvider({ children }) {
  const [settingsObj, setSettingsObj] = useState(DEFAULTS);
  const [settingsRaw, setSettingsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeConfigs, setThemeConfigs] = useState(null); // { light, dark } from the published theme, or null
  const [themeMode, setThemeMode] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const [currentThemeId, setCurrentThemeId] = useState(null);

  /* Track the data-theme attribute the ThemeSwitcher sets on <html>, so the
     correct light/dark variant of any saved custom theme gets re-applied
     whenever the user toggles light/dark mode. */
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeMode(html.getAttribute('data-theme') || 'light');
    });
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  /* Merge the flat settings with whichever light/dark variant is active.
     theme_background_color / theme_text_color are excluded from the flat
     settingsObj fallback in dark mode: settingsObj's defaults for these two
     are light-oriented (e.g. a near-white background), and without a real
     dark-specific override they were getting force-applied as an inline
     style on <body> — the highest-specificity style there is — pinning the
     whole app to a light body background/text color while every
     theme-variable-driven color underneath correctly went dark. Omitting
     them here lets applyCssVariables fall through to the theme-aware CSS
     (body { background: var(--page-bg) }) instead. */
  const resolvedTheme = useMemo(() => {
    const themeConfig = themeConfigs ? (themeMode === 'dark' ? themeConfigs.dark : themeConfigs.light) : null;
    const merged = { ...settingsObj, ...(themeConfig || {}) };
    if (themeMode === 'dark') {
      if (!themeConfig?.theme_background_color) delete merged.theme_background_color;
      if (!themeConfig?.theme_text_color) delete merged.theme_text_color;
    }
    return merged;
  }, [settingsObj, themeConfigs, themeMode]);

  /* Convert flat key-value object to CSS variables applied to <html> */
  const applyCssVariables = useCallback((settings) => {
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(THEME_VARIABLE_MAP)) {
      const val = settings[key];
      if (val) {
        root.style.setProperty(cssVar, val);
      } else {
        // Clear a stale value from an earlier call (e.g. set for light mode,
        // then this key is absent after switching to dark) — otherwise it
        // stays pinned as an inline style on <html>, beating every
        // theme-aware CSS default regardless of the active theme.
        root.style.removeProperty(cssVar);
      }
    }

    /* Apply font settings to body */
    if (settings.theme_font_family) {
      document.body.style.fontFamily = settings.theme_font_family;
    }
    if (settings.theme_font_weight) {
      document.body.style.fontWeight = settings.theme_font_weight;
    }
    if (settings.theme_letter_spacing) {
      document.body.style.letterSpacing = settings.theme_letter_spacing;
    }
    if (settings.theme_font_size_base) {
      document.body.style.fontSize = settings.theme_font_size_base;
    }
    if (settings.theme_line_height) {
      document.body.style.lineHeight = settings.theme_line_height;
    }

    /* Apply background color to body. Cleared (not just skipped) when
       absent — e.g. switching to dark mode with no dark-specific override —
       otherwise a value written for light mode stays stuck as an inline
       style, which beats the theme-aware CSS (body { background:
       var(--page-bg) }) regardless of what data-theme says. */
    if (settings.theme_background_color) {
      document.body.style.background = settings.theme_background_color;
    } else {
      document.body.style.removeProperty('background');
    }

    /* Apply text color */
    if (settings.theme_text_color) {
      document.body.style.color = settings.theme_text_color;
    } else {
      document.body.style.removeProperty('color');
    }

    /* Apply gradient when enabled */
    if (String(settings.theme_gradient_enabled) === 'true') {
      document.body.style.background = `linear-gradient(${settings.theme_gradient_direction || '135deg'}, ${settings.theme_primary_color || '#8a2be2'}, ${settings.theme_secondary_color || '#0f172a'})`;
    }

    /* Update favicon if configured */
    if (settings.branding_favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = settings.branding_favicon_url;
    }

    /* Update site title if configured */
    if (settings.branding_site_name) {
      document.title = settings.branding_site_name;
    }
  }, []);

  /* Load settings from API */
  const loadSettings = useCallback(async (target = 'public') => {
    try {
      setLoading(true);
      setError(null);

      const apiCall = target === 'public'
        ? adminApi.getPublicSettings()
        : adminApi.getSettings();

      const response = await apiCall;
      const data = response.data?.data || [];

      /* Build flat key-value object */
      const flat = { ...DEFAULTS };
      for (const item of data) {
        flat[item.key] = item.value;
      }

      setSettingsObj(flat);
      setSettingsRaw(data);

      // Fetch published theme (both light and dark variants — which one
      // actually applies is resolved reactively based on the current
      // data-theme attribute, see the `resolvedTheme` memo above)
      try {
        const themeResp = await adminApi.getTheme();
        if (themeResp?.data?.data) {
          setCurrentThemeId(themeResp.data.data.id);
          const latestVersion = themeResp.data.data.versions?.[0];
          if (latestVersion) {
            setThemeConfigs({
              light: latestVersion.lightConfig || {},
              dark: latestVersion.darkConfig || {},
            });
          }
        }
      } catch (e) {
        // Theme fetch failed — continue with flat settings only
      }
    } catch (err) {
      setError(err.message || 'Failed to load settings');
      /* Still apply defaults */
      setSettingsObj(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Update a single setting (live preview mode) */
  const updateSetting = useCallback(async (key, value) => {
    /* Capture current state before updating so revert works correctly */
    const previousValue = settingsObj[key];

    /* Skip if key is falsy or value is not a valid string */
    if (!key || value === undefined || value === null) return;

    const updated = { ...settingsObj, [key]: value };
    setSettingsObj(updated);

    /* Optimistic update in raw data */
    setSettingsRaw(prev => prev.map(s => s.key === key ? { ...s, value } : s));

    /* Persist to backend */
    try {
      await adminApi.updateSetting({ key: String(key), value: String(value) });
    } catch (err) {
      /* Revert only the failed key — use functional setState to avoid stale closure */
      setSettingsObj(prev => ({
        ...prev,
        [key]: prev[key] === value ? previousValue : prev[key]
      }));
      /* Use functional setState to merge with the latest state, not a captured snapshot */
      setSettingsRaw(prev => prev.map(s => s.key === key ? { ...s, value: previousValue } : s));
      setError('Failed to save setting: ' + err.message);
    }
  }, [settingsObj]);

  /* Batch update multiple settings */
  const bulkUpdateSettings = useCallback(async (settingsArray) => {
    try {
      await adminApi.bulkUpdateSettings(settingsArray);
      const updated = { ...settingsObj };
      for (const { key, value } of settingsArray) {
        updated[key] = value;
      }
      setSettingsObj(updated);
    } catch (err) {
      setError('Failed to bulk update settings: ' + err.message);
    }
  }, [settingsObj]);

  /* Apply the resolved (theme-mode-aware) settings as CSS variables whenever
     the settings, the published theme, or the light/dark toggle changes */
  useEffect(() => {
    applyCssVariables(resolvedTheme);
  }, [resolvedTheme, applyCssVariables]);

  /* Load settings on mount */
  useEffect(() => {
    loadSettings('public');
  }, [loadSettings]);

  const value = useMemo(() => ({
    settings: settingsObj,
    settingsRaw,
    loading,
    error,
    updateSetting,
    bulkUpdateSettings,
    loadSettings,
    get: (key, fallback = '') => resolvedTheme[key] ?? settingsObj[key] ?? fallback,
    getBool: (key, fallback = false) => {
      const val = settingsObj[key];
      if (val === undefined) return fallback;
      return String(val).toLowerCase() === 'true';
    },
    logoUrl: settingsObj.branding_logo_url ? getImageUrl(settingsObj.branding_logo_url) : '',
  }), [settingsObj, settingsRaw, loading, error, resolvedTheme, currentThemeId, updateSetting, bulkUpdateSettings, loadSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
