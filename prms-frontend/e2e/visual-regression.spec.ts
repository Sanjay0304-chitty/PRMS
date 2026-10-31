import { test, expect } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'Mobile (375px)', width: 375, height: 667 },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1280px)', width: 1280, height: 800 },
];

const PAGES_TO_TEST = [
  { route: '/', name: 'Landing Page' },
  { route: '/login', name: 'Login Page' },
  { route: '/role-selection', name: 'Role Selection Page' },
  { route: '/terms', name: 'Terms Page' },
  { route: '/privacy', name: 'Privacy Notice Page' },
];

test.describe('Layer 5: Visual Regression & Responsive Layout Verification', () => {
  for (const bp of BREAKPOINTS) {
    for (const p of PAGES_TO_TEST) {
      test(`${bp.name} - ${p.name} responsive layout`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(p.route);
        await page.waitForLoadState('domcontentloaded');

        // 1. Check for horizontal overflow (no horizontal scrollbar)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

        // 2. Ensure page rendered with height
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        expect(bodyHeight).toBeGreaterThan(100);
      });
    }
  }
});
