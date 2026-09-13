import { prisma } from './db';

const seedSettings = [
  // === THEME ===
  { key: 'theme_primary_color', value: '#8a2be2', category: 'theme', description: 'Primary brand color used for buttons, links, and accents' },
  { key: 'theme_secondary_color', value: '#0f172a', category: 'theme', description: 'Secondary color used for headers, sidebars, and dark surfaces' },
  { key: 'theme_background_color', value: '#f3f6fb', category: 'theme', description: 'Default page background color' },
  { key: 'theme_text_color', value: '#111827', category: 'theme', description: 'Default text color for body content' },
  { key: 'theme_font_family', value: 'Inter, Arial, sans-serif', category: 'theme', description: 'Default font family for the application' },
  { key: 'theme_font_weight', value: '400', category: 'theme', description: 'Default font weight (300, 400, 500, 600, 700)' },
  { key: 'theme_letter_spacing', value: '0', category: 'theme', description: 'Default letter spacing (e.g. 0, 0.025em, -0.05em)' },
  { key: 'theme_font_size_base', value: '14px', category: 'theme', description: 'Base font size for body text' },
  { key: 'theme_line_height', value: '1.5', category: 'theme', description: 'Default line height multiplier' },
  { key: 'theme_border_radius', value: '10px', category: 'theme', description: 'Default border radius for cards and inputs' },
  { key: 'theme_dark_mode', value: 'false', category: 'theme', description: 'Enable dark mode toggle globally' },
  { key: 'theme_gradient_enabled', value: 'false', category: 'theme', description: 'Apply gradient using primary + secondary colors on hero' },
  { key: 'theme_gradient_direction', value: '135deg', category: 'theme', description: 'Gradient direction (to right, to bottom, 135deg, etc.)' },
  { key: 'theme_shadow_enabled', value: 'true', category: 'theme', description: 'Apply subtle shadows to cards and containers' },
  { key: 'theme_shadow_size', value: 'md', category: 'theme', description: 'Shadow depth: none, sm, md, lg, xl' },
  { key: 'theme_animation_enabled', value: 'true', category: 'theme', description: 'Enable page transitions and animations' },

  // === BRANDING ===
  { key: 'branding_site_name', value: 'PRMS', category: 'branding', description: 'Display name shown in browser title and headers' },
  { key: 'branding_company_name', value: 'Customizable Property Rental Management System', category: 'branding', description: 'Full company name shown in footer and about sections' },
  { key: 'branding_logo_url', value: '', category: 'branding', description: 'URL of the website logo image' },
  { key: 'branding_favicon_url', value: '', category: 'branding', description: 'URL of the favicon' },
  { key: 'branding_footer_text', value: 'Customizable Property Rental Management System', category: 'branding', description: 'Text displayed in the website footer' },
  { key: 'branding_support_email', value: 'support@prms.com', category: 'branding', description: 'Support email shown in contact sections' },
  { key: 'branding_support_phone', value: '', category: 'branding', description: 'Support phone number' },

  // === GENERAL ===
  { key: 'general_currency', value: 'MYR', category: 'general', description: 'Default currency code' },
  { key: 'general_timezone', value: 'Asia/Kuala_Lumpur', category: 'general', description: 'Default timezone' },
  { key: 'general_language', value: 'en', category: 'general', description: 'Default language code' },
  { key: 'general_contact_email', value: 'info@prms.com', category: 'general', description: 'General contact email' },

  // === HEADER ===
  { key: 'header_background_color', value: '#0f172a', category: 'header', description: 'Header navigation background color' },
  { key: 'header_text_color', value: '#ffffff', category: 'header', description: 'Header text and icon color' },
  { key: 'header_alignment', value: 'center', category: 'header', description: 'Header content alignment: left, center, right' },
  { key: 'header_show_logo', value: 'true', category: 'header', description: 'Show or hide logo in the header' },
  { key: 'header_show_search', value: 'true', category: 'header', description: 'Show or hide search bar in the header' },
  { key: 'header_show_notifications', value: 'true', category: 'header', description: 'Show or hide notification bell in the header' },
  { key: 'header_cta_button_text', value: '', category: 'header', description: 'Text of the header CTA button' },
  { key: 'header_cta_button_color', value: '#8a2be2', category: 'header', description: 'Color of the header CTA button' },

  // === FOOTER ===
  { key: 'footer_background_color', value: '#0f172a', category: 'footer', description: 'Footer background color' },
  { key: 'footer_text_color', value: '#94a3b8', category: 'footer', description: 'Footer text color' },
  { key: 'footer_company_address', value: '', category: 'footer', description: 'Company address displayed in footer' },
  { key: 'footer_company_phone', value: '', category: 'footer', description: 'Company phone in footer' },
  { key: 'footer_company_email', value: 'info@prms.com', category: 'footer', description: 'Company email in footer' },
  { key: 'footer_copyright_text', value: '2026 Customizable Property Rental Management System. All rights reserved.', category: 'footer', description: 'Copyright text in footer' },

  // === HOMEPAGE ===
  { key: 'homepage_hero_title', value: 'Find Your Perfect Rental Property', category: 'homepage', description: 'Main hero section title' },
  { key: 'homepage_hero_subtitle', value: 'Discover top-quality rental properties tailored to your lifestyle and budget', category: 'homepage', description: 'Hero section subtitle' },
  { key: 'homepage_hero_image', value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop', category: 'homepage', description: 'Hero section background image URL' },
  { key: 'homepage_hero_button_text', value: 'Browse Properties', category: 'homepage', description: 'Hero CTA button text' },
  { key: 'homepage_hero_button_link', value: '/properties', category: 'homepage', description: 'Hero CTA button link destination' },
  { key: 'homepage_hero_text_alignment', value: 'left', category: 'homepage', description: 'Hero text alignment: left, center, right' },
  { key: 'homepage_hero_background_color', value: '', category: 'homepage', description: 'Hero section background color override' },
  { key: 'homepage_about_title', value: 'About Us', category: 'homepage', description: 'About section heading' },
  { key: 'homepage_about_description', value: 'We are dedicated to making property rental simple, transparent, and efficient for everyone.', category: 'homepage', description: 'About section description text' },
  { key: 'homepage_about_image', value: '', category: 'homepage', description: 'About section image URL' },
  { key: 'homepage_about_alignment', value: 'left', category: 'homepage', description: 'About section content alignment' },

  // === HOMEPAGE SECTION VISIBILITY ===
  { key: 'homepage_show_hero', value: 'true', category: 'homepage', description: 'Show hero/banner section on homepage' },
  { key: 'homepage_show_search_bar', value: 'true', category: 'homepage', description: 'Show property search bar on homepage' },
  { key: 'homepage_show_featured', value: 'true', category: 'homepage', description: 'Show featured properties on homepage' },
  { key: 'homepage_show_features', value: 'true', category: 'homepage', description: 'Show features highlights on homepage' },
  { key: 'homepage_show_testimonials', value: 'true', category: 'homepage', description: 'Show testimonials on homepage' },
  { key: 'homepage_show_cta', value: 'true', category: 'homepage', description: 'Show call-to-action banner on homepage' },
  { key: 'homepage_show_about', value: 'true', category: 'homepage', description: 'Show about section on homepage' },

  // === FEATURES (Feature toggles) ===
  { key: 'feature_payments', value: 'true', category: 'features', description: 'Enable or disable payment module' },
  { key: 'feature_maintenance', value: 'true', category: 'features', description: 'Enable or disable maintenance module' },
  { key: 'feature_messaging', value: 'true', category: 'features', description: 'Enable or disable messaging module' },
  { key: 'feature_notifications', value: 'true', category: 'features', description: 'Enable or disable notifications module' },
  { key: 'feature_analytics', value: 'true', category: 'features', description: 'Enable or disable analytics module' },
  { key: 'feature_recommendations', value: 'true', category: 'features', description: 'Enable or disable recommendations module' },
  { key: 'feature_maps', value: 'true', category: 'features', description: 'Enable or disable maps integration' },
];

async function seed() {
  console.log('Seeding system_settings...');

  // Seed default theme if not exists
  const existingTheme = await prisma.theme.findFirst();
  if (!existingTheme) {
    const theme = await prisma.theme.create({
      data: {
        name: 'Default Theme',
        isPublished: true,
      },
    });

    // Read all existing SystemSetting values for theme-related keys
    const themeSettings = await prisma.systemSetting.findMany({
      where: { category: 'theme' },
    });
    const headerSettings = await prisma.systemSetting.findMany({
      where: { category: 'header' },
    });
    const footerSettings = await prisma.systemSetting.findMany({
      where: { category: 'footer' },
    });

    // Build initial configs from flat settings
    const lightConfig: Record<string, string> = {};
    const darkConfig: Record<string, string> = {};
    for (const s of [...themeSettings, ...headerSettings, ...footerSettings]) {
      lightConfig[s.key] = s.value;
      darkConfig[s.key] = s.value;
    }

    await prisma.themeVersion.create({
      data: {
        themeId: theme.id,
        version: 1,
        lightConfig,
        darkConfig,
      },
    });

    await prisma.themeDraft.create({
      data: {
        themeId: theme.id,
        lightConfig,
        darkConfig,
      },
    });

    console.log('Default theme created with version 1 and draft');
  }

  let count = 0;
  for (const s of seedSettings) {
    const existing = await prisma.systemSetting.findUnique({ where: { key: s.key } });
    if (existing) {
      await prisma.systemSetting.update({ where: { key: s.key }, data: { value: s.value, description: s.description, category: s.category } });
    } else {
      await prisma.systemSetting.create({ data: s });
      count++;
    }
  }
  console.log(`Done. ${count} new settings created, ${seedSettings.length - count} existing updated.`);
  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error('Seed error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
