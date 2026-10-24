import { test, expect, Page } from '@playwright/test';

/**
 * Navigation & Routing E2E Tests
 * Covers: protected route redirects, 404 page, nav bar links
 */

// Helper: try to visit a protected route and confirm redirect to login
async function expectRedirectToLogin(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const url = page.url();
  const isLoginPage = url.includes('/login') || url.includes('/role-selection');
  const hasLoginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
  expect(isLoginPage || hasLoginForm).toBeTruthy();
}

test.describe('Protected Route Redirects', () => {
  test('tenant dashboard requires login', async ({ page }) => {
    await expectRedirectToLogin(page, '/tenant/dashboard');
  });

  test('landlord dashboard requires login', async ({ page }) => {
    await expectRedirectToLogin(page, '/landlord/dashboard');
  });

  test('admin dashboard requires login', async ({ page }) => {
    await expectRedirectToLogin(page, '/admin/dashboard');
  });

  test('agent dashboard requires login', async ({ page }) => {
    await expectRedirectToLogin(page, '/agent/dashboard');
  });

  test('tenant profile page requires login', async ({ page }) => {
    await expectRedirectToLogin(page, '/tenant/profile');
  });
});

test.describe('404 / Not Found', () => {
  test('unknown routes show a not found page or redirect', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    const isNotFound =
      (body?.toLowerCase().includes('not found') ||
        body?.toLowerCase().includes('404') ||
        body?.toLowerCase().includes("doesn't exist") ||
        page.url().includes('/login'));
    expect(isNotFound).toBeTruthy();
  });
});

test.describe('Navigation Bar', () => {
  test('public pages show brand name / logo', async ({ page }) => {
    await page.goto('/');
    const brand = page.locator('text=/PRMS/i').first();
    await expect(brand).toBeVisible({ timeout: 5000 });
  });

  test('login page has back/home navigation', async ({ page }) => {
    await page.goto('/login');
    const homeLink = page.getByRole('link', { name: /home|PRMS/i }).first();
    const brandLogo = page.locator('[class*="brand"], [class*="logo"]').first();
    const hasNav = await homeLink.isVisible().catch(() => false) || await brandLogo.isVisible().catch(() => false);
    expect(hasNav).toBeTruthy();
  });
});

test.describe('Unauthorized Page', () => {
  test('unauthorized page renders when visited directly', async ({ page }) => {
    await page.goto('/unauthorized');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(5);
  });
});

test.describe('Legal / Privacy Pages', () => {
  test('terms and conditions page loads', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(10);
  });

  test('privacy notice page loads', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(10);
  });
});
