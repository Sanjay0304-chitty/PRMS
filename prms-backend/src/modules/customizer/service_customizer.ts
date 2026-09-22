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
   * The administrator's customizer is the system default. Guests and users
   * who have not saved personal preferences yet see this configuration.
   */
  private async getAdminConfig() {
    return (prisma as any).websiteCustomizer.findFirst({
      where: {
        user: {
          UserRole: { some: { role: { name: 'Admin' } } },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getConfig(userId?: string, inheritAdminBranding = false) {
    if (userId) {
      const personalConfig = await (prisma as any).websiteCustomizer.findUnique({
        where: { userId },
      });
      if (personalConfig) {
        if (!inheritAdminBranding) return personalConfig;

        const adminConfig = await this.getAdminConfig();
        return {
          ...personalConfig,
          company_name: adminConfig?.company_name ?? DEFAULT_CONFIG.company_name,
          logo_url: adminConfig?.logo_url ?? DEFAULT_CONFIG.logo_url,
          logo_thumb_url: adminConfig?.logo_thumb_url ?? DEFAULT_CONFIG.logo_thumb_url,
        };
      }
    }

    return (await this.getAdminConfig()) ?? { ...DEFAULT_CONFIG };
  }

  /**
   * Save an independent config for the current account. On the first save,
   * begin with the administrator's defaults so unspecified fields are kept.
   */
  async updateConfig(userId: string, data: Record<string, string | null>) {
    const inheritedConfig = (await this.getAdminConfig()) ?? DEFAULT_CONFIG;
    const baseConfig = Object.fromEntries(
      Object.keys(DEFAULT_CONFIG).map((key) => [key, inheritedConfig[key] ?? DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG]]),
    );

    return (prisma as any).websiteCustomizer.upsert({
      where: { userId },
      update: data,
      create: { ...baseConfig, ...data, userId },
    });
  }

  async uploadLogo(userId: string, buffer: Buffer, originalname: string) {
    // Only delete files owned by this account. A first-time landlord may be
    // viewing the inherited admin logo, which must never be deleted here.
    const config = await (prisma as any).websiteCustomizer.findUnique({
      where: { userId },
    });

    // Delete old files
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config?.logo_url?.includes(userId) ? config.logo_url : null);
    safeDel(config?.logo_thumb_url?.includes(userId) ? config.logo_thumb_url : null);

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
    const config = await (prisma as any).websiteCustomizer.findUnique({
      where: { userId },
    });
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config?.logo_url?.includes(userId) ? config.logo_url : null);
    safeDel(config?.logo_thumb_url?.includes(userId) ? config.logo_thumb_url : null);
    return this.updateConfig(userId, {
      logo_url: null,
      logo_thumb_url: null,
    });
  }

  /** Remove only this account's override; the next read inherits defaults. */
  async resetConfig(userId: string) {
    const config = await (prisma as any).websiteCustomizer.findUnique({
      where: { userId },
    });
    if (!config) return;

    const safeDel = (url: string | null) => {
      if (url) {
        const filename = path.basename(url);
        if (!filename.includes(userId)) return;
        const p = path.join(LOGOS_DIR, filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config.logo_url);
    safeDel(config.logo_thumb_url);

    await (prisma as any).websiteCustomizer.delete({ where: { userId } });
  }
}
