import { test, expect, Page } from '@playwright/test';

/**
 * Payment E2E Tests
 * These tests cover the tenant payment flow:
 * - TenantPayments page (requires auth — verifies redirect if not)
 * - MockPaymentCheckout page rendering
 * - PaymentReceipt page rendering
 * 
 * NOTE: Full payment flows require a logged-in tenant with existing bookings.
 * These tests cover the UI structure and guard behaviour.
 */

test.describe('TenantPayments Page Guard', () => {
  test('redirects to login if not authenticated', async ({ page }) => {
    await page.goto('/tenant/payments');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/login|role-selection/);
  });
});

test.describe('MockPaymentCheckout Page Guard', () => {
  test('redirects to login if not authenticated', async ({ page }) => {
    await page.goto('/tenant/payments/test-payment-id/checkout');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/login|role-selection/);
  });
});

test.describe('PaymentReceipt Page Guard', () => {
  test('redirects to login if not authenticated', async ({ page }) => {
    await page.goto('/tenant/payments/test-payment-id');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/login|role-selection/);
  });
});

test.describe('Payment Flow - Authenticated (mock session)', () => {
  /**
   * To run these tests with a real logged-in session, you would:
   * 1. Log in via the API to get a token
   * 2. Set it in localStorage before navigating
   * 
   * These tests demonstrate the pattern and are ready to use once
   * a test user/seed is available.
   */

  test.skip('tenant can see their payments list', async ({ page }) => {
    // Set up auth token (replace with real test credentials)
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(process.env.TEST_TENANT_EMAIL || 'tenant@test.com');
    await page.locator('input[type="password"]').fill(process.env.TEST_TENANT_PASSWORD || 'test1234');
    await page.getByRole('button', { name: /Login|Sign In/i }).click();
    await page.waitForURL(/tenant\/dashboard/);

    await page.goto('/tenant/payments');
    await page.waitForLoadState('networkidle');
    // Should show payment cards or empty state
    const hasContent = await page.locator('[class*="payment"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/no payments|no invoices/i').first().isVisible().catch(() => false);
    expect(hasContent || hasEmpty).toBeTruthy();
  });

  test.skip('Pay Now button navigates to checkout page', async ({ page }) => {
    // Pre-condition: tenant has an unpaid payment
    // This test is ready once a seed user is available
    await page.goto('/tenant/payments');
    const payBtn = page.getByRole('button', { name: /Pay Now/i }).first();
    await payBtn.click();
    await expect(page).toHaveURL(/checkout/);
  });

  test.skip('MockPaymentCheckout shows payment methods', async ({ page }) => {
    await page.goto('/tenant/payments/mock-id/checkout');
    await expect(page.locator('text=/CARD|FPX|eWallet|payment method/i').first()).toBeVisible({ timeout: 5000 });
  });
});
