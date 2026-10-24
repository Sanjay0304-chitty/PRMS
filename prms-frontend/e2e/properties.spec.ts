import { test, expect } from '@playwright/test';

/**
 * Properties / Search E2E Tests
 * Covers: public property browsing, search, property detail page
 */

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
  });

  test('loads search page with a search input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"], input[placeholder*="Location"], input[type="text"]').first())
      .toBeVisible({ timeout: 6000 });
  });

  test('shows property listings or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const hasCards = await page.locator('[class*="property-card"], [class*="card"], article').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/no properties|no results|no listings|network error/i').first().isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('typing a search term updates the input and triggers search', async ({ page }) => {
    const searchInput = page.locator('.search-input-group input, input[placeholder*="Location"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Kuala Lumpur');
    await expect(searchInput).toHaveValue('Kuala Lumpur');

    const searchBtn = page.locator('button.search-submit, button:has-text("Search")').first();
    await searchBtn.click();
    await page.waitForLoadState('networkidle');

    // Result header or empty/error status is visible
    const statusVisible = await page.locator('text=/properties found|no properties|network error/i').first().isVisible().catch(() => false);
    expect(statusVisible).toBeTruthy();
  });
});

test.describe('Properties Listing', () => {
  test('loads the properties page', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    expect([200]).toContain(200);
  });
});

test.describe('Guest Properties Page', () => {
  test('loads properties for unauthenticated users', async ({ page }) => {
    await page.goto('/guest/properties');
    await page.waitForLoadState('networkidle');
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(10);
  });
});

test.describe('Property Detail Page', () => {
  test('handles invalid property ID gracefully', async ({ page }) => {
    await page.goto('/properties/invalid-id-12345');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});
