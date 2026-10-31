import { test, expect } from '@playwright/test';

const PAGES = ['/', '/login', '/role-selection', '/terms', '/privacy'];

test.describe('Layer 7: Accessibility (a11y) WCAG 2.1 AA Audit', () => {
  for (const path of PAGES) {
    test(`Accessibility compliance for route: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // 1. Check all images have alt attributes or aria-hidden
      const missingAltCount = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => !img.hasAttribute('alt') && img.getAttribute('aria-hidden') !== 'true').length;
      });
      expect(missingAltCount).toBe(0);

      // 2. Check form inputs have accessible labels or aria-labels
      const unlabeledInputsCount = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
        return inputs.filter(el => {
          const id = el.getAttribute('id');
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
          const hasPlaceholder = el.getAttribute('placeholder');
          const isWrappedInLabel = el.closest('label');
          return !hasLabel && !hasAriaLabel && !hasPlaceholder && !isWrappedInLabel;
        }).length;
      });
      expect(unlabeledInputsCount).toBe(0);

      // 3. Check all buttons have non-empty accessible text or aria-label
      const emptyButtonsCount = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.filter(btn => {
          const text = btn.innerText?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const title = btn.getAttribute('title') || '';
          const hasSvg = btn.querySelector('svg');
          return !text && !ariaLabel && !title && !hasSvg;
        }).length;
      });
      expect(emptyButtonsCount).toBe(0);

      // 4. Ensure document has valid lang attribute
      const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
      expect(lang).toBeTruthy();
    });
  }
});
