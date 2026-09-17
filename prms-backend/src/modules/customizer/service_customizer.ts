import { prisma } from '../../db';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const LOGOS_DIR = path.join(__dirname, '..', '..', '..', 'public', 'images');
fs.mkdirSync(LOGOS_DIR, { recursive: true });

// Matches the app's actual built-in navy/purple branding (styles.css's
// :root tokens: --header-background-color/--footer-background-color
// #0f172a, --primary-color #8a2be2), not an arbitrary theme - an account
// that never opens the customizer should look exactly like it always did.
const DEFAULT_CONFIG = {
  company_name: 'PRMS',
  logo_url: null as string | null,
  logo_thumb_url: null as string | null,
  light_header_bg: '#0f172a',
  light_sidebar_bg: '#0f172a',
  light_body_bg: '#f3f6fb',
  light_footer_bg: '#0f172a',
  light_accent_color: '#8a2be2',
  light_card_bg: '#ffffff',
  dark_header_bg: '#1f2937',
  dark_sidebar_bg: '#1f2937',
  dark_body_bg: '#111827',
  dark_footer_bg: '#030712',
  dark_accent_color: '#60a5fa',
  dark_card_bg: '#334155',
  active_theme: 'light',
};

export class CustomizerService {
  /**
   * Site-wide config: one single row serves every page, guest or logged-in.
   */
  async getConfig(_userId?: string) {
    let config = await (prisma as any).websiteCustomizer.findFirst({
      orderBy: { created_at: 'asc' },
    });
    if (!config) {
      config = await (prisma as any).websiteCustomizer.create({
        data: { ...DEFAULT_CONFIG },
      });
    }
    return config;
  }

  /**
   * Update the single site-wide config row.
   */
  async updateConfig(_userId: string, data: Record<string, string | null>) {
    let config = await (prisma as any).websiteCustomizer.findFirst({
      orderBy: { created_at: 'asc' },
    });
    if (config) {
      return (prisma as any).websiteCustomizer.update({
        where: { id: config.id },
        data,
      });
    }
    return (prisma as any).websiteCustomizer.create({
      data: { ...DEFAULT_CONFIG, ...data },
    });
  }

  async uploadLogo(userId: string, buffer: Buffer, originalname: string) {
    const config = await this.getConfig();

    // Delete old files
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config.logo_url);
    safeDel(config.logo_thumb_url);

    const ext = path.extname(originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) ? ext : '.png';
    const filename = `logo-${userId}-${Date.now()}${safeExt}`;
    const thumbName = `logo-thumb-${userId}-${Date.now()}.webp`;
    const filePath = path.join(LOGOS_DIR, filename);
    const thumbPath = path.join(LOGOS_DIR, thumbName);

    fs.writeFileSync(filePath, buffer);

    let thumbUrl: string | null = `/images/${filename}`;
    try {
      await sharp(filePath)
        .resize(128, 128, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toFile(thumbPath);
      thumbUrl = `/images/${thumbName}`;
    } catch { /* fallback to original */ }

    return this.updateConfig(userId, {
      logo_url: `/images/${filename}`,
      logo_thumb_url: thumbUrl,
    });
  }

  async removeLogo(userId: string) {
    const config = await this.getConfig();
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config.logo_url);
    safeDel(config.logo_thumb_url);
    return this.updateConfig(userId, {
      logo_url: null,
      logo_thumb_url: null,
    });
  }
}
