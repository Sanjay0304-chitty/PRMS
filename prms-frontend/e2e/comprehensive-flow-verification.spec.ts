import { test, expect } from '@playwright/test';

test.describe('Exhaustive Real User Flow & Button Verification', () => {

  test('Guest Flow: buttons, property browsing, and role navigation work without error', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/PRMS/i);

    // 2. Browse Properties
    await page.goto('/properties');
    await page.waitForTimeout(1000);
    expect(pageErrors).toHaveLength(0);

    // 3. Search page
    await page.goto('/search');
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Kuala Lumpur');
    }
    await page.waitForTimeout(500);
    expect(pageErrors).toHaveLength(0);

    // 4. Role Selection page & click role option then Continue
    await page.goto('/role-selection');
    await expect(page.locator('text=Who are you?')).toBeVisible();
    
    // Select Tenant role option
    const tenantOption = page.locator('.role-option').filter({ hasText: /Tenant/i }).first();
    await tenantOption.click();
    await page.waitForTimeout(300);

    // Click Continue button
    const continueBtn = page.locator('button.continue-btn');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();
    await page.waitForURL(/\/register/);
    expect(page.url()).toContain('/register');
    expect(pageErrors).toHaveLength(0);

    // 5. Terms & Privacy
    await page.goto('/terms');
    await page.waitForTimeout(500);
    await page.goto('/privacy');
    await page.waitForTimeout(500);
    expect(pageErrors).toHaveLength(0);
  });

  test('Admin Flow: login, all admin dashboard tabs, and buttons work with zero errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@prms.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for Admin Dashboard
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    expect(pageErrors).toHaveLength(0);

    // Visit core admin routes
    const adminRoutes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/properties',
      '/admin/audit-logs',
      '/admin/reports',
      '/admin/categories',
      '/admin/settings'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      expect(pageErrors).toHaveLength(0);
    }
  });

  test('Admin Property Edit Flow: edit seeded property, save changes, and ensure no blank screen', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Login as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@prms.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Navigate to properties
    await page.goto('/admin/properties');
    await page.waitForTimeout(1000);
    expect(pageErrors).toHaveLength(0);

    // Verify property list container is rendered and not blank
    const content = page.locator('.admin-layout-content');
    await expect(content).toBeVisible();
    const text = await content.textContent();
    expect(text?.trim().length).toBeGreaterThan(20);

    // Navigate to edit prop-002
    await page.goto('/admin/properties/edit/prop-002');
    await page.waitForTimeout(1000);
    expect(pageErrors).toHaveLength(0);

    // Verify edit page elements
    await expect(page.locator('text=Edit Property')).toBeVisible();
    await expect(page.locator('text=Rent (RM)')).toBeVisible();

    // Verify no occurrences of literal MYR in the page text
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('MYR');

    // Modify rent
    const rentInput = page.locator('#editRent');
    await expect(rentInput).toBeVisible();
    await rentInput.fill('2200');

    // Click Save Changes
    const saveBtn = page.locator('button:has-text("Save Changes")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify success toast
    await expect(page.locator('text=Property updated successfully!')).toBeVisible({ timeout: 6000 });
    expect(pageErrors).toHaveLength(0);

    // Navigate between tabs to confirm no blank screen
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(800);
    const dashboardText = await page.locator('.admin-layout-content').textContent();
    expect(dashboardText?.trim().length).toBeGreaterThan(20);

    await page.goto('/admin/properties');
    await page.waitForTimeout(800);
    const propertiesText = await page.locator('.admin-layout-content').textContent();
    expect(propertiesText?.trim().length).toBeGreaterThan(20);

    expect(pageErrors).toHaveLength(0);
  });

  test('Landlord Flow: login, landlord dashboard tabs, and buttons work with zero errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'landlord@prms.com');
    await page.fill('input[type="password"]', 'Landlord123!');
    await page.click('button[type="submit"]');

    // Wait for Landlord Dashboard
    await page.waitForURL(/\/landlord/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    expect(pageErrors).toHaveLength(0);

    // Visit core landlord routes
    const landlordRoutes = [
      '/landlord/dashboard',
      '/landlord/properties',
      '/landlord/bookings',
      '/landlord/maintenance',
      '/landlord/agents'
    ];

    for (const route of landlordRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      expect(pageErrors).toHaveLength(0);
    }
  });

  test('Tenant Flow: login, tenant dashboard tabs, payments, and buttons work with zero errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tenant@prms.com');
    await page.fill('input[type="password"]', 'Tenant123!');
    await page.click('button[type="submit"]');

    // Wait for Tenant Dashboard
    await page.waitForURL(/\/tenant/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    expect(pageErrors).toHaveLength(0);

    // Visit core tenant routes
    const tenantRoutes = [
      '/tenant/dashboard',
      '/tenant/payments',
      '/tenant/bookings',
      '/tenant/maintenance',
      '/profile'
    ];

    for (const route of tenantRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      expect(pageErrors).toHaveLength(0);
    }
  });

});
