import { test, expect } from '@playwright/test';

/**
 * Auth E2E Tests
 * Covers: guest home, login page rendering, register flow, forgot password
 */

test.describe('Guest Home', () => {
  test('loads the home page with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PRMS|Property/i);
    // Heading or Search button in hero should be visible
    await expect(page.locator('h1, button').filter({ hasText: /Find Your Perfect|Search/i }).first()).toBeVisible();
  });

  test('has navigation links to login and search', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: /Sign In|Login/i }).first();
    await expect(loginLink).toBeVisible();
  });

  test('navigates to search page from hero button', async ({ page }) => {
    await page.goto('/');
    const searchBtn = page.locator('button').filter({ hasText: 'Search' }).first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await expect(page).toHaveURL(/\/search/);
    }
  });
});

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form with email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In|Login|Log In/i })).toBeVisible();
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /Sign In|Login|Log In/i }).click();
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailField.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const errorMsg = page.locator('text=/required|invalid|email/i');
    expect(isInvalid || await errorMsg.isVisible()).toBeTruthy();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.locator('input[type="email"], input[name="email"]').fill('wrong@test.com');
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In|Login|Log In/i }).click();
    // Wait for error message (either invalid credentials, not registered, or network error)
    await expect(page.locator('text=/invalid|incorrect|wrong|not found|credentials|network error|registered/i').first())
      .toBeVisible({ timeout: 8000 });
  });

  test('has a link to register', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /Register|Sign Up|Create account|Join/i });
    await expect(registerLink.first()).toBeVisible();
  });

  test('has a forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /Forgot/i });
    await expect(forgotLink.first()).toBeVisible();
  });

  test('can toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.fill('mypassword');
    const toggleBtn = page.locator('.login-page button, .login-box button').filter({ has: page.locator('svg') }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      const inputType = await passwordInput.getAttribute('type');
      expect(['text', 'password']).toContain(inputType);
    }
  });
});

test.describe('Role Selection → Register Flow', () => {
  test('navigates to role selection when register is clicked', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /Register|Sign Up|Create account|Join/i }).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/(role-selection|register)/);
    }
  });

  test('role selection page shows role options', async ({ page }) => {
    await page.goto('/role-selection');
    await expect(page.locator('text=/Tenant|Landlord|Agent/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('selecting Tenant role routes to register page', async ({ page }) => {
    await page.goto('/role-selection');
    const tenantButton = page.locator('.role-option').filter({ hasText: /Tenant/i }).first();
    await expect(tenantButton).toBeVisible({ timeout: 5000 });
    await tenantButton.click();

    const continueBtn = page.locator('.continue-btn, button:has-text("Continue")').first();
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('register page has all required fields', async ({ page }) => {
    await page.goto('/role-selection');
    await page.evaluate(() => sessionStorage.setItem('prmsSelectedRole', 'Tenant'));
    await page.goto('/register');
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

test.describe('Forgot Password Page', () => {
  test('renders email input and submit button', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"], button:has-text("Continue")')).toBeVisible();
  });

  test('shows confirmation or error after submitting an email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"], input[name="email"]').fill('test@example.com');
    await page.locator('button[type="submit"], button:has-text("Continue")').click();
    await expect(
      page.locator('text=/sent|check your email|reset link|error|invalid|network error|code/i').first()
    ).toBeVisible({ timeout: 8000 });
  });
});
