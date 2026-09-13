import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { CustomizerService } from './service_customizer';
import { validateHex } from './dto';

const service = new CustomizerService();

export class CustomizerController {
  getConfig = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.getConfig(req.user?.id);
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  updateConfig = async (req: AuthRequest, res: Response) => {
    try {
      const payload: Record<string, string | null> = {};
      const errors: string[] = [];

      if ('company_name' in req.body && req.body.company_name) {
        payload.company_name = req.body.company_name;
      }

      if ('active_theme' in req.body) {
        if (req.body.active_theme !== 'light' && req.body.active_theme !== 'dark') {
          errors.push('active_theme must be "light" or "dark"');
        } else {
          payload.active_theme = req.body.active_theme;
        }
      }

      const colorFields = [
        'light_header_bg', 'light_sidebar_bg', 'light_body_bg', 'light_footer_bg', 'light_accent_color', 'light_card_bg',
        'dark_header_bg', 'dark_sidebar_bg', 'dark_body_bg', 'dark_footer_bg', 'dark_accent_color', 'dark_card_bg',
      ];
      for (const field of colorFields) {
        if (field in req.body) {
          const err = validateHex(req.body[field]);
          if (err) errors.push(`${field}: ${err}`);
          else payload[field] = req.body[field];
        }
      }

      if (errors.length) {
        return res.status(400).json({ success: false, errors });
      }

      const config = await service.updateConfig(req.user!.id, payload);
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  uploadLogo = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      const config = await service.uploadLogo(
        req.user!.id,
        (req.file as Express.Multer.File).buffer,
        (req.file as Express.Multer.File).originalname,
      );
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  removeLogo = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.removeLogo(req.user!.id);
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  getPreview = async (req: AuthRequest, res: Response) => {
    try {
      const config = await service.getConfig(req.user?.id);
      const theme = config.active_theme === 'dark' ? 'dark' : 'light';
      const headerBg = theme === 'dark' ? config.dark_header_bg : config.light_header_bg;
      const bodyBg = theme === 'dark' ? config.dark_body_bg : config.light_body_bg;
      const footerBg = theme === 'dark' ? config.dark_footer_bg : config.light_footer_bg;
      const accent = theme === 'dark' ? config.dark_accent_color : config.light_accent_color;

      const logoHtml = config.logo_url
        ? `<img src="${config.logo_url}" alt="logo" style="max-height:40px;object-fit:contain;" />`
        : '';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.company_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; flex-direction: column; min-height: 100vh;
      background: ${bodyBg};
      color: ${theme === 'dark' ? '#E2E8F0' : '#111827'};
    }
    header {
      background: ${headerBg}; padding: 16px 24px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .brand { font-weight: 700; font-size: 1.25rem; color: ${accent}; }
    main {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 48px 24px;
    }
    .preview-content { text-align: center; max-width: 600px; }
    .preview-content h1 { font-size: 2rem; color: ${accent}; margin-bottom: 0.5em; }
    .preview-content p {
      color: ${theme === 'dark' ? '#94A3B8' : '#6B7280'}; line-height: 1.6;
    }
    footer {
      background: ${footerBg}; padding: 16px 24px; text-align: center;
      font-size: 0.85rem;
      color: ${theme === 'dark' ? '#64748B' : '#9CA3AF'};
    }
  </style>
</head>
<body>
  <header>${logoHtml}<span class="brand">${config.company_name}</span></header>
  <main><div class="preview-content">
    <h1>${config.company_name}</h1>
    <p>Property Rental Management System</p>
  </div></main>
  <footer>&copy; ${new Date().getFullYear()} ${config.company_name}. All rights reserved.</footer>
</body></html>`;

      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}
